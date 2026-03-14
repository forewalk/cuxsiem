"""
스케줄러

주기적으로 실행되는 백그라운드 작업을 정의합니다.
- 잠긴 계정 자동 해제
"""

import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.repositories.user import UserRepository

logger = logging.getLogger(__name__)

# 스케줄러 인스턴스
scheduler = AsyncIOScheduler()


async def unlock_expired_accounts():
    """
    잠긴 계정 중 잠금 기간이 만료된 계정을 자동으로 해제합니다.
    """
    try:
        user_repo = UserRepository()
        locked_users = await user_repo.get_locked_accounts()

        now = datetime.utcnow()
        unlocked_count = 0

        for user in locked_users:
            # locked_until이 None이면 영구 잠금이므로 skip
            if user.locked_until is None:
                continue

            # 잠금 기간이 만료되었는지 확인
            if now >= user.locked_until:
                success = await user_repo.unlock_account(user.id)
                if success:
                    unlocked_count += 1
                    logger.info(f"계정 자동 잠금 해제: {user.id}")

        if unlocked_count > 0:
            logger.info(f"총 {unlocked_count}개 계정 잠금 해제 완료")

    except Exception as e:
        logger.error(f"계정 자동 잠금 해제 실패: {str(e)}", exc_info=True)


def start_scheduler():
    """스케줄러 시작"""
    if not scheduler.running:
        # 1분마다 잠긴 계정 체크
        scheduler.add_job(
            unlock_expired_accounts,
            trigger=IntervalTrigger(minutes=1),
            id="unlock_expired_accounts",
            name="잠긴 계정 자동 해제",
            replace_existing=True
        )

        scheduler.start()
        logger.info("스케줄러 시작됨")


def stop_scheduler():
    """스케줄러 중지"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("스케줄러 중지됨")
