import logging
import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.notification import NotificationService

logger = logging.getLogger(__name__)

class DetectionScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.service = NotificationService()

    async def run_active_detections(self):
        """활성화된 모든 알림 규칙을 조회하여 탐지 로직을 실행함"""
        try:
            # 모든 규칙 조회 (실제 운영 시에는 활성화된 것만 필터링하는 레포지토리 메서드 사용 권장)
            total, rules = await self.service.list_rules(limit=1000)

            now = datetime.utcnow()
            tasks = []

            for rule in rules:
                if not rule.get("is_active"):
                    continue

                # 규칙별 interval_min을 체크하여 실행 시점 결정
                interval_min = rule["interval_min"]  # 필수 필드 (스키마에서 검증됨)
                last_run_at = rule.get("last_run_at")

                # 마지막 실행 시각이 없거나, interval_min이 지났으면 실행
                should_run = False
                if not last_run_at:
                    should_run = True
                    logger.debug(f"Rule {rule.get('name')} has no last_run_at, scheduling...")
                else:
                    try:
                        # ISO 형식 문자열을 datetime으로 변환
                        last_run_dt = datetime.fromisoformat(last_run_at.replace('Z', '+00:00'))
                        elapsed_minutes = (now - last_run_dt).total_seconds() / 60

                        if elapsed_minutes >= interval_min:
                            should_run = True
                            logger.debug(f"Rule {rule.get('name')} elapsed {elapsed_minutes:.1f}min >= {interval_min}min, scheduling...")
                        else:
                            logger.debug(f"Rule {rule.get('name')} elapsed {elapsed_minutes:.1f}min < {interval_min}min, skipping...")
                    except Exception as e:
                        logger.warning(f"Error parsing last_run_at for rule {rule.get('id')}: {e}")
                        should_run = True

                if should_run:
                    tasks.append(self.service.run_detection_for_rule(rule))

            if tasks:
                logger.info(f"Running detection for {len(tasks)} active rules...")
                await asyncio.gather(*tasks)
            else:
                logger.debug("No rules to run at this time.")

        except Exception as e:
            logger.error(f"Error in scheduler task: {e}")

    def start(self):
        if not self.scheduler.running:
            self.scheduler.add_job(
                self.run_active_detections,
                "interval",
                minutes=1,
                id="detection_job",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=30
            )
            self.scheduler.start()
            logger.info("Detection Scheduler started (Check Interval: 1 min)")

    def stop(self):
        """스케줄러 종료"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Detection Scheduler stopped")

# 싱글톤 인스턴스
detection_scheduler = DetectionScheduler()
