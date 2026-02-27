from typing import List
from app.repositories.code import code_repository

class CodeService:
    async def get_role_codes(self):
        """역할 코드 목록 조회"""
        codes = await code_repository.get_codes()
        
        # 만약 DB에 데이터가 없으면 기본값 생성
        if not codes:
            defaults = [
                ("role-1", "관리자"),
                ("role-2", "모니터링"),
                ("role-3", "결재자"),
                ("role-4", "사용자")
            ]
            for cid, name in defaults:
                await code_repository.upsert_code(cid, name)
            codes = await code_repository.get_codes()
            
        return codes

    async def update_role_code(self, code_id: str, code_name: str):
        """역할 코드 업데이트"""
        return await code_repository.upsert_code(code_id, code_name)

code_service = CodeService()
