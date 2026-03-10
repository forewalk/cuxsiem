import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.notification import NotificationService

logger = logging.getLogger("uvicorn.error")


class DetectionScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.service = NotificationService()

    async def run_active_detections(self):
        """활성화된 모든 알림 규칙을 조회하여 탐지 로직을 실행함"""
        try:
            total, rules = await self.service.list_rules(limit=1000)

            now = datetime.now(timezone.utc)
            tasks = []

            for rule in rules:
                if not rule.get("is_active"):
                    continue

                interval_min = rule.get("interval_min")
                if interval_min is None:
                    continue

                last_run_at = rule.get("last_run_at")

                should_run = False
                if not last_run_at:
                    should_run = True
                else:
                    try:
                        last_run_dt = datetime.fromisoformat(last_run_at.replace('Z', '+00:00'))
                        if last_run_dt.tzinfo is None:
                            last_run_dt = last_run_dt.replace(tzinfo=timezone.utc)
                        elapsed_minutes = (now - last_run_dt).total_seconds() / 60
                        if elapsed_minutes >= interval_min:
                            should_run = True
                    except Exception:
                        should_run = True

                if should_run:
                    tasks.append(self.service.run_detection_for_rule(rule))

            if tasks:
                await asyncio.gather(*tasks)

        except Exception as e:
            logger.error(f"[스케줄러] 오류: {e}", exc_info=True)

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

    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown()


# 싱글톤 인스턴스
detection_scheduler = DetectionScheduler()
