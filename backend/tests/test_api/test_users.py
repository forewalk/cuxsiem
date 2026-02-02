"""사용자 관리 API 엔드포인트 테스트"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from datetime import datetime

from app.main import app
from app.schemas.user import UserResponse
from app.api.v1.deps import get_current_admin_user


@pytest.fixture
def mock_admin_user():
    return UserResponse(
        id="admin-123",
        email="admin@example.com",
        name="Admin",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        last_login_at=None
    )


@pytest.mark.asyncio
async def test_get_users_admin_only(mock_admin_user):
    """사용자 목록 조회 - 관리자 권한 확인"""
    # dependency_overrides 사용
    app.dependency_overrides[get_current_admin_user] = lambda: mock_admin_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.users.UserService") as MockUserService:
            mock_service = MockUserService.return_value
            mock_service.get_users = AsyncMock(return_value={
                "total": 1,
                "users": [mock_admin_user.model_dump()]
            })

            response = await client.get("/api/v1/users")

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert data["users"][0]["email"] == "admin@example.com"
    
    # 테스크 종료 후 초기화
    app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_create_user_success(mock_admin_user):
    """사용자 생성 성공 테스트"""
    app.dependency_overrides[get_current_admin_user] = lambda: mock_admin_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.users.UserService") as MockUserService:
            mock_service = MockUserService.return_value
            new_user_data = mock_admin_user.model_dump()
            new_user_data["email"] = "new@example.com"
            mock_service.create_user = AsyncMock(return_value=new_user_data)

            response = await client.post(
                "/api/v1/users",
                json={
                    "email": "new@example.com",
                    "name": "New User",
                    "password": "password123",
                    "role": "user",
                    "is_active": True
                }
            )

            assert response.status_code == 201
            data = response.json()
            assert data["email"] == "new@example.com"
    
    app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_update_user_success(mock_admin_user):
    """사용자 수정 성공 테스트"""
    app.dependency_overrides[get_current_admin_user] = lambda: mock_admin_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.users.UserService") as MockUserService:
            mock_service = MockUserService.return_value
            updated_user_data = mock_admin_user.model_dump()
            updated_user_data["name"] = "Updated Name"
            mock_service.update_user = AsyncMock(return_value=updated_user_data)

            response = await client.put(
                "/api/v1/users/admin-123",
                json={"name": "Updated Name"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Updated Name"
    
    app.dependency_overrides = {}


@pytest.mark.asyncio
async def test_delete_user_success(mock_admin_user):
    """사용자 삭제 성공 테스트"""
    app.dependency_overrides[get_current_admin_user] = lambda: mock_admin_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.endpoints.users.UserService") as MockUserService:
            mock_service = MockUserService.return_value
            mock_service.delete_user = AsyncMock()

            response = await client.delete("/api/v1/users/user-123")

            assert response.status_code == 204
    
    app.dependency_overrides = {}