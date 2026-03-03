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
    token: str = Query(None)
):
    """
    알림 WebSocket 엔드포인트
    
    - 실시간 알림 수신
    - JWT 토큰 인증 필요
      1. Sec-WebSocket-Protocol 헤더 (권장)
      2. token 쿼리 파라미터 (하위 호환)
    - 자동 재연결 지원
    """
    # Sec-WebSocket-Protocol 헤더에서 토큰 추출 시도
    protocol_token = None
    requested_protocols = websocket.headers.get("Sec-WebSocket-Protocol")
    if requested_protocols:
        # 프로토콜 리스트 중 첫 번째를 토큰으로 간주 (프론트엔드 설정에 맞춤)
        protocol_token = requested_protocols.split(",")[0].strip()
    
    # 쿼리 파라미터보다 헤더 토큰 우선
    final_token = protocol_token or token
    
    if not final_token:
        # 연결 수락 전 거부 가능하면 좋지만, FastAPI WebSocket은 accept 후 로직 처리가 일반적
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Token missing"})
        await websocket.close(code=1008)
        return

    # Sec-WebSocket-Protocol을 사용한 경우, 동일한 프로토콜로 응답해야 연결이 성립됨
    if protocol_token:
        await websocket.accept(subprotocol=protocol_token)
    else:
        await websocket.accept()
    
    user_id = None
    try:
        # JWT 토큰 검증
        user_id = decode_access_token(final_token)
        
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
        
        
        # ConnectionManager에 등록 (role 포함)
        user_role = user.role if hasattr(user, 'role') else 'role-4'
        if user_id not in manager.active_connections:
            manager.active_connections[user_id] = []
        manager.active_connections[user_id].append(websocket)
        manager.user_roles[user_id] = user_role
        
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
            
    except (WebSocketDisconnect, Exception):
        pass
    
    finally:
        # 연결 정리
        if user_id and user_id in manager.active_connections:
            if websocket in manager.active_connections[user_id]:
                manager.active_connections[user_id].remove(websocket)
            if not manager.active_connections[user_id]:
                del manager.active_connections[user_id]
                manager.user_roles.pop(user_id, None)
