import asyncio
from datetime import datetime, timezone, timedelta

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.detection_policy import DetectionPolicyService, DotDict
from app.schemas.detection_policy import DetectorCreate, DetectorUpdate


@pytest.fixture(autouse=True)
def mock_delivery():
    """WebSocket manager와 send_webhook을 전역 모킹하여 테스트 격리"""
    with patch("app.services.detection_policy.manager") as mock_mgr, \
         patch("app.services.detection_policy.send_webhook", new_callable=AsyncMock) as mock_wh:
        mock_mgr.broadcast = AsyncMock()
        mock_mgr.send_to_roles = AsyncMock()
        yield mock_mgr, mock_wh


class TestDotDict:
    def test_attribute_access(self):
        d = DotDict({"a": 1, "b": {"c": 2}})
        assert d.a == 1

    def test_nested_dict_becomes_dotdict(self):
        d = DotDict({"nested": {"x": 10}})
        assert d.nested.x == 10

    def test_missing_key_returns_none(self):
        d = DotDict({"a": 1})
        assert d.missing is None


class TestTriggerConditionEvaluation:
    def setup_method(self):
        self.service = DetectionPolicyService.__new__(DetectionPolicyService)

    def test_empty_condition_returns_true(self):
        assert self.service._evaluate_trigger_condition("", {}) is True
        assert self.service._evaluate_trigger_condition(None, {}) is True

    def test_simple_comparison(self):
        ctx = {"total": 5}
        assert self.service._evaluate_trigger_condition("total > 0", ctx) is True
        assert self.service._evaluate_trigger_condition("total > 10", ctx) is False

    def test_complex_expression(self):
        ctx = {"total": 100, "bucket_count": 5}
        assert self.service._evaluate_trigger_condition("total > 50 and bucket_count >= 3", ctx) is True
        assert self.service._evaluate_trigger_condition("total > 200 or bucket_count >= 3", ctx) is True
        assert self.service._evaluate_trigger_condition("total > 200 and bucket_count >= 3", ctx) is False

    def test_nested_access(self):
        ctx = DotDict({"hits": {"total": {"value": 42}}})
        assert self.service._evaluate_trigger_condition("hits.total.value > 10", ctx) is True

    def test_invalid_expression_returns_true(self):
        assert self.service._evaluate_trigger_condition("import os", {}) is True

    def test_raises_on_invalid_when_requested(self):
        with pytest.raises(Exception):
            self.service._evaluate_trigger_condition("import os", {}, raise_errors=True)


class TestRenderMessage:
    def test_basic_template(self):
        msg = DetectionPolicyService._render_message(
            "[{{severity}}] {{name}}: {{total}}건 탐지",
            {"severity": "high", "name": "Suspicious Login", "total": 42},
        )
        assert msg == "[high] Suspicious Login: 42건 탐지"

    def test_missing_variable_preserved(self):
        msg = DetectionPolicyService._render_message("{{missing}}", {})
        assert msg == "{{missing}}"

    def test_empty_template(self):
        assert DetectionPolicyService._render_message("", {}) == ""


class TestFieldMappings:
    def test_apply_field_mappings(self):
        config = {"query": {"match": {"CommandLine": "powershell"}}}
        mappings = [{"rule_field": "CommandLine", "log_field": "process.command_line"}]
        result = DetectionPolicyService._apply_field_mappings(config, mappings)
        assert "process.command_line" in str(result)

    def test_no_mappings_returns_original(self):
        config = {"query": {"match_all": {}}}
        result = DetectionPolicyService._apply_field_mappings(config, [])
        assert result == config


