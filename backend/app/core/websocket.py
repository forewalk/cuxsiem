from typing import List, Dict
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """WebSocket 연결 수락 및 저장"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: user_id={user_id}, total_connections={len(self.active_connections[user_id])}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """WebSocket 연결 제거"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"WebSocket disconnected: user_id={user_id}, remaining={len(self.active_connections[user_id])}")
            
            # 사용자의 모든 연결이 끊어지면 삭제
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_to_user(self, user_id: str, message: dict):
        """특정 사용자의 모든 연결에 메시지 전송"""
        if user_id not in self.active_connections:
            return
        
        # 연결이 끊어진 웹소켓 추적
        dead_connections = []
        
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                dead_connections.append(connection)
        
        # 죽은 연결 제거
        for dead in dead_connections:
            self.disconnect(dead, user_id)
    
    async def send_to_roles(self, roles: List[str], message: dict):
        """특정 역할을 가진 모든 사용자에게 메시지 전송"""
        # TODO: 역할 기반 전송 (user_id -> role 매핑 필요)
        # 현재는 모든 연결에 전송 (간단 구현)
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)
    
    async def broadcast(self, message: dict):
        """모든 연결에 메시지 브로드캐스트"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message)
    
    def get_connection_count(self) -> int:
        """전체 활성 연결 수 반환"""
        return sum(len(connections) for connections in self.active_connections.values())


# 전역 ConnectionManager 인스턴스
manager = ConnectionManager()
