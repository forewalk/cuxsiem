"""트리거 조건 평가기 테스트 — eval() 제거 후 AST 기반 안전 평가 검증"""
import pytest
from app.services.notification import NotificationService


@pytest.fixture
def service():
    return NotificationService()


@pytest.fixture
def sample_context():
    return {
        "total": 5,
        "hits": {
            "total": {"value": 42},
            "hits": [
                {"_source": {"host": "web-01"}},
                {"_source": {"host": "web-02"}},
            ]
        },
        "aggregations": {
            "threats": {
                "buckets": [
                    {"key": "malware", "doc_count": 10},
                    {"key": "phishing", "doc_count": 3},
                ]
            }
        },
    }


class TestTriggerConditionBasic:
    """기본 비교 연산"""

    def test_empty_condition_returns_true(self, service):
        assert service._evaluate_trigger_condition("", {}) is True
        assert service._evaluate_trigger_condition("  ", {}) is True
        assert service._evaluate_trigger_condition(None, {}) is True

    def test_simple_gt(self, service, sample_context):
        assert service._evaluate_trigger_condition("total > 0", sample_context) is True
        assert service._evaluate_trigger_condition("total > 100", sample_context) is False

    def test_simple_gte(self, service, sample_context):
        assert service._evaluate_trigger_condition("total >= 5", sample_context) is True
        assert service._evaluate_trigger_condition("total >= 6", sample_context) is False

    def test_simple_lt(self, service, sample_context):
        assert service._evaluate_trigger_condition("total < 10", sample_context) is True

    def test_simple_eq(self, service, sample_context):
        assert service._evaluate_trigger_condition("total == 5", sample_context) is True
        assert service._evaluate_trigger_condition("total == 99", sample_context) is False

    def test_simple_neq(self, service, sample_context):
        assert service._evaluate_trigger_condition("total != 0", sample_context) is True


class TestTriggerConditionDotNotation:
    """점 표기법 접근"""

    def test_nested_dot_access(self, service, sample_context):
        assert service._evaluate_trigger_condition("hits.total.value > 0", sample_context) is True
        assert service._evaluate_trigger_condition("hits.total.value == 42", sample_context) is True

    def test_subscript_access(self, service, sample_context):
        assert service._evaluate_trigger_condition(
            "aggregations.threats.buckets[0].doc_count >= 10", sample_context
        ) is True
        assert service._evaluate_trigger_condition(
            "aggregations.threats.buckets[1].doc_count == 3", sample_context
        ) is True


class TestTriggerConditionLogical:
    """논리 연산 (and, or, not)"""

    def test_and(self, service, sample_context):
        assert service._evaluate_trigger_condition("total > 0 and hits.total.value > 0", sample_context) is True
        assert service._evaluate_trigger_condition("total > 0 and total > 100", sample_context) is False

    def test_or(self, service, sample_context):
        assert service._evaluate_trigger_condition("total > 100 or hits.total.value > 0", sample_context) is True

    def test_not(self, service, sample_context):
        assert service._evaluate_trigger_condition("not total == 0", sample_context) is True

    def test_negative_number(self, service):
        assert service._evaluate_trigger_condition("total > -1", {"total": 0}) is True


class TestTriggerConditionSecurity:
    """보안: 함수 호출, import, 코드 실행 차단"""

    def test_block_function_call(self, service):
        with pytest.raises(ValueError, match="Disallowed expression"):
            service._evaluate_trigger_condition("len(total)", {"total": [1, 2]}, raise_errors=True)

    def test_block_import(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("__import__('os').system('id')", {}, raise_errors=True)

    def test_block_dunder_access(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition(
                "().__class__.__bases__[0].__subclasses__()", {}, raise_errors=True
            )

    def test_block_lambda(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("(lambda: 1)()", {}, raise_errors=True)

    def test_block_exec(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("exec('import os')", {}, raise_errors=True)

    def test_block_eval(self, service):
        with pytest.raises(ValueError, match="Disallowed expression"):
            service._evaluate_trigger_condition("eval('1+1')", {}, raise_errors=True)

    def test_block_list_comprehension(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("[x for x in range(10)]", {}, raise_errors=True)

    def test_unknown_variable_raises(self, service):
        with pytest.raises(NameError, match="Unknown variable"):
            service._evaluate_trigger_condition("unknown > 0", {}, raise_errors=True)

    def test_syntax_error_without_raise(self, service):
        """raise_errors=False일 때 구문 오류는 True 반환 (안전 폴백)"""
        assert service._evaluate_trigger_condition(">>>invalid", {}, raise_errors=False) is True


class TestTriggerConditionEdgeCases:
    """엣지 케이스"""

    def test_string_comparison(self, service):
        assert service._evaluate_trigger_condition(
            "status == 'active'", {"status": "active"}, raise_errors=True
        ) is True

    def test_chained_comparison(self, service):
        assert service._evaluate_trigger_condition(
            "0 < total < 10", {"total": 5}, raise_errors=True
        ) is True
        assert service._evaluate_trigger_condition(
            "0 < total < 3", {"total": 5}, raise_errors=True
        ) is False

    def test_boolean_literal(self, service):
        assert service._evaluate_trigger_condition("True", {}, raise_errors=True) is True
        assert service._evaluate_trigger_condition("False", {}, raise_errors=True) is False
