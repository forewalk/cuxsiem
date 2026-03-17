import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.detection_policy import DetectionPolicyService, DotDict
from app.schemas.detection_policy import DetectionPolicyCreate, DetectionPolicyUpdate


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


class TestPolicyCRUD:
    @pytest.fixture
    def mock_repo(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo:
            mock = MockRepo.return_value
            yield mock

    @pytest.fixture
    def service(self, mock_repo):
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        return svc

    @pytest.mark.asyncio
    async def test_list_policies(self, service, mock_repo):
        mock_repo.list_policies = AsyncMock(return_value=(1, [{"id": "p1", "name": "test"}]))
        total, items = await service.list_policies()
        assert total == 1
        assert items[0]["id"] == "p1"

    @pytest.mark.asyncio
    async def test_get_policy(self, service, mock_repo):
        mock_repo.get_policy_by_id = AsyncMock(return_value={"id": "p1", "name": "test"})
        result = await service.get_policy("p1")
        assert result["id"] == "p1"

    @pytest.mark.asyncio
    async def test_create_policy(self, service, mock_repo):
        policy_in = DetectionPolicyCreate(
            name="Test Policy",
            target_index="logs-test",
            condition_config={"query": {"match_all": {}}},
            interval_min=5,
        )
        mock_repo.create_policy = AsyncMock(return_value={"id": "p1", "name": "Test Policy"})
        result = await service.create_policy(policy_in, user_id="user1")
        assert result["name"] == "Test Policy"
        mock_repo.create_policy.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_policy(self, service, mock_repo):
        update_in = DetectionPolicyUpdate(name="Updated Policy")
        mock_repo.update_policy = AsyncMock(return_value={"id": "p1", "name": "Updated Policy"})
        result = await service.update_policy("p1", update_in)
        assert result["name"] == "Updated Policy"

    @pytest.mark.asyncio
    async def test_delete_policy(self, service, mock_repo):
        mock_repo.delete_policy = AsyncMock(return_value=True)
        assert await service.delete_policy("p1") is True


class TestEventCRUD:
    @pytest.fixture
    def mock_repo(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo:
            mock = MockRepo.return_value
            yield mock

    @pytest.fixture
    def service(self, mock_repo):
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        return svc

    @pytest.mark.asyncio
    async def test_list_events(self, service, mock_repo):
        mock_repo.list_events = AsyncMock(return_value=(2, [{"id": "e1"}, {"id": "e2"}]))
        total, items = await service.list_events()
        assert total == 2

    @pytest.mark.asyncio
    async def test_update_event_status(self, service, mock_repo):
        mock_repo.update_event_status = AsyncMock(return_value={"id": "e1", "status": "acknowledged"})
        result = await service.update_event_status("e1", "acknowledged")
        assert result["status"] == "acknowledged"


class TestRunDetection:
    @pytest.fixture
    def mock_repo(self):
        with patch("app.services.detection_policy.DetectionPolicyRepository") as MockRepo:
            mock = MockRepo.return_value
            mock.client = MagicMock()
            yield mock

    @pytest.fixture
    def service(self, mock_repo):
        svc = DetectionPolicyService()
        svc.repository = mock_repo
        return svc

    @pytest.mark.asyncio
    async def test_skips_inactive_policy(self, service, mock_repo):
        await service.run_detection_for_policy({"id": "p1", "is_active": False})
        mock_repo.update_policy.assert_not_called()

    @pytest.mark.asyncio
    async def test_creates_event_on_match(self, service, mock_repo):
        mock_repo.update_policy = AsyncMock(return_value={"id": "p1"})
        mock_repo.create_event = AsyncMock(return_value={"id": "e1"})
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

        policy = {
            "id": "p1",
            "name": "Test Policy",
            "is_active": True,
            "target_index": "logs-test",
            "condition_config": {"query": {"match_all": {}}},
            "trigger_condition": "total > 0",
            "message_template": "{{name}}: {{total}}건",
            "severity": "high",
            "mitre_technique_ids": ["T1059"],
            "mitre_tactic_ids": ["execution"],
            "total_events_count": 0,
        }

        result = await service.run_detection_for_policy(policy)
        assert result is not None
        mock_repo.create_event.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_event_when_zero_hits(self, service, mock_repo):
        mock_repo.update_policy = AsyncMock(return_value={"id": "p1"})
        mock_repo.client.search.return_value = {
            "hits": {"total": {"value": 0}, "hits": []}
        }

        policy = {
            "id": "p1",
            "name": "Test",
            "is_active": True,
            "target_index": "logs-test",
            "condition_config": {"query": {"match_all": {}}},
            "trigger_condition": None,
            "severity": "low",
            "total_events_count": 0,
        }
        result = await service.run_detection_for_policy(policy)
        assert result is None

    @pytest.mark.asyncio
    async def test_no_event_when_trigger_not_met(self, service, mock_repo):
        mock_repo.update_policy = AsyncMock(return_value={"id": "p1"})
        mock_repo.client.search.return_value = {
            "hits": {
                "total": {"value": 2},
                "hits": [{"_source": {"a": 1}}, {"_source": {"a": 2}}],
            }
        }

        policy = {
            "id": "p1",
            "name": "Test",
            "is_active": True,
            "target_index": "logs-test",
            "condition_config": {"query": {"match_all": {}}},
            "trigger_condition": "total > 100",
            "severity": "low",
            "total_events_count": 0,
        }
        result = await service.run_detection_for_policy(policy)
        assert result is None
