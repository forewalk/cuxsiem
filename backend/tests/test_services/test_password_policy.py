"""패스워드 정책 서비스 테스트"""
import pytest
from unittest.mock import AsyncMock
from datetime import datetime

from app.services.password_policy import PasswordPolicyService
from app.models.password_policy import PasswordPolicy
from app.schemas.password_policy import PasswordPolicyUpdate


@pytest.fixture
def service():
    return PasswordPolicyService()


@pytest.fixture
def default_policy():
    return PasswordPolicy(
        id="password",
        min_length=8,
        require_uppercase=False,
        require_lowercase=False,
        require_numbers=False,
        require_special_chars=False,
        max_password_age_days=90,
        password_history_count=3,
        lockout_threshold=5,
        lockout_duration_minutes=30,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_get_current_policy(service, default_policy):
    """정책 조회 — cs_policies 인덱스 id=password 기준"""
    service.repo.get_policy = AsyncMock(return_value=default_policy)

    result = await service.get_current_policy()

    assert result.min_length == 8
    assert result.lockout_threshold == 5
    service.repo.get_policy.assert_called_once()


@pytest.mark.asyncio
async def test_get_current_policy_creates_default_when_none(service):
    """정책 미존재 시 기본값으로 자동 생성"""
    service.repo.get_policy = AsyncMock(return_value=None)
    service.repo.update_policy = AsyncMock(
        side_effect=lambda p: p
    )

    result = await service.get_current_policy()

    assert result.min_length == 8
    service.repo.update_policy.assert_called_once()
    created_id = service.repo.update_policy.call_args[0][0].id
    assert created_id == "password", f"기본 정책 id는 'password'여야 합니다, 실제: {created_id}"


@pytest.mark.asyncio
async def test_update_policy_uses_password_id(service, default_policy):
    """update_policy가 id=password로 저장하는지 확인"""
    service.repo.get_policy = AsyncMock(return_value=default_policy)

    updated_policy = PasswordPolicy(
        id="password",
        min_length=12,
        require_uppercase=True,
        require_lowercase=True,
        require_numbers=True,
        require_special_chars=False,
        max_password_age_days=60,
        password_history_count=5,
        lockout_threshold=3,
        lockout_duration_minutes=60,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    service.repo.update_policy = AsyncMock(return_value=updated_policy)

    request = PasswordPolicyUpdate(
        min_length=12,
        require_uppercase=True,
        require_lowercase=True,
        require_numbers=True,
        require_special_chars=False,
        max_password_age_days=60,
        password_history_count=5,
        lockout_threshold=3,
        lockout_duration_minutes=60,
    )
    result = await service.update_policy(request)

    saved_policy = service.repo.update_policy.call_args[0][0]
    assert saved_policy.id == "password", f"저장 id는 'password'여야 합니다, 실제: {saved_policy.id}"
    assert result.min_length == 12


@pytest.mark.asyncio
async def test_validate_password_min_length(service, default_policy):
    """비밀번호 최소 길이 검증"""
    service.repo.get_policy = AsyncMock(return_value=default_policy)

    with pytest.raises(ValueError, match="8자"):
        await service.validate_password("short")
