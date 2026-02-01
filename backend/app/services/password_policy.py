"""패스워드 정책 Service"""
from datetime import datetime
from app.models.password_policy import PasswordPolicy
from app.repositories.password_policy import PasswordPolicyRepository
from app.schemas.password_policy import PasswordPolicyUpdate, PasswordPolicyResponse


class PasswordPolicyService:
    """패스워드 정책 서비스"""

    def __init__(self):
        self.repo = PasswordPolicyRepository()

    async def get_current_policy(self) -> PasswordPolicyResponse:
        """현재 패스워드 정책 조회"""
        policy = await self.repo.get_policy()
        if not policy:
            # 기본값으로 초기 정책 생성
            now = datetime.utcnow()
            policy = PasswordPolicy(
                id="default",
                min_length=8,
                require_uppercase=False,
                require_lowercase=True,
                require_numbers=True,
                require_special_chars=False,
                max_password_age_days=90,
                password_history_count=3,
                lockout_threshold=5,
                lockout_duration_minutes=30,
                created_at=now,
                updated_at=now
            )
            await self.repo.update_policy(policy)
        
        return PasswordPolicyResponse.model_validate(policy)

    async def update_policy(self, request: PasswordPolicyUpdate) -> PasswordPolicyResponse:
        """패스워드 정책 업데이트"""
        now = datetime.utcnow()
        current = await self.repo.get_policy()
        
        created_at = current.created_at if current else now
        
        policy = PasswordPolicy(
            id="default",
            **request.model_dump(),
            created_at=created_at,
            updated_at=now
        )
        
        updated = await self.repo.update_policy(policy)
        return PasswordPolicyResponse.model_validate(updated)
