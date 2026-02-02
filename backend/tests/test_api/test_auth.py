"""인증 API 엔드포인트 테스트"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.mark.asyncio
async def test_login_endpoint_success():
    """로그인 엔드포인트 성공 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock AuthService.login
        with patch("app.api.v1.endpoints.auth.AuthService") as MockAuthService:
            mock_service = MockAuthService.return_value
            mock_service.login = AsyncMock(return_value={
                "access_token": "test-token",
                "token_type": "bearer",
                "expires_in": 86400,
                "user": {
                    "id": "user-123",
                    "email": "admin@example.com",
                    "name": "Admin",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2026-01-30T00:00:00",
                    "last_login_at": None,
                }
            })

            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": "admin@example.com",
                    "password": "password123",
                    "remember_me": False,
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["access_token"] == "test-token"
            assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_endpoint_invalid_email():
    """유효하지 않은 이메일 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "password123",
                "remember_me": False,
            }
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_login_endpoint_short_password():
    """비밀번호 길이 부족 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "short",  # 8자 미만
                "remember_me": False,
            }
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_login_endpoint_no_digit_password():
    """숫자 없는 비밀번호 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "passwordabc",  # 숫자 없음
                "remember_me": False,
            }
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_logout_endpoint():
    """로그아웃 엔드포인트 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.auth.decode_access_token", return_value="user-123"):
            with patch("app.api.v1.endpoints.auth.AuthService") as MockAuthService:
                mock_service = MockAuthService.return_value
                mock_service.logout = AsyncMock()

                response = await client.post(
                    "/api/v1/auth/logout",
                    headers={"Authorization": "Bearer test-token"}
                )

                assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_me_endpoint():
    """현재 사용자 정보 조회 테스트"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.auth.decode_access_token", return_value="user-123"):
            with patch("app.api.v1.endpoints.auth.AuthService") as MockAuthService:
                mock_service = MockAuthService.return_value
                mock_service.get_user = AsyncMock(return_value={
                    "id": "user-123",
                    "email": "admin@example.com",
                    "name": "Admin",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2026-01-30T00:00:00",
                    "last_login_at": None,
                })

                response = await client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": "Bearer test-token"}
                )

                assert response.status_code == 200
                data = response.json()
                assert data["email"] == "admin@example.com"
