"""인증 관련 Service"""
import uuid
from datetime import datetime

from fastapi import HTTPException, status

from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_token_hash
)
from app.models.user import User, Session
from app.repositories.user import UserRepository
from app.repositories.session import SessionRepository
from app.repositories.login_attempt import LoginAttemptRepository
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse


class AuthService:
    """인증 서비스"""

    def __init__(self):
        self.user_repo = UserRepository()
        self.session_repo = SessionRepository()
        self.login_attempt_repo = LoginAttemptRepository()

    async def login(self, request: LoginRequest, ip_address: str = None) -> LoginResponse:
        """로그인"""
        email = request.email.lower()

        # 로그인 실패 제한 확인 (5회/10분)
        failed_count = await self.login_attempt_repo.count_failed_attempts(email, minutes=10)
        if failed_count >= 5:
            await self.login_attempt_repo.record(
                email, False, ip_address, "로그인 시도 횟수 초과"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="로그인 시도 횟수 초과"
            )

        # 사용자 조회
        user = await self.user_repo.get_by_email(email)
        if not user:
            await self.login_attempt_repo.record(
                email, False, ip_address, "사용자 없음"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다"
            )

        # 비활성 계정 확인
        if not user.is_active:
            await self.login_attempt_repo.record(
                email, False, ip_address, "비활성 계정"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="계정이 비활성화되었습니다"
            )

        # 비밀번호 검증
        if not verify_password(request.password, user.password_hash):
            await self.login_attempt_repo.record(
                email, False, ip_address, "비밀번호 불일치"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다"
            )

        # 마지막 로그인 시간 업데이트
        await self.user_repo.update_last_login(user.id)

        # JWT 토큰 생성
        token, expires_in = create_access_token(user.id, request.remember_me)

        # 세션 생성
        from datetime import timedelta
        from app.core.config import settings

        expires_delta = timedelta(
            minutes=settings.JWT_EXPIRE_MINUTES_REMEMBER if request.remember_me
            else settings.JWT_EXPIRE_MINUTES
        )
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=get_token_hash(token),
            ip_address=ip_address,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + expires_delta,
            is_active=True,
        )
        await self.session_repo.create(session)

        # 로그인 성공 기록
        await self.login_attempt_repo.record(email, True, ip_address)

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
            )
        )

    async def logout(self, user_id: str, session_id: str) -> None:
        """로그아웃"""
        if session_id:
            await self.session_repo.invalidate(session_id)

    async def get_user(self, user_id: str) -> UserResponse:
        """사용자 정보 조회"""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )