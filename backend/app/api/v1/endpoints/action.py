from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.v1.deps import get_current_admin_user
from app.schemas.action import ActionCreate, ActionUpdate, ActionResponse
from app.schemas.user import UserResponse
from app.services.action import ActionService
from app.repositories.action import ActionRepository
from app.repositories.action_history import ActionHistoryRepository
from app.core.opensearch import get_opensearch_client

router = APIRouter()

def get_action_service():
    client = get_opensearch_client()
    repository = ActionRepository(client)
    history_repository = ActionHistoryRepository(client)
    return ActionService(repository, history_repository)

@router.post("/", response_model=str, status_code=status.HTTP_201_CREATED)
async def create_action(
    action: ActionCreate,
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """새로운 API 액션 생성"""
    action.user_id = current_user.id
    try:
        return await service.create_action(action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[ActionResponse])
async def list_actions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """API 액션 목록 조회"""
    return await service.get_actions(skip, limit)

@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(
    action_id: str,
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """특정 API 액션 상세 조회"""
    action = await service.get_action(action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    return action

@router.put("/{action_id}", response_model=bool)
async def update_action(
    action_id: str,
    action_update: ActionUpdate,
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """API 액션 수정"""
    success = await service.update_action(action_id, action_update)
    if not success:
        raise HTTPException(status_code=404, detail="Action not found or update failed")
    return success

@router.delete("/{action_id}", response_model=bool)
async def delete_action(
    action_id: str,
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """API 액션 삭제 (Soft Delete)"""
    success = await service.delete_action(action_id)
    if not success:
        raise HTTPException(status_code=404, detail="Action not found or delete failed")
    return success

@router.post("/{action_id}/execute/", response_model=Dict)
async def execute_action(
    action_id: str,
    logs: List[Dict],
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """API 액션 실행 (선택된 로그 데이터들에 대해)"""
    return await service.execute_action(
        action_id, 
        logs, 
        user_id=current_user.id, 
        user_name=current_user.name
    )
