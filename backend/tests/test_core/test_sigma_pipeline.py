"""pySigma 변환 엔진(SigmaPipelineManager) 단위 테스트"""
import json
import pytest
from unittest.mock import patch

from app.core.sigma_pipeline import SigmaPipelineManager, SigmaConversionResult


@pytest.fixture(autouse=True)
def reset_singleton():
    """각 테스트마다 싱글톤 초기화"""
    SigmaPipelineManager._instance = None
    SigmaPipelineManager._backend = None
    SigmaPipelineManager._pipeline = None
    yield
    SigmaPipelineManager._instance = None
    SigmaPipelineManager._backend = None
    SigmaPipelineManager._pipeline = None


BASIC_RULE = """
title: Test Basic
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine: whoami
    condition: selection
level: high
"""

CONTAINS_RULE = """
title: Test Contains
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: powershell -enc
    condition: selection
level: high
"""

STARTSWITH_RULE = """
title: Test Startswith
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|startswith: C:\\Windows\\Temp
    condition: selection
level: medium
"""

ENDSWITH_RULE = """
title: Test Endswith
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: .exe
    condition: selection
level: low
"""

REGEX_RULE = """
title: Test Regex
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|re: .*powershell.*-e(nc|ncodedcommand).*
    condition: selection
level: high
"""

OR_CONDITION_RULE = """
title: Test Or
logsource:
    category: process_creation
    product: windows
detection:
    sel1:
        CommandLine|contains: whoami
    sel2:
        CommandLine|contains: ipconfig
    condition: sel1 or sel2
level: low
"""

NOT_CONDITION_RULE = """
title: Test Not
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: cmd.exe
    filter:
        User: SYSTEM
    condition: selection and not filter
level: medium
"""


class TestSigmaPipelineConversion:
    """변환 성공 시나리오 테스트"""

    def test_convert_basic_sigma_rule(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(BASIC_RULE)

        assert result.status == "success"
        assert result.opensearch_query is not None
        assert "query" in result.opensearch_query
        query_str = json.dumps(result.opensearch_query)
        assert "process.command_line" in query_str

    def test_convert_contains_modifier(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(CONTAINS_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "process.command_line" in query_str
        assert "*" in query_str

    def test_convert_startswith_modifier(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(STARTSWITH_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "process.executable" in query_str

    def test_convert_endswith_modifier(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(ENDSWITH_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "process.executable" in query_str
        assert "*.exe" in query_str

    def test_convert_regex_modifier(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(REGEX_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "process.command_line" in query_str

    def test_convert_and_or_condition(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(OR_CONDITION_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "process.command_line" in query_str
        assert "whoami" in query_str.lower() or "ipconfig" in query_str.lower()

    def test_convert_not_condition(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(NOT_CONDITION_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "NOT" in query_str or "must_not" in query_str

    def test_convert_field_mapping(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(BASIC_RULE)

        assert result.status == "success"
        query_str = json.dumps(result.opensearch_query)
        assert "CommandLine" not in query_str
        assert "process.command_line" in query_str


class TestSigmaPipelineFailure:
    """변환 실패/에지 케이스 테스트"""

    def test_convert_failure_handling(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule("this is not valid sigma yaml at all: {{{{")

        assert result.status == "failed"
        assert result.opensearch_query is None
        assert result.error is not None
        assert len(result.error) > 0

    def test_convert_empty_detection(self):
        mgr = SigmaPipelineManager.get_instance()
        empty_rule = """
title: Empty Detection
logsource:
    category: test
detection:
    condition: selection
level: low
"""
        result = mgr.convert_rule(empty_rule)
        assert result.status == "failed"
        assert result.opensearch_query is None

    def test_error_message_sanitization(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule("invalid yaml content")

        assert result.status == "failed"
        if result.error:
            assert "/home/" not in result.error
            assert "/Users/" not in result.error
            assert len(result.error) <= 500


class TestSigmaPipelineAvailability:
    """pySigma 미설치/가용성 테스트"""

    def test_pysigma_not_installed(self):
        with patch.dict("sys.modules", {"sigma": None, "sigma.rule": None}):
            mgr = SigmaPipelineManager()
            mgr._backend = None
            result = mgr.convert_rule(BASIC_RULE)

            assert result.status == "pending"
            assert result.opensearch_query is None
            assert "not installed" in result.error.lower() or "not available" in result.error.lower()

    def test_is_available_when_installed(self):
        mgr = SigmaPipelineManager.get_instance()
        assert mgr.is_available() is True

    def test_is_available_when_not_installed(self):
        mgr = SigmaPipelineManager()
        mgr._backend = None
        assert mgr.is_available() is False


class TestSigmaConversionResultMetadata:
    """변환 결과 메타데이터 테스트"""

    def test_result_has_pipeline_id(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(BASIC_RULE)

        assert result.pipeline_id is not None
        assert result.pipeline_id == "default"

    def test_result_has_converted_at(self):
        mgr = SigmaPipelineManager.get_instance()
        result = mgr.convert_rule(BASIC_RULE)

        assert result.converted_at is not None
        assert "T" in result.converted_at
