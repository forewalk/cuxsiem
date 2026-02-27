from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
import asyncio
import logging
import re

from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationRuleBase, NotificationRuleUpdate
from app.core.websocket import manager

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.repository = NotificationRepository()

    # --- Rule Management ---

    async def get_rule(self, rule_id: str):
        return await self.repository.get_rule_by_id(rule_id)

    async def list_rules(
        self,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        order: str = "desc",
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ):
        return await self.repository.list_rules(
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            order=order,
            query=query,
            severities=severities,
            is_active=is_active,
            from_date=from_date,
            to_date=to_date
        )

    async def create_rule(self, rule_in: NotificationRuleBase):
        return await self.repository.create_rule(rule_in.model_dump())

    async def update_rule(self, rule_id: str, rule_in: NotificationRuleUpdate):
        data = rule_in.model_dump(exclude_none=True)
        logger.info(f"[서비스] update_rule 호출 - rule_id: {rule_id}")
        logger.info(f"[서비스] 받은 데이터 키: {list(data.keys())}")
        logger.info(f"[서비스] condition_config 포함 여부: {'condition_config' in data}")
        if 'condition_config' in data:
            logger.info(f"[서비스] condition_config 내용: {data['condition_config']}")
        return await self.repository.update_rule(rule_id, data)

    async def delete_rule(self, rule_id: str):
        return await self.repository.delete_rule(rule_id)

    async def test_query(self, target_index: str, condition_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        DSL 쿼리를 실행하여 결과 반환 (테스트용)
        - 실제 알림 생성 없이 쿼리만 실행
        - OpenSearch 응답을 그대로 반환
        """
        try:
            # 쿼리 구성 (run_detection_for_rule과 동일한 로직)
            search_body = {
                **condition_config,
                "size": condition_config.get("size", 10)
            }
            
            # sort가 없으면 @timestamp 내림차순 기본값 적용
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]
            
            logger.info(f"[쿼리 테스트] 인덱스: {target_index}, 쿼리: {search_body}")
            
            # OpenSearch 쿼리 실행
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )
            
            logger.info(f"[쿼리 테스트] 성공 - Total: {result.get('hits', {}).get('total', {}).get('value', 0)}")
            
            return result
            
        except Exception as e:
            logger.error(f"[쿼리 테스트] 실패: {e}")
            raise Exception(f"Query execution failed: {str(e)}")

    # --- Notification Management ---

    async def list_notifications(
        self,
        skip: int = 0,
        limit: int = 100,
        query: Optional[str] = None,
        severities: Optional[List[str]] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_role: Optional[str] = None
    ):
        """알림 내역 조회 (cs_alerts 인덱스에서 조회) - role 기반 필터링"""
        return await self.repository.list_alerts(
            skip=skip,
            limit=limit,
            query=query,
            severities=severities,
            from_date=from_date,
            to_date=to_date,
            user_role=user_role
        )

    def _generate_dedup_key(self, rule: Dict[str, Any], event: Dict[str, Any]) -> str:
        """
        중복 제거 키 생성
        - 룰 ID와 이벤트 고유 ID({{_id}}) 또는 주요 필드 조합을 기반으로 함
        - 시간 의존성을 제거하여 동일 이벤트에 대해 항상 동일한 키 생성
        """
        template = rule.get("dedup_key_template", "{{rule_id}}_{{_id}}")

        key = template.replace("{{rule_id}}", rule["id"])
        key = key.replace("{{rule_name}}", rule.get("name", ""))
        
        # 이벤트 메타데이터 처리
        if "{{_id}}" in key:
            key = key.replace("{{_id}}", str(event.get("_id", "unknown")))
        if "{{_index}}" in key:
            key = key.replace("{{_index}}", str(event.get("_index", "unknown")))

        matches = re.findall(r"\{\{([^}]+)\}\}", key)
        source = event.get("_source", {})

        for field in matches:
            if field in ["rule_id", "rule_name", "_id", "_index"]: continue
            val = str(source.get(field, "unknown"))
            key = key.replace(f"{{{{{field}}}}}", val)

        return key
    
    def _render_message_template(self, template: str, context: Dict[str, Any]) -> str:
        """
        메시지 템플릿 렌더링
        - {{변수}} 형식 지원
        - {{nested.field}} 중첩 필드 접근 지원
        """
        def replace_var(match):
            key = match.group(1)
            
            # 중첩 필드 접근 (예: agentDetectionInfo.accountName)
            if '.' in key:
                keys = key.split('.')
                value = context
                for k in keys:
                    if isinstance(value, dict):
                        value = value.get(k)
                        if value is None:
                            return f"{{{{{key}}}}}"  # 값이 없으면 원본 유지
                    else:
                        return f"{{{{{key}}}}}"
                return str(value) if value is not None else f"{{{{{key}}}}}"
            
            # 단순 키 접근
            value = context.get(key)
            if value is None:
                return f"{{{{{key}}}}}"
            return str(value)
        
        # 정규식: {{변수명}} 또는 {{nested.field.name}} 형식
        return re.sub(r"\{\{([\w\.@]+)\}\}", replace_var, template)
    
    def _evaluate_trigger_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        """
        트리거 조건 평가
        - Python 표현식을 안전하게 평가
        - 예: "total > 0", "total > 50 and bucket_count >= 3"
        """
        if not condition or not condition.strip():
            return True  # 조건이 없으면 항상 true
        
        try:
            # 안전한 네임스페이스 설정 (math 함수 등 허용)
            import math
            safe_namespace = {
                '__builtins__': {},
                'math': math,
                'abs': abs,
                'min': min,
                'max': max,
                'sum': sum,
                'len': len,
                **context  # 쿼리 결과 컨텍스트
            }
            
            # Python 표현식 평가
            result = eval(condition, safe_namespace)
            logger.info(f"[트리거] 조건 평가: '{condition}' = {result}")
            return bool(result)
        
        except Exception as e:
            logger.error(f"[트리거] 조건 평가 실패: '{condition}' - {e}")
            # 평가 실패 시 안전하게 true 반환 (알림 생성)
            return True
    
    def _format_aggregation_results(self, aggregations: Dict[str, Any]) -> str:
        """
        집계 결과를 포맷팅된 문자열로 변환
        """
        formatted_lines = []
        
        for agg_name, agg_data in aggregations.items():
            if "buckets" in agg_data:
                buckets = agg_data["buckets"]
                for bucket in buckets:
                    key = bucket.get("key", "Unknown")
                    doc_count = bucket.get("doc_count", 0)
                    
                    line = f"  - {key}: {doc_count}건"
                    
                    # 중첩 집계가 있는 경우
                    for nested_agg_name, nested_agg_data in bucket.items():
                        if isinstance(nested_agg_data, dict) and "buckets" in nested_agg_data:
                            nested_buckets = nested_agg_data["buckets"]
                            if nested_buckets:
                                nested_items = [f"{b.get('key', '')} ({b.get('doc_count', 0)}건)" 
                                              for b in nested_buckets[:3]]  # 상위 3개만
                                line += f"\n    주요 항목: {', '.join(nested_items)}"
                    
                    formatted_lines.append(line)
        
        return "\n".join(formatted_lines) if formatted_lines else "집계 결과 없음"
    
    async def _create_aggregation_alert(
        self, 
        rule: Dict[str, Any], 
        result: Dict[str, Any],
        now: datetime,
        aggregations: Dict[str, Any],
        total: int
    ):
        """집계 결과 기반 알림 생성 (하나의 알림으로 통합)"""
        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.threats")
        
        # 집계 결과 포맷팅
        aggregation_summary = self._format_aggregation_results(aggregations)
        
        # 버킷 개수 계산 (PC 개수 등)
        bucket_count = 0
        for agg_name, agg_data in aggregations.items():
            if "buckets" in agg_data:
                bucket_count = len(agg_data["buckets"])
                break
        
        # 트리거 조건 체크
        trigger_condition = rule.get("trigger_condition")
        if trigger_condition:
            trigger_context = {
                "total": total,
                "bucket_count": bucket_count,
                "pc_count": bucket_count,
                "aggregations": aggregations
            }
            
            if not self._evaluate_trigger_condition(trigger_condition, trigger_context):
                logger.info(f"[탐지] 트리거 조건 미충족 - 규칙: '{rule['name']}', 조건: '{trigger_condition}'")
                logger.info(f"[탐지] 현재 값: total={total}, bucket_count={bucket_count}")
                return None
        
        # 중복 제거 키: 규칙 ID + 시간 윈도우 (분 단위로 동일 규칙은 하나의 알림만)
        time_window = now.replace(second=0, microsecond=0).isoformat()
        dedup_key = f"{rule_id}_{time_window}"
        
        # 중복 체크
        existing_alert = await self.repository.get_alert_by_dedup_key(dedup_key)
        if existing_alert:
            logger.info(f"[탐지] 중복 집계 알림 건너뜀 - 규칙: '{rule['name']}', dedup_key: {dedup_key}")
            return None
        
        logger.info(f"[탐지] 새 집계 알림 생성 - 규칙: '{rule['name']}', dedup_key: {dedup_key}")
        
        # 메시지 템플릿 렌더링을 위한 context 구성
        template_context = {
            "total": total,
            "bucket_count": bucket_count,
            "pc_count": bucket_count,  # 별칭
            "rule_name": rule.get("name"),
            "rule_id": rule_id,
            "rule_severity": rule.get("severity"),
            "target_index": target_index,
            "aggregation_summary": aggregation_summary,
            "aggregations": aggregations  # 원본 집계 데이터도 제공
        }
        
        # 각 aggregation을 개별 변수로도 제공 (DSL aggregation 이름 = 템플릿 변수명)
        for agg_name, agg_data in aggregations.items():
            if "buckets" in agg_data:
                buckets = agg_data["buckets"]
                # 각 버킷을 포맷팅 (key만 표시)
                formatted_items = []
                for bucket in buckets:
                    key = bucket.get("key", "Unknown")
                    formatted_items.append(f"  - {key}")
                template_context[agg_name] = "\n".join(formatted_items) if formatted_items else "결과 없음"
        
        message_template = rule.get("message_template", "총 {{total}}개 이벤트, {{bucket_count}}개 그룹 발견\n\n{{aggregation_summary}}")
        rendered_message = self._render_message_template(message_template, template_context)
        
        # cs_alerts 인덱스에 저장할 알림 데이터
        alert_data = {
            "rule_id": rule_id,
            
            # 규칙 메타데이터
            "rule_name": rule.get("name", "Unknown Rule"),
            "rule_description": rule.get("description"),
            "rule_severity": rule.get("severity", "info"),
            "rule_target_index": target_index,
            
            # 메시지 관련
            "message": rendered_message,
            "message_template": message_template,
            
            # 집계 알림 특성
            "event_ref": f"aggregation_{rule_id}",
            "event_index": target_index,
            "event_source": {
                "type": "aggregation",
                "total": total,
                "bucket_count": bucket_count,
                "aggregations": aggregations
            },
            
            # 중복 제거 및 수신자
            "dedup_key": dedup_key,
            "severity": rule.get("severity", "info"),
            "receiver": rule.get("receiver"),
            
            # 상태
            "status": "created",
            "created_at": now.isoformat()
        }
        
        created_alert = await self.repository.create_alert(alert_data)
        
        # 터미널에서 즉시 확인할 수 있도록 출력
        print(f"\n{'='*50}\n[집계 알림 탐지] {created_alert['rule_name']}\n메시지:\n{created_alert['message']}\n{'='*50}\n")
        
        # WebSocket으로 실시간 알림 전송
        try:
            receiver_values = rule.get("receiver", {}).get("values", [])
            ws_message = {
                "type": "new_alert",
                "data": {
                    "id": created_alert["id"],
                    "rule_name": created_alert["rule_name"],
                    "message": created_alert["message"],
                    "severity": created_alert["severity"],
                    "rule_severity": created_alert["rule_severity"],
                    "created_at": created_alert["created_at"]
                }
            }
            
            if receiver_values:
                await manager.send_to_roles(roles=receiver_values, message=ws_message)
                logger.info(f"WebSocket 집계 알림 전송 완료 - 수신자 역할: {receiver_values}")
            else:
                await manager.broadcast(ws_message)
                logger.info("WebSocket 집계 알림 브로드캐스트 완료 - 전체 사용자")
        except Exception as ws_error:
            logger.error(f"WebSocket 알림 전송 실패: {ws_error}")
        
        return created_alert

    async def run_detection_for_rule(self, rule: Dict[str, Any]):
        """특정 규칙에 대한 탐지 엔진 실행 및 알림 생성"""
        if not rule.get("is_active"):
            return

        rule_id = rule["id"]
        target_index = rule.get("target_index", "logs-sentinel_one.threats")
        condition_config = rule.get("condition_config", {})

        now = datetime.utcnow()

        # OpenSearch 쿼리 실행
        try:
            await self.repository.update_rule(rule_id, {"last_run_at": now.isoformat()})

            # 사용자 정의 쿼리를 그대로 사용 (시간 필터는 사용자가 DSL에 직접 포함해야 함)
            search_body = {
                **condition_config,
                "size": condition_config.get("size", 10)  # 기본값 10유지하되 쿼리에 있으면 따름
            }
            
            # sort가 없으면 @timestamp 내림차순 기본값 적용
            if "sort" not in search_body:
                search_body["sort"] = [{"@timestamp": {"order": "desc"}}]

            logger.info(f"[탐지] 규칙 '{rule['name']}' 인덱스 '{target_index}'에서 탐지 실행 (사용자 정의 DSL)")
            logger.info(f"[탐지] 쿼리: {search_body}")

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.repository.client.search(index=target_index, body=search_body)
            )

            hits = result.get("hits", {}).get("hits", [])
            total = result.get("hits", {}).get("total", {}).get("value", 0)
            aggregations = result.get("aggregations") or result.get("aggs")
            
            logger.info(f"[탐지] 규칙 '{rule['name']}' 쿼리 결과: {total}개 이벤트 발견, 집계 결과: {'있음' if aggregations else '없음'}")

            await self.repository.update_rule(rule_id, {
                "last_success_at": now.isoformat(),
                "error_count": 0,
                "last_error": None
            })

            # 집계 결과가 있는 경우 (aggregation 기반 알림)
            if aggregations:
                logger.info(f"[탐지] 규칙 '{rule['name']}' - 집계 알림 생성 시작")
                created_alert = await self._create_aggregation_alert(rule, result, now, aggregations, total)
                
                if created_alert:
                    await self.repository.update_rule(rule_id, {
                        "last_triggered_at": now.isoformat(),
                        "total_alerts_count": rule.get("total_alerts_count", 0) + 1
                    })
                    return created_alert
                return None
            
            # 기존 로직: 개별 문서 기반 알림
            if total > 0:
                logger.info(f"[탐지] 규칙 '{rule['name']}' 발동: {total}개 이벤트 발견, 처리 시작...")

                created_alerts = []
                newly_created_count = 0

                # 모든 히트에 대해 개별 알림 생성 루프
                for hit in hits:
                    event_ref = hit.get("_id")
                    event_index = hit.get("_index")
                    event_source = hit.get("_source", {})
                    dedup_key = self._generate_dedup_key(rule, hit)

                    # 중복 체크: 이미 동일한 dedup_key를 가진 알림이 있는지 확인
                    existing_alert = await self.repository.get_alert_by_dedup_key(dedup_key)
                    if existing_alert:
                        logger.info(f"[탐지] 중복 알림 건너뜀 - 규칙: '{rule['name']}', dedup_key: {dedup_key}")
                        continue
                    
                    logger.info(f"[탐지] 새 알림 생성 - 규칙: '{rule['name']}', dedup_key: {dedup_key}")

                    # 메시지 템플릿 렌더링을 위한 context 구성
                    # event_source의 모든 필드 + 메타 정보 포함
                    template_context = {
                        # 기본 정보
                        "total": total,
                        "rule_name": rule.get("name"),
                        "rule_id": rule_id,
                        "rule_severity": rule.get("severity"),
                        "target_index": target_index,
                        "_id": event_ref,
                        "_index": event_index,
                        # event_source의 모든 필드 포함 (중첩 접근 지원)
                        **event_source
                    }
                    
                    message_template = rule.get("message_template", "Detected {{total}} events.")
                    rendered_message = self._render_message_template(message_template, template_context)

                    # cs_alerts 인덱스에 저장할 알림 데이터
                    alert_data = {
                        "rule_id": rule_id,
                        
                        # 규칙 메타데이터
                        "rule_name": rule.get("name", "Unknown Rule"),
                        "rule_description": rule.get("description"),
                        "rule_severity": rule.get("severity", "info"),
                        "rule_target_index": target_index,
                        
                        # 메시지 관련
                        "message": rendered_message,
                        "message_template": message_template,
                        
                        # 이벤트 관련
                        "event_ref": event_ref,
                        "event_index": event_index,
                        "event_source": event_source,
                        
                        # 중복 제거 및 수신자
                        "dedup_key": dedup_key,
                        "severity": rule.get("severity", "info"),
                        "receiver": rule.get("receiver"),
                        
                        # 상태
                        "status": "created",
                        "created_at": now.isoformat()
                    }

                    created_alert = await self.repository.create_alert(alert_data)
                    created_alerts.append(created_alert)
                    newly_created_count += 1

                    # 터미널에서 즉시 확인할 수 있도록 출력
                    print(f"\n{'='*50}\n[알림 탐지] {created_alert['rule_name']}\n메시지: {created_alert['message']}\n이벤트: {event_index}/{event_ref}\n{'='*50}\n")

                    # WebSocket으로 실시간 알림 전송
                    try:
                        receiver_values = rule.get("receiver", {}).get("values", [])
                        if receiver_values:
                            # 수신자 역할에 따라 전송
                            await manager.send_to_roles(
                                roles=receiver_values,
                                message={
                                    "type": "new_alert",
                                    "data": {
                                        "id": created_alert["id"],
                                        "rule_name": created_alert["rule_name"],
                                        "message": created_alert["message"],
                                        "severity": created_alert["severity"],
                                        "rule_severity": created_alert["rule_severity"],
                                        "created_at": created_alert["created_at"]
                                    }
                                }
                            )
                            logger.info(f"WebSocket 알림 전송 완료 - 수신자 역할: {receiver_values}")
                        else:
                            # 수신자 없으면 모든 연결에 브로드캐스트
                            await manager.broadcast({
                                "type": "new_alert",
                                "data": {
                                    "id": created_alert["id"],
                                    "rule_name": created_alert["rule_name"],
                                    "message": created_alert["message"],
                                    "severity": created_alert["severity"],
                                    "rule_severity": created_alert["rule_severity"],
                                    "created_at": created_alert["created_at"]
                                }
                            })
                            logger.info("WebSocket 알림 브로드캐스트 완료 - 전체 사용자")
                    except Exception as ws_error:
                        logger.error(f"WebSocket 알림 전송 실패: {ws_error}")
                        # WebSocket 실패해도 알림 생성은 계속 진행

                # 룰 통계 업데이트: 실제 생성된 알림 수 가산
                if newly_created_count > 0:
                    await self.repository.update_rule(rule_id, {
                        "last_triggered_at": now.isoformat(),
                        "total_alerts_count": rule.get("total_alerts_count", 0) + newly_created_count
                    })

                return created_alerts[0] if created_alerts else None
            else:
                logger.info(f"[탐지] 규칙 '{rule['name']}' - 조건에 맞는 이벤트 없음 (total: {total})")

            return None

        except Exception as e:
            error_msg = str(e)
            logger.error(f"규칙 {rule_id} 탐지 실행 오류: {error_msg}")
            await self.repository.update_rule(rule_id, {
                "last_error": error_msg,
                "error_count": rule.get("error_count", 0) + 1
            })
            return None

