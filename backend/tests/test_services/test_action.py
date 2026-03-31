import pytest
from unittest.mock import MagicMock, AsyncMock
from app.services.action import ActionService
from app.schemas.action import ActionCreate, TargetHost, ActionLogic
from app.repositories.action import ActionRepository

@pytest.fixture
def mock_repository():
    return MagicMock(spec=ActionRepository)

@pytest.fixture
def action_service(mock_repository):
    return ActionService(mock_repository)

@pytest.mark.asyncio
async def test_create_action_duplicate_name_fails(action_service, mock_repository):
    # 동일한 이름의 액션 데이터 준비
    action_data = ActionCreate(
        name="중복된 API 이름",
        description="테스트 설명",
        target_host=TargetHost(url="http://localhost", port=8080, path="/api/test"),
        action_logic=ActionLogic(dsl="{}", type="webhook")
    )
    
    # 이미 존재한다고 가정 (get_by_name이 값을 반환)
    mock_repository.get_by_name = AsyncMock(return_value={"id": "existing_id", "name": "중복된 API 이름"})
    
    # 생성 시도 시 ValueError 발생해야 함
    with pytest.raises(ValueError) as excinfo:
        await action_service.create_action(action_data)
    
    assert "already exists" in str(excinfo.value)
    mock_repository.create.assert_not_called()

@pytest.mark.asyncio
async def test_create_action_success(action_service, mock_repository):
    # 새로운 이름의 액션 데이터
    action_data = ActionCreate(
        name="새로운 API 이름",
        description="테스트 설명",
        target_host=TargetHost(url="http://localhost", port=8080, path="/api/test"),
        action_logic=ActionLogic(dsl="{}", type="webhook")
    )
    
    # 존재하지 않는다고 가정
    mock_repository.get_by_name = AsyncMock(return_value=None)
    mock_repository.create = AsyncMock(return_value="new_id")
    
    # 생성 시도
    result = await action_service.create_action(action_data)
    
    assert result == "new_id"
    mock_repository.create.assert_called_once_with(action_data)
