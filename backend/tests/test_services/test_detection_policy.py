import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.detection_policy import DetectionPolicyService, DotDict
from app.schemas.detection_policy import DetectorCreate, DetectorUpdate


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
        assert len(result) == 1
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
        assert result is None

    @pytest.mark.asyncio
    async def test_no_finding_when_trigger_not_met(self, service, mock_repos):
        mock_repo, mock_rule_repo = mock_repos
        mock_repo.update_detector = AsyncMock(return_value={"id": "d1"})
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
        assert result is None

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
        assert len(result) == 2

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
