import logging
import asyncio
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

            tasks = []
            for rule in rules:
                if not rule.get("is_active"):
                    continue

                # TODO: 여기에 규칙별 interval_min을 체크하여 실행 시점을 결정하는 로직을 넣을 수 있습니다.
                # 현재는 스케줄러가 호출될 때마다 모든 활성 규칙을 실행합니다.
                tasks.append(self.service.run_detection_for_rule(rule))

            if tasks:
                logger.info(f"Running detection for {len(tasks)} active rules...")
                await asyncio.gather(*tasks)

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
            logger.info("Detection Scheduler started (Interval: 1 min)")

    def stop(self):
        """스케줄러 종료"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Detection Scheduler stopped")

# 싱글톤 인스턴스
detection_scheduler = DetectionScheduler()
