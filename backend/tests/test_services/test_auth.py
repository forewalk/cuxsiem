"""인증 서비스 테스트"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.services.auth import AuthService
from app.schemas.auth import LoginRequest
from app.models.user import User


@pytest.fixture
def auth_service():
    """AuthService 픽스처"""
    return AuthService()


@pytest.mark.asyncio
async def test_login_success(auth_service):
    """정상 로그인 테스트"""
    # Mock 설정
    user = User(
        id="user-123",
        email="admin@example.com",
        password_hash="$2b$12$...",  # bcrypt hash
        name="Admin",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    request = LoginRequest(username="admin", password="password123")

    # user_repo.get_by_id mock
    auth_service.user_repo.get_by_id = AsyncMock(return_value=user)
    auth_service.user_repo.update_last_login = AsyncMock()

    # login_attempt_repo mocks
    auth_service.login_attempt_repo.count_failed_attempts = AsyncMock(return_value=0)
    auth_service.login_attempt_repo.record = AsyncMock()

    # session_repo.create mock
    auth_service.session_repo.create = AsyncMock()

    # 비밀번호 검증 mock
    with patch("app.services.auth.verify_password", return_value=True):
        response = await auth_service.login(request, ip_address="127.0.0.1")

    assert response.access_token is not None
    assert response.token_type == "bearer"
    assert response.expires_in > 0
    assert response.user.email == "admin@example.com"


@pytest.mark.asyncio
async def test_login_user_not_found(auth_service):
    """사용자 없음 테스트"""
    request = LoginRequest(username="notfound", password="password123")

    auth_service.user_repo.get_by_id = AsyncMock(return_value=None)
    auth_service.login_attempt_repo.count_failed_attempts = AsyncMock(return_value=0)
    auth_service.login_attempt_repo.record = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login(request, ip_address="127.0.0.1")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(auth_service):
    """비활성 계정 테스트"""
    user = User(
        id="user-123",
        email="inactive@example.com",
        password_hash="$2b$12$...",
        name="Inactive",
        role="viewer",
        is_active=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    request = LoginRequest(username="inactive", password="password123")

    auth_service.user_repo.get_by_id = AsyncMock(return_value=user)
    auth_service.login_attempt_repo.count_failed_attempts = AsyncMock(return_value=0)
    auth_service.login_attempt_repo.record = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login(request, ip_address="127.0.0.1")

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_login_too_many_attempts(auth_service):
    """로그인 시도 횟수 초과 테스트"""
    request = LoginRequest(username="bruteforce", password="password123")

    auth_service.login_attempt_repo.count_failed_attempts = AsyncMock(return_value=5)
    auth_service.login_attempt_repo.record = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login(request, ip_address="127.0.0.1")

    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_login_wrong_password(auth_service):
    """비밀번호 오류 테스트"""
    user = User(
        id="user-123",
        email="admin@example.com",
        password_hash="$2b$12$...",
        name="Admin",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    request = LoginRequest(username="admin", password="wrongpassword123")

    auth_service.user_repo.get_by_id = AsyncMock(return_value=user)
    auth_service.login_attempt_repo.count_failed_attempts = AsyncMock(return_value=0)
    auth_service.login_attempt_repo.record = AsyncMock()

    with patch("app.services.auth.verify_password", return_value=False):
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(request, ip_address="127.0.0.1")

    assert exc_info.value.status_code == 401
