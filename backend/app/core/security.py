"""보안 관련 유틸리티 (비밀번호 해싱, JWT 토큰 관리)"""
from datetime import datetime, timedelta
from typing import Optional

import hashlib
import hmac
import bcrypt

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

from app.core.config import settings

# HTTP Bearer 토큰 인증
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호 비교"""
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """비밀번호를 해싱하여 반환"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()


def create_access_token(user_id: str, remember_me: bool = False) -> tuple[str, int]:
    """
    JWT 액세스 토큰 생성

    Args:
        user_id: 사용자 ID
        remember_me: 장기 토큰 발급 여부

    Returns:
        (token, expires_in_seconds) 튜플
    """
    expire_minutes = (
        settings.JWT_EXPIRE_MINUTES_REMEMBER
        if remember_me
        else settings.JWT_EXPIRE_MINUTES
    )

    expires_delta = timedelta(minutes=expire_minutes)
    expire = datetime.utcnow() + expires_delta

    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    expires_in_seconds = int(expires_delta.total_seconds())
    return encoded_jwt, expires_in_seconds


def decode_access_token(token: str) -> Optional[str]:
    """
    JWT 토큰을 디코딩하고 user_id 반환

    Args:
        token: JWT 토큰 문자열

    Returns:
        user_id 또는 None (유효하지 않은 경우)
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


def get_token_hash(token: str) -> str:
    """
    토큰의 SHA256 해시 생성 (데이터베이스 저장용)

    Args:
        token: JWT 토큰 문자열

    Returns:
        SHA256 해시 문자열
    """
    return hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(credentials = Depends(security)) -> str:
    """
    HTTP Bearer 토큰에서 현재 사용자 ID 추출

    Args:
        credentials: HTTP Bearer 토큰 자격증명

    Returns:
        user_id

    Raises:
        HTTPException: 토큰이 유효하지 않은 경우
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 세션 유효성 검사 추가 (강제 로그아웃/다중접속 차단 반영)
    from app.repositories.session import SessionRepository
    session_repo = SessionRepository()
    token_hash = get_token_hash(token)
    
    session = await session_repo.get_by_token_hash(token_hash)
    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었거나 다른 기기에서 접속하여 로그아웃되었습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 슬라이딩 세션: 무활동 만료 체크 및 last_active_at 갱신
    from app.services.advanced_settings import advanced_settings_service
    settings = await advanced_settings_service.get_settings()
    idle_timeout = getattr(settings, 'session_idle_timeout', 0) or 0

    if idle_timeout > 0:
        from datetime import timedelta
        now = datetime.utcnow()
        last_active = session.last_active_at or session.created_at
        if last_active and (now - last_active) > timedelta(minutes=idle_timeout):
            await session_repo.invalidate(session.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="무활동으로 인해 세션이 만료되었습니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # 1분 이상 지났을 때만 갱신 (OpenSearch 쓰기 빈도 제한)
        if not last_active or (now - last_active) > timedelta(minutes=1):
            await session_repo.update_last_active(session.id)

    return user_id
