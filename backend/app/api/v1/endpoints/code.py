from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.code import CodeResponse, CodeUpdate
from app.services.code import code_service

router = APIRouter()

@router.get("", response_model=List[CodeResponse])
async def get_role_codes():
    """역할명 코드 목록 조회"""
    return await code_service.get_role_codes()

@router.put("/{code_id}", response_model=CodeResponse)
async def update_role_code(code_id: str, update_data: CodeUpdate):
    """역할명 코드 업데이트"""
    return await code_service.update_role_code(code_id, update_data.code_name)
