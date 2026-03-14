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
from app.services.advanced_settings import advanced_settings_service
from app.services.password_policy import PasswordPolicyService


class AuthService:
    """인증 서비스"""

    def __init__(self):
        self.user_repo = UserRepository()
        self.session_repo = SessionRepository()
        self.login_attempt_repo = LoginAttemptRepository()
        self.password_policy_service = PasswordPolicyService()

    async def login(self, request: LoginRequest, ip_address: str = None, force: bool = False) -> LoginResponse:
        """로그인"""
        from datetime import timedelta

        # 사용자 ID로 로그인
        username = request.username

        # 비밀번호 정책 조회
        policy = await self.password_policy_service.get_current_policy()
        lockout_threshold = policy.lockout_threshold
        lockout_duration = policy.lockout_duration_minutes

        # 사용자 조회 (ID로 조회)
        user = await self.user_repo.get_by_id(username)
        if not user:
            await self.login_attempt_repo.record(
                username, False, ip_address, "사용자 없음"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="아이디 또는 비밀번호가 올바르지 않습니다"
            )

        # 계정 잠금 확인
        if not user.is_active and user.locked_until:
            # 잠금 해제 시간 확인
            if user.locked_until and datetime.utcnow() >= user.locked_until:
                # 자동 잠금 해제
                await self.user_repo.unlock_account(user.id)
                user.is_active = True
                user.locked_until = None
            else:
                # 아직 잠금 중
                await self.login_attempt_repo.record(
                    username, False, ip_address, "계정 잠금"
                )
                if user.locked_until:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"계정이 잠겼습니다. {user.locked_until.strftime('%Y-%m-%d %H:%M:%S')}까지 로그인할 수 없습니다."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="계정이 영구 잠겼습니다. 관리자에게 문의하세요."
                    )

        # 비활성 계정 확인 (일반 비활성화)
        if not user.is_active:
            await self.login_attempt_repo.record(
                username, False, ip_address, "비활성 계정"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="계정이 비활성화되었습니다"
            )

        # 비밀번호 검증
        if not verify_password(request.password, user.password_hash):
            await self.login_attempt_repo.record(
                username, False, ip_address, "비밀번호 불일치"
            )

            # 로그인 실패 횟수 확인
            failed_count = await self.login_attempt_repo.count_failed_attempts(username, minutes=lockout_duration)

            if failed_count >= lockout_threshold:
                # 계정 잠금
                if lockout_duration == 0:
                    # 영구 잠금
                    await self.user_repo.lock_account(user.id, None)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="로그인 실패 횟수 초과로 계정이 영구 잠겼습니다. 관리자에게 문의하세요."
                    )
                else:
                    # 일시 잠금
                    lock_until = datetime.utcnow() + timedelta(minutes=lockout_duration)
                    await self.user_repo.lock_account(user.id, lock_until)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"로그인 실패 횟수 초과로 계정이 잠겼습니다. {lock_until.strftime('%Y-%m-%d %H:%M:%S')}까지 로그인할 수 없습니다."
                    )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="아이디 또는 비밀번호가 올바르지 않습니다"
            )

        # 다중 접속 허용 여부 체크
        settings = await advanced_settings_service.get_settings()

        # 만료된 세션 정리 (이전 서버 실행 시 남은 쓰레기 세션 제거)
        await self.session_repo.cleanup_expired_sessions(user.id)

        if not settings.allow_multiple_sessions and not force:
            active_sessions = await self.session_repo.get_active_sessions_by_user_id(user.id)

            if active_sessions:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="MULTIPLE_SESSION_DETECTED"
                )

        # 강제 로그인이면 기존 유효한 세션들 무효화
        if force:
            active_sessions = await self.session_repo.get_active_sessions_by_user_id(user.id)
            for s in active_sessions:
                await self.session_repo.invalidate(s.id)
            
            # 기존 사용자(웹소켓)에게 로그아웃 알림 전송
            from app.core.websocket import manager
            await manager.send_to_user(user.id, {
                "type": "force_logout", 
                "message": "다중 접속으로 인해 로그아웃되었습니다."
            })

        # 마지막 로그인 시간 업데이트
        await self.user_repo.update_last_login(user.id)

        # JWT 토큰 생성
        token, expires_in = create_access_token(user.id, request.remember_me)

        # 세션 생성 (고급설정의 session_duration 적용)
        from datetime import timedelta
        from app.core.config import settings as app_config

        session_duration_min = getattr(settings, 'session_duration', 30) or 30
        if request.remember_me:
            expires_delta = timedelta(minutes=app_config.JWT_EXPIRE_MINUTES_REMEMBER)
        else:
            expires_delta = timedelta(minutes=session_duration_min)
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
        await self.login_attempt_repo.record(username, True, ip_address)

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse(
                id=user.id,
                username=user.id,  # username은 id와 동일
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
            username=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            otp_enabled=user.otp_enabled or False,
        )

    async def reset_password(self, username: str) -> str:
        """비밀번호 초기화 (임시 비밀번호 발급)"""
        import secrets
        import string
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Attempting to reset password for user: {username}")

        try:
            # 사용자 조회 (ID로 검색)
            user = await self.user_repo.get_by_id(username)
            if not user:
                logger.warning(f"User not found: {username}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="사용자를 찾을 수 없습니다"
                )
                
            # 임시 비밀번호 생성 (12자리 영문+숫자+특수문자, 반드시 숫자 1개 + 특수문자 1개 포함)
            special_chars = "!@#$%^&*[]()"
            alphabet = string.ascii_letters + string.digits + special_chars
            while True:
                temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
                has_digit = any(c in string.digits for c in temp_password)
                has_special = any(c in special_chars for c in temp_password)
                if has_digit and has_special:
                    break
            
            # 비밀번호 업데이트
            hashed_password = get_password_hash(temp_password)
            updated = await self.user_repo.update(user.id, {"password_hash": hashed_password})
            
            if not updated:
                logger.error(f"Failed to update password in repository for user: {username}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="비밀번호 업데이트 실패"
                )
                
            logger.info(f"Successfully reset password for user: {username}")
            return temp_password
        except Exception as e:
            logger.exception(f"Unexpected error during password reset for {username}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"비밀번호 초기화 중 오류 발생: {str(e)}"
            )