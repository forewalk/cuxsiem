"""API Dependencies"""
from fastapi import WebSocket, HTTPException, status, Query
from app.core.security import decode_access_token
from app.services.auth import AuthService
import logging

logger = logging.getLogger(__name__)


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token")
) -> dict:
    """
    WebSocket 연결을 위한 사용자 인증
    
    Args:
        websocket: WebSocket 연결
        token: JWT 토큰 (쿼리 파라미터)
    
    Returns:
        사용자 정보 딕셔너리
    
    Raises:
        HTTPException: 인증 실패 시
    """
    try:
        # JWT 토큰 검증
        user_id = decode_access_token(token)
        
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 유효하지 않습니다"
            )
        
        # 사용자 정보 조회
        service = AuthService()
        user = await service.get_user(user_id)
        
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="사용자를 찾을 수 없습니다"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다"
        )
