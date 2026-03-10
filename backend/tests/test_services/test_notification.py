"""
알림(Notification) 시스템 시나리오 테스트

시나리오 구성:
1. 트리거 조건 평가 (AST 기반 안전 평가기)
2. 메시지 템플릿 렌더링
3. 규칙 CRUD (서비스 레이어)
4. 탐지 실행 및 알림 생성
5. 중복 제거 (dedup_key)
6. 스케줄러 실행 주기 판단
7. 보안 (eval 차단, 인증 등)
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from app.services.notification import NotificationService, DotDict
from app.core.scheduler import DetectionScheduler


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

@pytest.fixture
def service():
    svc = NotificationService()
    svc.repository = MagicMock()
    return svc


@pytest.fixture
def sample_opensearch_result():
    """OpenSearch 쿼리 응답 샘플"""
    return {
        "hits": {
            "total": {"value": 5},
            "hits": [
                {"_source": {"host": "web-01", "severity": "high", "@timestamp": "2026-03-09T10:00:00Z"}},
                {"_source": {"host": "web-02", "severity": "medium", "@timestamp": "2026-03-09T10:01:00Z"}},
            ]
        },
        "aggregations": {
            "threats": {
                "buckets": [
                    {"key": "malware", "doc_count": 3},
                    {"key": "phishing", "doc_count": 2},
                ]
            }
        }
    }


@pytest.fixture
def sample_rule():
    """알림 규칙 샘플"""
    return {
        "id": "rule-001",
        "name": "High Threat Detection",
        "description": "5건 이상 위협 탐지 시 알림",
        "target_index": "logs-sentinel_one.edr",
        "condition_config": {
            "query": {"bool": {"must": [{"match_all": {}}]}},
            "size": 100
        },
        "message_template": "[{{rule_severity}}] {{rule_name}}: 총 {{total}}건 탐지",
        "severity": "warning",
        "interval_min": 5,
        "trigger_condition": "hits.total.value > 0",
        "receiver": {"type": "role", "values": ["role-1"], "webhook_url": ""},
        "is_active": True,
        "total_alerts_count": 0,
        "last_run_at": None,
        "last_triggered_at": None,
    }


# ──────────────────────────────────────────────
# 1. 트리거 조건 평가
# ──────────────────────────────────────────────

class TestTriggerConditionBasic:
    """기본 비교 연산 시나리오"""

    def test_empty_condition_always_true(self, service):
        assert service._evaluate_trigger_condition("", {}) is True
        assert service._evaluate_trigger_condition("  ", {}) is True
        assert service._evaluate_trigger_condition(None, {}) is True

    def test_simple_comparisons(self, service):
        ctx = {"total": 5}
        assert service._evaluate_trigger_condition("total > 0", ctx) is True
        assert service._evaluate_trigger_condition("total > 100", ctx) is False
        assert service._evaluate_trigger_condition("total >= 5", ctx) is True
        assert service._evaluate_trigger_condition("total >= 6", ctx) is False
        assert service._evaluate_trigger_condition("total < 10", ctx) is True
        assert service._evaluate_trigger_condition("total == 5", ctx) is True
        assert service._evaluate_trigger_condition("total != 0", ctx) is True

    def test_chained_comparison(self, service):
        assert service._evaluate_trigger_condition("0 < total < 10", {"total": 5}) is True
        assert service._evaluate_trigger_condition("0 < total < 3", {"total": 5}) is False

    def test_negative_number(self, service):
        assert service._evaluate_trigger_condition("total > -1", {"total": 0}) is True

    def test_string_comparison(self, service):
        assert service._evaluate_trigger_condition("status == 'active'", {"status": "active"}) is True
        assert service._evaluate_trigger_condition("status != 'inactive'", {"status": "active"}) is True

    def test_boolean_literal(self, service):
        assert service._evaluate_trigger_condition("True", {}) is True
        assert service._evaluate_trigger_condition("False", {}) is False


class TestTriggerConditionDotNotation:
    """점 표기법 및 인덱스 접근 시나리오"""

    def test_nested_dot_access(self, service, sample_opensearch_result):
        ctx = sample_opensearch_result
        assert service._evaluate_trigger_condition("hits.total.value > 0", ctx) is True
        assert service._evaluate_trigger_condition("hits.total.value == 5", ctx) is True

    def test_subscript_access(self, service, sample_opensearch_result):
        ctx = sample_opensearch_result
        assert service._evaluate_trigger_condition(
            "aggregations.threats.buckets[0].doc_count >= 3", ctx
        ) is True
        assert service._evaluate_trigger_condition(
            "aggregations.threats.buckets[1].doc_count == 2", ctx
        ) is True

    def test_unknown_variable(self, service):
        with pytest.raises(NameError, match="Unknown variable"):
            service._evaluate_trigger_condition("unknown > 0", {}, raise_errors=True)

    def test_missing_attribute(self, service):
        with pytest.raises(AttributeError):
            service._evaluate_trigger_condition("hits.nonexistent > 0", {"hits": {}}, raise_errors=True)


class TestTriggerConditionLogical:
    """논리 연산 시나리오"""

    def test_and_operator(self, service, sample_opensearch_result):
        ctx = sample_opensearch_result
        assert service._evaluate_trigger_condition("hits.total.value > 0 and hits.total.value < 100", ctx) is True
        assert service._evaluate_trigger_condition("hits.total.value > 0 and hits.total.value > 100", ctx) is False

    def test_or_operator(self, service, sample_opensearch_result):
        ctx = sample_opensearch_result
        assert service._evaluate_trigger_condition("hits.total.value > 100 or hits.total.value == 5", ctx) is True

    def test_not_operator(self, service):
        assert service._evaluate_trigger_condition("not total == 0", {"total": 5}) is True
        assert service._evaluate_trigger_condition("not total > 0", {"total": 5}) is False

    def test_complex_condition(self, service, sample_opensearch_result):
        ctx = sample_opensearch_result
        condition = "hits.total.value > 0 and aggregations.threats.buckets[0].doc_count >= 3"
        assert service._evaluate_trigger_condition(condition, ctx) is True


class TestTriggerConditionSecurity:
    """보안: 악성 코드 차단 시나리오"""

    def test_block_function_call(self, service):
        with pytest.raises(ValueError, match="Disallowed expression"):
            service._evaluate_trigger_condition("len([1,2,3])", {}, raise_errors=True)

    def test_block_import(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("__import__('os').system('id')", {}, raise_errors=True)

    def test_block_eval(self, service):
        with pytest.raises(ValueError, match="Disallowed expression"):
            service._evaluate_trigger_condition("eval('1+1')", {}, raise_errors=True)

    def test_block_lambda(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("(lambda: 1)()", {}, raise_errors=True)

    def test_block_dunder_escape(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition(
                "().__class__.__bases__[0].__subclasses__()", {}, raise_errors=True
            )

    def test_block_list_comprehension(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("[x for x in range(10)]", {}, raise_errors=True)

    def test_block_exec(self, service):
        with pytest.raises(Exception):
            service._evaluate_trigger_condition("exec('import os')", {}, raise_errors=True)

    def test_syntax_error_safe_fallback(self, service):
        """raise_errors=False일 때 오류 시 True 반환 (안전 폴백)"""
        assert service._evaluate_trigger_condition(">>>invalid", {}, raise_errors=False) is True


# ──────────────────────────────────────────────
# 2. 메시지 템플릿 렌더링
# ──────────────────────────────────────────────

class TestMessageTemplateRendering:
    """메시지 템플릿 렌더링 시나리오"""

    def test_simple_variable(self, service):
        template = "총 {{total}}건 탐지"
        result = service._render_message_template(template, {"total": 42})
        assert result == "총 42건 탐지"

    def test_nested_variable(self, service):
        template = "조회 건수: {{hits.total.value}}"
        ctx = {"hits": {"total": {"value": 100}}}
        result = service._render_message_template(template, ctx)
        assert result == "조회 건수: 100"

    def test_multiple_variables(self, service):
        template = "[{{rule_severity}}] {{rule_name}}: 총 {{total}}건"
        ctx = {"rule_severity": "warning", "rule_name": "Test Rule", "total": 5}
        result = service._render_message_template(template, ctx)
        assert result == "[warning] Test Rule: 총 5건"

    def test_missing_variable_preserved(self, service):
        template = "host: {{hostname}}"
        result = service._render_message_template(template, {})
        assert result == "host: {{hostname}}"

    def test_hit_sources_extraction(self, service):
        template = "호스트: {{host}}"
        ctx = {
            "_hit_sources": [
                {"host": "web-01"},
                {"host": "web-02"},
                {"host": "web-01"},
            ]
        }
        result = service._render_message_template(template, ctx)
        assert "web-01" in result
        assert "web-02" in result

    def test_empty_template(self, service):
        result = service._render_message_template("", {"total": 5})
        assert result == ""


# ──────────────────────────────────────────────
# 3. 규칙 CRUD (서비스 레이어)
# ──────────────────────────────────────────────

class TestRuleCRUD:
    """규칙 생성/조회/수정/삭제 시나리오"""

    @pytest.mark.asyncio
    async def test_create_rule(self, service):
        from app.schemas.notification import NotificationRuleBase
        rule_in = NotificationRuleBase(
            name="Test Rule",
            target_index="logs-test",
            condition_config={"query": {"match_all": {}}},
            message_template="{{total}}건 탐지",
            severity="info",
            interval_min=5,
        )
        service.repository.create_rule = AsyncMock(return_value={
            "id": "new-rule-id",
            "name": "Test Rule",
            **rule_in.model_dump()
        })

        result = await service.create_rule(rule_in)
        assert result["id"] == "new-rule-id"
        assert result["name"] == "Test Rule"
        service.repository.create_rule.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_rule(self, service):
        service.repository.get_rule_by_id = AsyncMock(return_value={"id": "rule-001", "name": "Test"})
        result = await service.get_rule("rule-001")
        assert result["id"] == "rule-001"

    @pytest.mark.asyncio
    async def test_get_rule_not_found(self, service):
        service.repository.get_rule_by_id = AsyncMock(return_value=None)
        result = await service.get_rule("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_update_rule(self, service):
        from app.schemas.notification import NotificationRuleUpdate
        update_in = NotificationRuleUpdate(name="Updated Rule", severity="error")
        service.repository.update_rule = AsyncMock(return_value={
            "id": "rule-001", "name": "Updated Rule", "severity": "error"
        })

        result = await service.update_rule("rule-001", update_in)
        assert result["name"] == "Updated Rule"
        assert result["severity"] == "error"

    @pytest.mark.asyncio
    async def test_delete_rule_soft_delete(self, service):
        service.repository.delete_rule = AsyncMock(return_value=True)
        result = await service.delete_rule("rule-001")
        assert result is True

    @pytest.mark.asyncio
    async def test_list_rules_with_filters(self, service):
        service.repository.list_rules = AsyncMock(return_value=(2, [
            {"id": "r1", "name": "Rule 1", "severity": "warning"},
            {"id": "r2", "name": "Rule 2", "severity": "warning"},
        ]))

        total, rules = await service.list_rules(
            skip=0, limit=10, severities=["warning"], is_active=True
        )
        assert total == 2
        assert len(rules) == 2
        service.repository.list_rules.assert_called_once_with(
            skip=0, limit=10, sort_by="created_at", order="desc",
            query=None, severities=["warning"], is_active=True,
            from_date=None, to_date=None
        )


# ──────────────────────────────────────────────
# 4. 탐지 실행 및 알림 생성
# ──────────────────────────────────────────────

class TestDetectionExecution:
    """탐지 규칙 실행 → 알림 생성 시나리오"""

    @pytest.mark.asyncio
    async def test_detection_creates_alert_when_triggered(self, service, sample_rule, sample_opensearch_result):
        """트리거 조건 충족 시 알림 생성"""
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.get_alert_by_dedup_key = AsyncMock(return_value=None)
        service.repository.create_alert = AsyncMock(return_value={
            "id": "alert-001", "rule_name": "High Threat Detection",
            "message": "[warning] High Threat Detection: 총 5건 탐지",
            "severity": "warning", "rule_severity": "warning",
            "created_at": "2026-03-09T10:00:00", "receiver": sample_rule["receiver"]
        })
        service.repository.update_alert = AsyncMock(return_value=True)
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(return_value=sample_opensearch_result)

        with patch('app.services.notification.manager') as mock_manager:
            mock_manager.send_to_roles = AsyncMock()
            result = await service.run_detection_for_rule(sample_rule)

        assert result is not None
        service.repository.create_alert.assert_called_once()

    @pytest.mark.asyncio
    async def test_detection_skips_inactive_rule(self, service, sample_rule):
        """비활성 규칙은 실행하지 않음"""
        sample_rule["is_active"] = False
        result = await service.run_detection_for_rule(sample_rule)
        assert result is None

    @pytest.mark.asyncio
    async def test_detection_skips_when_trigger_condition_false(self, service, sample_rule):
        """트리거 조건 미충족 시 알림 생성 안 함"""
        sample_rule["trigger_condition"] = "hits.total.value > 1000"

        empty_result = {"hits": {"total": {"value": 5}, "hits": []}}
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(return_value=empty_result)

        result = await service.run_detection_for_rule(sample_rule)
        assert result is None

    @pytest.mark.asyncio
    async def test_detection_skips_when_zero_results(self, service, sample_rule):
        """쿼리 결과 0건이면 알림 생성 안 함"""
        sample_rule["trigger_condition"] = ""
        zero_result = {"hits": {"total": {"value": 0}, "hits": []}}
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(return_value=zero_result)

        result = await service.run_detection_for_rule(sample_rule)
        assert result is None


# ──────────────────────────────────────────────
# 5. 중복 제거 (dedup_key)
# ──────────────────────────────────────────────

class TestDedupLogic:
    """동일 규칙/시간 윈도우 중복 알림 방지 시나리오"""

    @pytest.mark.asyncio
    async def test_duplicate_alert_blocked(self, service, sample_rule, sample_opensearch_result):
        """같은 분(minute) 안에 동일 규칙 알림 중복 생성 차단"""
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.get_alert_by_dedup_key = AsyncMock(return_value={"id": "existing-alert"})
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(return_value=sample_opensearch_result)

        result = await service.run_detection_for_rule(sample_rule)
        assert result is None
        service.repository.create_alert.assert_not_called()

    @pytest.mark.asyncio
    async def test_new_minute_allows_new_alert(self, service, sample_rule, sample_opensearch_result):
        """다른 분(minute)에는 새 알림 생성 허용"""
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.get_alert_by_dedup_key = AsyncMock(return_value=None)
        service.repository.create_alert = AsyncMock(return_value={
            "id": "alert-new", "rule_name": sample_rule["name"],
            "message": "test", "severity": "warning", "rule_severity": "warning",
            "created_at": "2026-03-09T10:01:00", "receiver": sample_rule["receiver"],
        })
        service.repository.update_alert = AsyncMock(return_value=True)
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(return_value=sample_opensearch_result)

        with patch('app.services.notification.manager') as mock_manager:
            mock_manager.send_to_roles = AsyncMock()
            result = await service.run_detection_for_rule(sample_rule)

        assert result is not None
        service.repository.create_alert.assert_called_once()


# ──────────────────────────────────────────────
# 6. 스케줄러 실행 주기 판단
# ──────────────────────────────────────────────

class TestSchedulerTiming:
    """스케줄러가 interval_min에 따라 규칙 실행 여부를 올바르게 판단하는지 테스트"""

    @pytest.mark.asyncio
    async def test_first_run_always_executes(self):
        """last_run_at이 None이면 항상 실행"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()
        scheduler.service.list_rules = AsyncMock(return_value=(1, [
            {"id": "r1", "is_active": True, "interval_min": 5, "last_run_at": None}
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        scheduler.service.run_detection_for_rule.assert_called_once()

    @pytest.mark.asyncio
    async def test_skips_before_interval_elapsed(self):
        """interval_min이 경과하지 않으면 실행 안 함"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()

        recent_time = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        scheduler.service.list_rules = AsyncMock(return_value=(1, [
            {"id": "r1", "is_active": True, "interval_min": 5, "last_run_at": recent_time}
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        scheduler.service.run_detection_for_rule.assert_not_called()

    @pytest.mark.asyncio
    async def test_executes_after_interval_elapsed(self):
        """interval_min 경과 후 실행"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()

        old_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        scheduler.service.list_rules = AsyncMock(return_value=(1, [
            {"id": "r1", "is_active": True, "interval_min": 5, "last_run_at": old_time}
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        scheduler.service.run_detection_for_rule.assert_called_once()

    @pytest.mark.asyncio
    async def test_skips_inactive_rules(self):
        """비활성 규칙은 건너뜀"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()
        scheduler.service.list_rules = AsyncMock(return_value=(1, [
            {"id": "r1", "is_active": False, "interval_min": 1, "last_run_at": None}
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        scheduler.service.run_detection_for_rule.assert_not_called()

    @pytest.mark.asyncio
    async def test_skips_rules_without_interval(self):
        """interval_min이 None인 규칙 건너뜀"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()
        scheduler.service.list_rules = AsyncMock(return_value=(1, [
            {"id": "r1", "is_active": True, "interval_min": None, "last_run_at": None}
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        scheduler.service.run_detection_for_rule.assert_not_called()

    @pytest.mark.asyncio
    async def test_multiple_rules_parallel_execution(self):
        """여러 규칙이 동시에 실행됨"""
        scheduler = DetectionScheduler()
        scheduler.service = MagicMock()
        scheduler.service.list_rules = AsyncMock(return_value=(3, [
            {"id": "r1", "is_active": True, "interval_min": 1, "last_run_at": None},
            {"id": "r2", "is_active": True, "interval_min": 1, "last_run_at": None},
            {"id": "r3", "is_active": False, "interval_min": 1, "last_run_at": None},
        ]))
        scheduler.service.run_detection_for_rule = AsyncMock(return_value=None)

        await scheduler.run_active_detections()
        assert scheduler.service.run_detection_for_rule.call_count == 2


# ──────────────────────────────────────────────
# 7. DotDict 유틸리티
# ──────────────────────────────────────────────

class TestDotDict:
    """DotDict 점 표기법 접근 테스트"""

    def test_basic_access(self):
        d = DotDict({"name": "test", "count": 42})
        assert d.name == "test"
        assert d.count == 42

    def test_nested_access(self):
        d = DotDict({"hits": {"total": {"value": 100}}})
        assert d.hits.total.value == 100

    def test_list_access(self):
        d = DotDict({"buckets": [{"key": "a", "doc_count": 10}]})
        buckets = d.buckets
        assert len(buckets) == 1
        assert buckets[0]["key"] == "a"

    def test_missing_key_returns_none(self):
        d = DotDict({"a": 1})
        assert d.nonexistent is None

    def test_dict_access_still_works(self):
        d = DotDict({"a": 1, "b": 2})
        assert d["a"] == 1
        assert d.get("b") == 2
        assert d.get("missing", "default") == "default"


# ──────────────────────────────────────────────
# 8. 알림 전달 (WebSocket + Webhook)
# ──────────────────────────────────────────────

class TestAlertDelivery:
    """알림 전달 채널 시나리오"""

    @pytest.mark.asyncio
    async def test_websocket_delivery(self, service):
        """WebSocket으로 role 기반 알림 전송"""
        alert = {
            "id": "alert-001", "rule_name": "Test", "message": "test msg",
            "severity": "warning", "rule_severity": "warning",
            "created_at": "2026-03-09T10:00:00",
        }
        receiver = {"type": "role", "values": ["role-1", "role-2"]}
        service.repository.update_alert = AsyncMock(return_value=True)

        with patch('app.services.notification.manager') as mock_manager:
            mock_manager.send_to_roles = AsyncMock()
            await service._deliver_alert(alert, receiver)

            mock_manager.send_to_roles.assert_called_once()
            call_kwargs = mock_manager.send_to_roles.call_args
            assert call_kwargs.kwargs["roles"] == ["role-1", "role-2"]

    @pytest.mark.asyncio
    async def test_webhook_skipped_when_no_url(self, service):
        """Webhook URL 미설정 시 건너뜀"""
        alert = {
            "id": "alert-001", "rule_name": "Test", "message": "test",
            "severity": "info", "rule_severity": "info",
            "created_at": "2026-03-09T10:00:00",
        }
        receiver = {"type": "role", "values": ["role-1"], "webhook_url": ""}
        service.repository.update_alert = AsyncMock(return_value=True)

        with patch('app.services.notification.manager') as mock_manager:
            mock_manager.send_to_roles = AsyncMock()
            await service._deliver_alert(alert, receiver)

        update_call = service.repository.update_alert.call_args
        delivery = update_call.args[1]["delivery_results"]
        assert delivery["webhook"]["status"] == "skipped"

    @pytest.mark.asyncio
    async def test_webhook_called_when_url_set(self, service):
        """Webhook URL 설정 시 발송"""
        alert = {
            "id": "alert-001", "rule_name": "Test", "message": "test",
            "severity": "info", "rule_severity": "info",
            "created_at": "2026-03-09T10:00:00", "rule_target_index": "logs-test",
        }
        receiver = {
            "type": "role", "values": ["role-1"],
            "webhook_url": "http://example.com/webhook", "webhook_headers": {}
        }
        service.repository.update_alert = AsyncMock(return_value=True)

        with patch('app.services.notification.manager') as mock_manager, \
             patch('app.services.notification.send_webhook', new_callable=AsyncMock) as mock_webhook:
            mock_manager.send_to_roles = AsyncMock()
            mock_webhook.return_value = {"status": "success", "status_code": 200}
            await service._deliver_alert(alert, receiver)

            mock_webhook.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_when_no_receiver_values(self, service):
        """수신 대상이 비어있으면 broadcast"""
        alert = {
            "id": "alert-001", "rule_name": "Test", "message": "test",
            "severity": "info", "rule_severity": "info",
            "created_at": "2026-03-09T10:00:00",
        }
        receiver = {"type": "role", "values": []}
        service.repository.update_alert = AsyncMock(return_value=True)

        with patch('app.services.notification.manager') as mock_manager:
            mock_manager.broadcast = AsyncMock()
            mock_manager.send_to_roles = AsyncMock()
            await service._deliver_alert(alert, receiver)

            mock_manager.broadcast.assert_called_once()
            mock_manager.send_to_roles.assert_not_called()


# ──────────────────────────────────────────────
# 9. 에러 핸들링
# ──────────────────────────────────────────────

class TestErrorHandling:
    """에러 상황 시나리오"""

    @pytest.mark.asyncio
    async def test_opensearch_query_failure_logged(self, service, sample_rule):
        """OpenSearch 쿼리 실패 시 에러 로깅, 예외 전파 안 함"""
        service.repository.update_rule = AsyncMock(return_value=True)
        service.repository.client = MagicMock()
        service.repository.client.search = MagicMock(side_effect=Exception("Connection refused"))

        result = await service.run_detection_for_rule(sample_rule)
        assert result is None

    def test_trigger_error_fallback_true(self, service):
        """트리거 조건 평가 실패 시 기본적으로 True (알림 발송)"""
        result = service._evaluate_trigger_condition(
            "nonexistent_var > 0", {}, raise_errors=False
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_websocket_failure_does_not_block_webhook(self, service):
        """WebSocket 실패해도 Webhook은 계속 실행"""
        alert = {
            "id": "alert-001", "rule_name": "Test", "message": "test",
            "severity": "info", "rule_severity": "info",
            "created_at": "2026-03-09T10:00:00", "rule_target_index": "logs-test",
        }
        receiver = {
            "type": "role", "values": ["role-1"],
            "webhook_url": "http://example.com/hook", "webhook_headers": {}
        }
        service.repository.update_alert = AsyncMock(return_value=True)

        with patch('app.services.notification.manager') as mock_manager, \
             patch('app.services.notification.send_webhook', new_callable=AsyncMock) as mock_webhook:
            mock_manager.send_to_roles = AsyncMock(side_effect=Exception("WS fail"))
            mock_webhook.return_value = {"status": "success", "status_code": 200}

            await service._deliver_alert(alert, receiver)
            mock_webhook.assert_called_once()
