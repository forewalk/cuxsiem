from typing import List, Dict
from fastapi import APIRouter, Depends, Query
from app.api.v1.deps import get_current_admin_user
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

@router.get("/", response_model=List[Dict])
async def list_action_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """액션 실행 히스토리 목록 조회"""
    if not service.history_repository:
        return []
    return await service.history_repository.get_all(skip, limit)

@router.get("/{history_id}", response_model=Dict)
async def get_action_history(
    history_id: str,
    current_user: UserResponse = Depends(get_current_admin_user),
    service: ActionService = Depends(get_action_service)
):
    """액션 실행 히스토리 상세 조회"""
    if not service.history_repository:
        return {}
    return await service.history_repository.get_by_id(history_id)
