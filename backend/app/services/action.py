import httpx
import json
import re
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.repositories.action import ActionRepository
from app.repositories.action_history import ActionHistoryRepository
from app.schemas.action import ActionCreate, ActionUpdate

class ActionService:
    def __init__(self, repository: ActionRepository, history_repository: Optional[ActionHistoryRepository] = None):
        self.repository = repository
        self.history_repository = history_repository

    async def create_action(self, action: ActionCreate) -> str:
        # 이름 중복 체크
        existing = await self.repository.get_by_name(action.name)
        if existing:
            raise ValueError(f"Action with name '{action.name}' already exists")
            
        return await self.repository.create(action)

    async def get_actions(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        return await self.repository.get_all(skip, limit)

    async def get_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        return await self.repository.get_by_id(action_id)

    async def update_action(self, action_id: str, action_update: ActionUpdate) -> bool:
        return await self.repository.update(action_id, action_update)

    async def delete_action(self, action_id: str) -> bool:
        return await self.repository.delete(action_id)

    def _render_dsl(self, template: str, log: Dict[str, Any]) -> str:
        """{{field}} 형식의 변수를 로그 데이터의 값으로 치환"""
        def replace_match(match):
            field_path = match.group(1).strip()
            # 중첩된 필드 지원 (예: source.ip)
            parts = field_path.split('.')
            val = log
            for part in parts:
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    return match.group(0) # 치환 실패 시 그대로 둠
            return str(val)

        return re.sub(r"\{\{(.*?)\}\}", replace_match, template)

    async def execute_action(self, action_id: str, logs: List[Dict[str, Any]], user_id: str = "system", user_name: str = "system") -> Dict[str, Any]:
        """API 액션 실행 및 히스토리 저장"""
        action = await self.repository.get_by_id(action_id)
        if not action:
            return {"success": False, "message": "Action not found"}

        print(f"[Action] Starting '{action['name']}' for {len(logs)} logs (User: {user_name})")

        target_host = action.get("target_host", {})
        url = target_host.get("url", "")
        port = target_host.get("port", 80)
        path = target_host.get("path", "/")
        
        # URL 정규화 로직 개선
        base_url = url
        if not base_url.startswith("http"):
            base_url = f"http://{base_url}"
        
        if not re.search(r":\d+", base_url.replace("://", "")):
            base_url = f"{base_url}:{port}"
        
        full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
        
        # 헤더 정보 준비
        custom_headers = action.get("headers") or {}
        
        results = []
        success_count = 0
        fail_count = 0
        
        # verify=False로 설정하여 자가 서명 인증서 등 SSL 이슈 방지
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            for log in logs:
                rendered_body = self._render_dsl(action["action_logic"]["dsl"], log)
                
                # 상세 로그 출력
                print(f"  - Request to: {full_url}")
                print(f"  - Headers: {custom_headers}")
                print(f"  - Payload: {rendered_body}")

                # JSON 여부 확인 및 파싱 시도
                try:
                    payload = json.loads(rendered_body)
                    is_json = True
                except:
                    payload = rendered_body
                    is_json = False

                try:
                    if is_json:
                        response = await client.post(full_url, json=payload, headers=custom_headers)
                    else:
                        response = await client.post(full_url, content=payload, headers=custom_headers)
                    
                    success = response.is_success
                    if success: success_count += 1
                    else: fail_count += 1
                    
                    print(f"  - Response: HTTP {response.status_code} ({'Success' if success else 'Fail'})")

                    results.append({
                        "log_id": log.get("id") or log.get("_id", "unknown"),
                        "status_code": response.status_code,
                        "success": success,
                        "response": response.text[:200]
                    })
                except Exception as e:
                    fail_count += 1
                    print(f"  - Error: {str(e)}")
                    results.append({
                        "log_id": log.get("id") or log.get("_id", "unknown"),
                        "success": False,
                        "error": str(e)
                    })

        # 실행 히스토리 저장
        if self.history_repository:
            history_data = {
                "action_id": action_id,
                "action_name": action["name"],
                "user_id": user_id,
                "user_name": user_name,
                "total_count": len(logs),
                "success_count": success_count,
                "fail_count": fail_count,
                "results": results,
                "created_at": datetime.utcnow().isoformat()
            }
            await self.history_repository.create(history_data)

        print(f"[Action] Completed: {success_count} success, {fail_count} fail")

        return {
            "success": True,
            "action_name": action["name"],
            "total": len(logs),
            "results": results
        }