class TestDetectorCRUD:
    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_list_detectors(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.list_detectors = AsyncMock(return_value=(1, [{"id": "d1", "name": "test"}]))
        total, items = await service.list_detectors()
        assert total == 1
        assert items[0]["id"] == "d1"

    @pytest.mark.asyncio
    async def test_get_detector(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.get_detector_by_id = AsyncMock(return_value={"id": "d1", "name": "test"})
        result = await service.get_detector("d1")
        assert result["id"] == "d1"

    @pytest.mark.asyncio
    async def test_create_detector(self, service, mock_repos):
        mock_repo, _ = mock_repos
        detector_in = DetectorCreate(
            name="Test Detector",
            detector_type="windows",
            target_indices=["logs-sentinel_one.edr"],
            schedule_interval_min=5,
            linked_rule_ids=["rule-1"],
            field_mappings=[{"rule_field": "CommandLine", "log_field": "process.command_line"}],
        )
        mock_repo.create_detector = AsyncMock(return_value={"id": "d1", "name": "Test Detector"})
        result = await service.create_detector(detector_in, user_id="user1")
        assert result["name"] == "Test Detector"
        mock_repo.create_detector.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_detector(self, service, mock_repos):
        mock_repo, _ = mock_repos
        update_in = DetectorUpdate(name="Updated Detector")
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1", "name": "Updated Detector"})
        result = await service.update_detector("d1", update_in)
        assert result["name"] == "Updated Detector"

    @pytest.mark.asyncio
    async def test_delete_detector(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.delete_detector = AsyncMock(return_value=True)
        assert await service.delete_detector("d1") is True


class TestFindingCRUD:
    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_list_findings(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.list_findings = AsyncMock(return_value=(2, [{"id": "f1"}, {"id": "f2"}]))
        total, items = await service.list_findings()
        assert total == 2

    @pytest.mark.asyncio
    async def test_update_finding_status(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.update_finding_status = AsyncMock(return_value={"id": "f1", "status": "acknowledged"})
        result = await service.update_finding_status("f1", "acknowledged")
        assert result["status"] == "acknowledged"


class TestDetectionEngine:
    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_repo.client = MagicMock()
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_skips_inactive_detector(self, service, mock_repos):
        mock_repo, _ = mock_repos
        await service.run_detection_for_detector({"id": "d1", "is_active": False})
        mock_repo.update_detector.assert_not_called()

    @pytest.mark.asyncio
    async def test_creates_findings_on_match(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Test Rule", "status": "active",
            "detection_config": {"query": {"match_all": {}}},
            "mitre_technique_ids": ["T1059"], "mitre_tactic_ids": ["execution"],
        })
        mock_repo.client.search.return_value = {
            "hits": {
                "total": {"value": 3},
                "hits": [
                    {"_source": {"host": "h1"}},
                    {"_source": {"host": "h2"}},
                    {"_source": {"host": "h3"}},
                ],
            }
        }

        detector = {
            "id": "d1",
            "name": "Test Detector",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": ["r1"],
            "field_mappings": [],
            "trigger_condition": "total > 0",
            "message_template": "{{name}}: {{total}}건",
            "severity": "high",
            "total_findings_count": 0,
        }

        result = await service.run_detection_for_detector(detector)
        assert result is not None
        assert len(result["findings"]) == 1
        mock_repo.create_finding.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_finding_when_zero_hits(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Test Rule", "status": "active",
            "detection_config": {"query": {"match_all": {}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = {
            "hits": {"total": {"value": 0}, "hits": []}
        }

        detector = {
            "id": "d1",
            "name": "Test",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": ["r1"],
            "field_mappings": [],
            "trigger_condition": None,
            "severity": "low",
            "total_findings_count": 0,
        }
        result = await service.run_detection_for_detector(detector)
        assert result is not None
        assert result["report"]["executed"] == 1
        assert result["report"]["findings_count"] == 0

    @pytest.mark.asyncio
    async def test_no_finding_when_trigger_not_met(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Test Rule", "status": "active",
            "detection_config": {"query": {"match_all": {}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = {
            "hits": {
                "total": {"value": 2},
                "hits": [{"_source": {"a": 1}}, {"_source": {"a": 2}}],
            }
        }

        detector = {
            "id": "d1",
            "name": "Test",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": ["r1"],
            "field_mappings": [],
            "trigger_condition": "total > 100",
            "severity": "low",
            "total_findings_count": 0,
        }
        result = await service.run_detection_for_detector(detector)
        assert result is not None
        assert result["report"]["executed"] == 1
        assert result["report"]["findings_count"] == 0
        mock_repo.create_finding.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_rules_returns_none(self, service, mock_repos):
        mock_repo, _ = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})

        detector = {
            "id": "d1",
            "name": "Empty",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": [],
            "field_mappings": [],
            "trigger_condition": None,
            "severity": "low",
            "total_findings_count": 0,
        }
        result = await service.run_detection_for_detector(detector)
        assert result is None

    @pytest.mark.asyncio
    async def test_multiple_rules_produce_multiple_findings(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(side_effect=[{"id": "f1"}, {"id": "f2"}])

        mock_rule_repo.get_rule_by_id = AsyncMock(side_effect=[
            {
                "id": "r1", "name": "Rule 1", "status": "active",
                "detection_config": {"query": {"match_all": {}}},
                "mitre_technique_ids": [], "mitre_tactic_ids": [],
            },
            {
                "id": "r2", "name": "Rule 2", "status": "active",
                "detection_config": {"query": {"match": {"host": "evil"}}},
                "mitre_technique_ids": [], "mitre_tactic_ids": [],
            },
        ])
        mock_repo.client.search.return_value = {
            "hits": {
                "total": {"value": 1},
                "hits": [{"_source": {"host": "evil"}}],
            }
        }

        detector = {
            "id": "d1",
            "name": "Multi-rule Detector",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": ["r1", "r2"],
            "field_mappings": [],
            "trigger_condition": None,
            "severity": "high",
            "total_findings_count": 0,
        }
        result = await service.run_detection_for_detector(detector)
        assert result is not None
        assert len(result["findings"]) == 2

    @pytest.mark.asyncio
    async def test_field_mappings_applied(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Test Rule", "status": "active",
            "detection_config": {"query": {"match": {"CommandLine": "powershell"}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = {
            "hits": {
                "total": {"value": 1},
                "hits": [{"_source": {"process.command_line": "powershell"}}],
            }
        }

        detector = {
            "id": "d1",
            "name": "Mapped Detector",
            "is_active": True,
            "target_indices": ["logs-test"],
            "linked_rule_ids": ["r1"],
            "field_mappings": [{"rule_field": "CommandLine", "log_field": "process.command_line"}],
            "trigger_condition": None,
            "severity": "medium",
            "total_findings_count": 0,
        }
        result = await service.run_detection_for_detector(detector)
        assert result is not None

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        assert "process.command_line" in str(search_body)


# ── Phase 2: 탐지 엔진 개선 테스트 ─────────────────────────────────────────

def _make_detector(**overrides):
    base = {
        "id": "d1",
        "name": "Test Detector",
        "is_active": True,
        "target_indices": ["logs-test"],
        "linked_rule_ids": ["r1"],
        "field_mappings": [],
        "trigger_condition": None,
        "severity": "high",
        "total_findings_count": 0,
        "timestamp_field": "@timestamp",
        "max_search_window_min": 1440,
    }
    base.update(overrides)
    return base


def _search_result(total=3, hits=None):
    if hits is None:
        hits = [{"_source": {"host": f"h{i}"}} for i in range(total)]
    return {"hits": {"total": {"value": total}, "hits": hits}}


class TestDetectionEngineV2:
    """Phase 2 탐지 엔진 개선 테스트 — opensearch_query 우선, 시간 범위, timeout, 리포트"""

    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_repo.client = MagicMock()
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    # ── opensearch_query 우선 사용 ──

    @pytest.mark.asyncio
    async def test_run_with_opensearch_query(self, service, mock_repos):
        """opensearch_query가 있으면 detection_config 대신 사용"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        os_query = {"query": {"match": {"process.command_line": "powershell"}}}
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Sigma Rule", "status": "active", "type": "sigma",
            "opensearch_query": os_query,
            "query_conversion_status": "success",
            "detection_config": {"should": "not_be_used"},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(3)

        result = await service.run_detection_for_detector(_make_detector())

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        body_str = str(search_body)
        assert "process.command_line" in body_str
        assert "should_not_be_used" not in body_str

    @pytest.mark.asyncio
    async def test_fallback_to_detection_config(self, service, mock_repos):
        """opensearch_query 없을 때 detection_config로 fallback"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Legacy Rule", "status": "active", "type": "sigma",
            "opensearch_query": None,
            "query_conversion_status": "pending",
            "detection_config": {"query": {"match": {"host.name": "evil"}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        result = await service.run_detection_for_detector(_make_detector())
        assert result is not None
        assert result["report"]["executed"] == 1

    # ── 스킵 로직 ──

    @pytest.mark.asyncio
    async def test_skip_unconverted_sigma(self, service, mock_repos):
        """opensearch_query도 detection_config도 없는 Sigma 룰은 스킵"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Unconverted Rule", "status": "active", "type": "sigma",
            "opensearch_query": None,
            "query_conversion_status": "pending",
            "detection_config": None,
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })

        result = await service.run_detection_for_detector(_make_detector())
        assert result is not None
        assert result["report"]["skipped"] == 1
        assert result["report"]["skipped_rules"][0]["reason"] == "unconverted_sigma"

    @pytest.mark.asyncio
    async def test_skip_failed_conversion(self, service, mock_repos):
        """query_conversion_status=='failed' 룰은 스킵"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Failed Rule", "status": "active", "type": "sigma",
            "opensearch_query": None,
            "query_conversion_status": "failed",
            "detection_config": {"query": {"match_all": {}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })

        result = await service.run_detection_for_detector(_make_detector())
        assert result is not None
        assert result["report"]["skipped"] == 1
        assert result["report"]["skipped_rules"][0]["reason"] == "conversion_failed"

    # ── 시간 범위 필터 ──

    @pytest.mark.asyncio
    async def test_time_range_filter_applied(self, service, mock_repos):
        """last_run_at이 있으면 해당 시점 이후로 시간 범위 필터 적용"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        last_run = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        detector = _make_detector(last_run_at=last_run)
        await service.run_detection_for_detector(detector)

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        body_str = str(search_body)
        assert "range" in body_str
        assert "@timestamp" in body_str
        assert "gte" in body_str

    @pytest.mark.asyncio
    async def test_time_range_filter_no_last_run(self, service, mock_repos):
        """last_run_at 없을 때 max_search_window_min 기반 시간 범위"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        detector = _make_detector(last_run_at=None, max_search_window_min=60)
        await service.run_detection_for_detector(detector)

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        body_str = str(search_body)
        assert "range" in body_str
        assert "gte" in body_str

    @pytest.mark.asyncio
    async def test_max_search_window_capping(self):
        """last_run_at이 max_window보다 오래된 경우 max_window로 캡핑"""
        now = datetime.now(timezone.utc)
        detector = _make_detector(
            last_run_at=(now - timedelta(days=3)).isoformat(),
            max_search_window_min=60,
        )
        time_filter = DetectionPolicyService._build_time_range_filter(detector, now=now)

        gte_str = time_filter["range"]["@timestamp"]["gte"]
        gte_dt = datetime.fromisoformat(gte_str)
        diff = (now - gte_dt).total_seconds() / 60

        assert abs(diff - 60) < 1

    @pytest.mark.asyncio
    async def test_custom_timestamp_field(self, service, mock_repos):
        """timestamp_field='event.timestamp' 지정 시 해당 필드로 시간 범위 생성"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        detector = _make_detector(timestamp_field="event.timestamp")
        await service.run_detection_for_detector(detector)

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        body_str = str(search_body)
        assert "event.timestamp" in body_str

    # ── timeout ──

    @pytest.mark.asyncio
    async def test_query_timeout_in_body(self, service, mock_repos):
        """search body에 timeout: 30s 포함"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        await service.run_detection_for_detector(_make_detector())

        search_call = mock_repo.client.search.call_args
        search_body = search_call[1]["body"] if "body" in search_call[1] else search_call[0][1]
        assert search_body.get("timeout") == "30s"

    # ── 실행 리포트 ──

    @pytest.mark.asyncio
    async def test_partial_execution_report(self, service, mock_repos):
        """성공2 + 실패1 + 스킵1 → 리포트에 정확히 반영"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(side_effect=[{"id": "f1"}, {"id": "f2"}])

        rule_success_1 = {
            "id": "r1", "name": "OK1", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        rule_success_2 = {
            "id": "r2", "name": "OK2", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        rule_failed = {
            "id": "r3", "name": "FailConv", "status": "active", "type": "sigma",
            "query_conversion_status": "failed",
            "opensearch_query": None,
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        rule_error = {
            "id": "r4", "name": "ErrorRule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }

        mock_rule_repo.get_rule_by_id = AsyncMock(
            side_effect=[rule_success_1, rule_success_2, rule_failed, rule_error]
        )

        call_count = [0]
        def search_side_effect(**kwargs):
            call_count[0] += 1
            if call_count[0] == 3:
                raise Exception("OpenSearch connection error")
            return _search_result(1)

        mock_repo.client.search.side_effect = search_side_effect

        detector = _make_detector(linked_rule_ids=["r1", "r2", "r3", "r4"])
        result = await service.run_detection_for_detector(detector)

        assert result is not None
        report = result["report"]
        assert report["executed"] == 2
        assert report["failed"] == 1
        assert report["skipped"] == 1

    @pytest.mark.asyncio
    async def test_all_rules_skipped_report(self, service, mock_repos):
        """모든 룰이 변환 실패 → executed=0, skipped=N"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})

        failed_rule = {
            "id": "r1", "name": "FailedRule", "status": "active", "type": "sigma",
            "query_conversion_status": "failed",
            "opensearch_query": None,
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        mock_rule_repo.get_rule_by_id = AsyncMock(
            side_effect=[dict(failed_rule, id="r1"), dict(failed_rule, id="r2"), dict(failed_rule, id="r3")]
        )

        detector = _make_detector(linked_rule_ids=["r1", "r2", "r3"])
        result = await service.run_detection_for_detector(detector)

        assert result is not None
        report = result["report"]
        assert report["executed"] == 0
        assert report["skipped"] == 3
        assert report["findings_count"] == 0


# ── Phase 2-21: 스케줄러 Semaphore 테스트 ──────────────────────────────────

class TestSchedulerSemaphore:
    """스케줄러의 동시 실행 제한(Semaphore) 검증"""

    @pytest.mark.asyncio
    async def test_semaphore_limits_concurrency(self):
        """100개 Detector 동시 실행 시 동시 활성 태스크가 50개 이하"""
        from app.core.scheduler import DetectionScheduler

        max_concurrent = 0
        current_concurrent = 0
        lock = asyncio.Lock()

        async def fake_run(det):
            nonlocal max_concurrent, current_concurrent
            async with lock:
                current_concurrent += 1
                if current_concurrent > max_concurrent:
                    max_concurrent = current_concurrent
            await asyncio.sleep(0.01)
            async with lock:
                current_concurrent -= 1
            return None

        scheduler = DetectionScheduler.__new__(DetectionScheduler)
        scheduler.max_concurrent_detectors = 50
        scheduler.detection_policy_service = MagicMock()
        scheduler.detection_policy_service.list_detectors = AsyncMock(
            return_value=(100, [
                {"id": f"d{i}", "is_active": True, "schedule_interval_min": 1}
                for i in range(100)
            ])
        )
        scheduler.detection_policy_service.run_detection_for_detector = AsyncMock(side_effect=fake_run)

        await scheduler.run_active_detection_policies()

        assert max_concurrent <= 50

    @pytest.mark.asyncio
    async def test_semaphore_all_complete(self):
        """세마포어 적용 후에도 모든 Detector가 실행 완료됨"""
        from app.core.scheduler import DetectionScheduler

        executed_ids = []

        async def fake_run(det):
            await asyncio.sleep(0.001)
            executed_ids.append(det["id"])
            return None

        scheduler = DetectionScheduler.__new__(DetectionScheduler)
        scheduler.max_concurrent_detectors = 10
        scheduler.detection_policy_service = MagicMock()
        scheduler.detection_policy_service.list_detectors = AsyncMock(
            return_value=(30, [
                {"id": f"d{i}", "is_active": True, "schedule_interval_min": 1}
                for i in range(30)
            ])
        )
        scheduler.detection_policy_service.run_detection_for_detector = AsyncMock(side_effect=fake_run)

        await scheduler.run_active_detection_policies()

        assert len(executed_ids) == 30

    @pytest.mark.asyncio
    async def test_detector_error_no_cascade(self):
        """1개 Detector 에러 발생 시 다른 Detector에 영향 없음"""
        from app.core.scheduler import DetectionScheduler

        results = []
        call_count = [0]

        async def fake_run(det):
            call_count[0] += 1
            if det["id"] == "d5":
                raise RuntimeError("Simulated failure")
            results.append(det["id"])
            return None

        scheduler = DetectionScheduler.__new__(DetectionScheduler)
        scheduler.max_concurrent_detectors = 50
        scheduler.detection_policy_service = MagicMock()
        scheduler.detection_policy_service.list_detectors = AsyncMock(
            return_value=(10, [
                {"id": f"d{i}", "is_active": True, "schedule_interval_min": 1}
                for i in range(10)
            ])
        )
        scheduler.detection_policy_service.run_detection_for_detector = AsyncMock(side_effect=fake_run)

        await scheduler.run_active_detection_policies()

        assert len(results) == 9
        assert "d5" not in results


# ── Phase 2-23: 통합 테스트 (E2E 탐지 실행 검증) ────────────────────────────

class TestDetectionE2E:
    """변환된 DSL 기반 탐지 실행 → Finding 생성 통합 테스트"""

    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_repo.client = MagicMock()
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_e2e_converted_rule_creates_finding(self, service, mock_repos):
        """변환된 DSL → 매칭 로그 → Finding 문서 생성"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        created_finding = {
            "id": "f1", "detector_id": "d1", "rule_id": "r1",
            "matched_count": 5, "status": "new",
        }
        mock_repo.create_finding = AsyncMock(return_value=created_finding)

        converted_dsl = {
            "query": {
                "bool": {
                    "must": [{"match": {"process.command_line": "powershell -enc"}}]
                }
            }
        }
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Encoded PowerShell", "status": "active", "type": "sigma",
            "opensearch_query": converted_dsl,
            "query_conversion_status": "success",
            "mitre_technique_ids": ["T1059.001"], "mitre_tactic_ids": ["execution"],
        })
        mock_repo.client.search.return_value = _search_result(5)

        result = await service.run_detection_for_detector(_make_detector())

        assert result is not None
        assert len(result["findings"]) == 1
        assert result["report"]["executed"] == 1
        assert result["report"]["findings_count"] == 1

        call_args = mock_repo.create_finding.call_args[0][0]
        assert call_args["matched_count"] == 5
        assert call_args["rule_id"] == "r1"
        assert "T1059.001" in call_args["mitre_technique_ids"]

    @pytest.mark.asyncio
    async def test_e2e_no_duplicate_findings(self, service, mock_repos):
        """동일 Detector 2회 실행 → Finding 2개 생성 (중복 방지는 Finding 레벨에서)"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(
            side_effect=[{"id": "f1"}, {"id": "f2"}]
        )

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        result1 = await service.run_detection_for_detector(_make_detector())
        result2 = await service.run_detection_for_detector(
            _make_detector(last_run_at=datetime.now(timezone.utc).isoformat())
        )

        assert result1 is not None
        assert result2 is not None
        assert mock_repo.create_finding.call_count == 2

    @pytest.mark.asyncio
    async def test_e2e_custom_rule_still_works(self, service, mock_repos):
        """Custom 룰은 detection_config로 정상 탐지"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={"id": "f1"})

        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Custom Rule", "status": "active", "type": "custom",
            "detection_config": {"query": {"match": {"event.action": "login_failure"}}},
            "mitre_technique_ids": ["T1110"], "mitre_tactic_ids": ["credential-access"],
        })
        mock_repo.client.search.return_value = _search_result(3)

        result = await service.run_detection_for_detector(_make_detector())
        assert result is not None
        assert result["report"]["executed"] == 1
        assert result["report"]["skipped"] == 0
        mock_repo.create_finding.assert_called_once()

    @pytest.mark.asyncio
    async def test_e2e_mixed_rules_partial(self, service, mock_repos):
        """성공+실패 룰 혼합 Detector: 성공 룰만 실행, 실패 룰 스킵, 리포트 정확"""
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(
            side_effect=[{"id": "f1"}, {"id": "f2"}]
        )

        sigma_ok = {
            "id": "r1", "name": "Sigma OK", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        sigma_failed = {
            "id": "r2", "name": "Sigma Failed", "status": "active", "type": "sigma",
            "opensearch_query": None,
            "query_conversion_status": "failed",
            "query_conversion_error": "Unsupported modifier",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }
        custom_ok = {
            "id": "r3", "name": "Custom OK", "status": "active", "type": "custom",
            "detection_config": {"query": {"match": {"host": "evil"}}},
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        }

        mock_rule_repo.get_rule_by_id = AsyncMock(
            side_effect=[sigma_ok, sigma_failed, custom_ok]
        )
        mock_repo.client.search.return_value = _search_result(1)

        detector = _make_detector(linked_rule_ids=["r1", "r2", "r3"])
        result = await service.run_detection_for_detector(detector)

        assert result is not None
        report = result["report"]
        assert report["executed"] == 2
        assert report["skipped"] == 1
        assert report["findings_count"] == 2
        assert report["skipped_rules"][0]["reason"] == "conversion_failed"


# ── Webhook + WebSocket 전달 테스트 ──────────────────────────────────────

class TestFindingDelivery:
    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_repo.client = MagicMock()
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_websocket_broadcast_on_finding(self, service, mock_repos, mock_delivery):
        """Finding 생성 시 WebSocket broadcast 호출"""
        mock_mgr, _ = mock_delivery
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={
            "id": "f1", "rule_name": "Test", "message": "found",
            "severity": "high", "detector_name": "Detector", "matched_count": 3,
            "created_at": "2026-01-01T00:00:00",
        })
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        await service.run_detection_for_detector(_make_detector())
        mock_mgr.broadcast.assert_called_once()
        ws_msg = mock_mgr.broadcast.call_args[0][0]
        assert ws_msg["type"] == "new_alert"
        assert ws_msg["data"]["source"] == "detection"

    @pytest.mark.asyncio
    async def test_webhook_called_when_configured(self, service, mock_repos, mock_delivery):
        """webhook_url 설정된 Detector → Finding 생성 시 webhook 호출"""
        _, mock_wh = mock_delivery
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={
            "id": "f1", "rule_name": "Rule", "message": "found",
            "severity": "high", "detector_name": "D1", "matched_count": 1,
            "created_at": "2026-01-01T00:00:00", "target_index": "logs-test",
        })
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        detector = _make_detector(webhook_url="https://hooks.example.com/test", webhook_headers={"X-Token": "abc"})
        await service.run_detection_for_detector(detector)
        mock_wh.assert_called_once()
        call_args = mock_wh.call_args
        assert call_args[0][0] == "https://hooks.example.com/test"
        assert call_args[0][1]["type"] == "detection_finding"
        assert call_args[0][2]["X-Token"] == "abc"

    @pytest.mark.asyncio
    async def test_no_webhook_when_not_configured(self, service, mock_repos, mock_delivery):
        """webhook_url 미설정 Detector → webhook 미호출"""
        _, mock_wh = mock_delivery
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
        mock_repo.create_finding = AsyncMock(return_value={
            "id": "f1", "rule_name": "Rule", "message": "found",
            "severity": "high", "detector_name": "D1", "matched_count": 1,
            "created_at": "2026-01-01T00:00:00",
        })
        mock_rule_repo.get_rule_by_id = AsyncMock(return_value={
            "id": "r1", "name": "Rule", "status": "active", "type": "sigma",
            "opensearch_query": {"query": {"match_all": {}}},
            "query_conversion_status": "success",
            "mitre_technique_ids": [], "mitre_tactic_ids": [],
        })
        mock_repo.client.search.return_value = _search_result(1)

        await service.run_detection_for_detector(_make_detector())
        mock_wh.assert_not_called()


# ── 변경 이력 추적 테스트 ────────────────────────────────────────────────

class TestChangeHistory:
    @pytest.fixture
    def mock_repos(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo, \
             patch("app.services.detection_policy.SigmaRuleRepository") as MockRuleRepo:
            mock_repo = MockRepo.return_value
            mock_rule_repo = MockRuleRepo.return_value
            yield mock_repo, mock_rule_repo

    @pytest.fixture
    def service(self, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        svc.rule_repository = mock_rule_repo
        return svc

    @pytest.mark.asyncio
    async def test_update_records_change_history(self, service, mock_repos):
        """user_id가 있는 update → change_history에 항목 추가"""
        mock_repo, _ = mock_repos
        mock_repo.get_detector_by_id = AsyncMock(return_value={
            "id": "d1", "name": "Old", "change_history": [],
        })
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1", "name": "New"})

        update_in = DetectorUpdate(name="New")
        await service.update_detector("d1", update_in, user_id="user-1")

        call_data = mock_repo.update_detector.call_args[0][1]
        assert "change_history" in call_data
        assert len(call_data["change_history"]) == 1
        assert call_data["change_history"][0]["user_id"] == "user-1"
        assert "name" in call_data["change_history"][0]["changed_fields"]

    @pytest.mark.asyncio
    async def test_update_without_user_no_history(self, service, mock_repos):
        """user_id 없는 update → change_history 미기록 (스케줄러 등)"""
        mock_repo, _ = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1", "name": "New"})

        update_in = DetectorUpdate(name="New")
        await service.update_detector("d1", update_in, user_id="")

        call_data = mock_repo.update_detector.call_args[0][1]
        assert "change_history" not in call_data
