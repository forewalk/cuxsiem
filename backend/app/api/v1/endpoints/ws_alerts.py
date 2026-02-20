from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket import manager
from app.core.security import decode_access_token
from app.services.auth import AuthService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/alerts")
async def websocket_alerts(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    알림 WebSocket 엔드포인트
    
    - 실시간 알림 수신
    - JWT 토큰 인증 필요 (쿼리 파라미터: ?token=xxx)
    - 자동 재연결 지원
    """
    # 먼저 연결 수락
    await websocket.accept()
    
    try:
        # JWT 토큰 검증
        user_id = decode_access_token(token)
        
        if not user_id:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid token"
            })
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # 사용자 정보 조회
        service = AuthService()
        try:
            user = await service.get_user(user_id)
            user_email = user.email
        except Exception as e:
            logger.error(f"Failed to get user info: {e}")
            await websocket.send_json({
                "type": "error",
                "message": "User not found"
            })
            await websocket.close(code=1008, reason="User not found")
            return
        
        logger.info(f"WebSocket connected: user={user_email}, user_id={user_id}")
        
        # ConnectionManager에 등록
        manager.active_connections[user_id] = manager.active_connections.get(user_id, [])
        manager.active_connections[user_id].append(websocket)
        
        # 연결 성공 메시지 전송
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": f"WebSocket connected for user {user_email}"
        })
        
        # 연결 유지 (클라이언트로부터 메시지 대기)
        while True:
            data = await websocket.receive_text()
            
            # ping에 대한 pong 응답
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_email}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    
    finally:
        # 연결 정리
        if user_id and user_id in manager.active_connections:
            if websocket in manager.active_connections[user_id]:
                manager.active_connections[user_id].remove(websocket)
            if not manager.active_connections[user_id]:
                del manager.active_connections[user_id]
