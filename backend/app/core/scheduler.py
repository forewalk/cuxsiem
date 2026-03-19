import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from opensearchpy.exceptions import NotFoundError

from app.services.notification import NotificationService
from app.services.detection_policy import DetectionPolicyService
from app.repositories.session import SessionRepository
from app.services.advanced_settings import advanced_settings_service

logger = logging.getLogger("uvicorn.error")


class DetectionScheduler:
    MAX_CONCURRENT_DETECTORS = 50

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.service = NotificationService()
        self.detection_policy_service = DetectionPolicyService()
        self.session_repo = SessionRepository()
        self.max_concurrent_detectors = self.MAX_CONCURRENT_DETECTORS

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

    async def run_active_detection_policies(self):
        """활성화된 모든 Detector를 조회하여 탐지 로직을 실행함 (동시 실행 50개 제한)"""
        try:
            total, detectors = await self.detection_policy_service.list_detectors(limit=1000, is_active=True)

            now = datetime.now(timezone.utc)
            targets = []

            for detector in detectors:
                if not detector.get("is_active"):
                    continue

                interval_min = detector.get("schedule_interval_min")
                if interval_min is None:
                    continue

                last_run_at = detector.get("last_run_at")
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
                    targets.append(detector)

            if targets:
                sem = asyncio.Semaphore(self.max_concurrent_detectors)

                async def _run_with_sem(det):
                    async with sem:
                        try:
                            return await self.detection_policy_service.run_detection_for_detector(det)
                        except Exception as e:
                            logger.error(f"[스케줄러] Detector {det.get('id')} 실행 오류: {e}")
                            return None

                await asyncio.gather(*[_run_with_sem(d) for d in targets])

        except NotFoundError:
            logger.debug("[스케줄러] cs_detection_policies 인덱스 미존재 — Detector 스킵")
        except Exception as e:
            logger.error(f"[스케줄러] Detector 탐지 오류: {e}", exc_info=True)

    async def expire_idle_sessions(self):
        """무활동 세션 만료 처리 (슬라이딩 세션)"""
        try:
            settings = await advanced_settings_service.get_settings()
            idle_timeout = getattr(settings, 'session_idle_timeout', 0) or 0
            if idle_timeout > 0:
                count = await self.session_repo.expire_idle_sessions(idle_timeout)
                if count > 0:
                    logger.info(f"[스케줄러] 무활동 세션 {count}개 만료 처리")
        except Exception as e:
            logger.error(f"[스케줄러] 무활동 세션 만료 오류: {e}", exc_info=True)

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
            self.scheduler.add_job(
                self.run_active_detection_policies,
                "interval",
                minutes=1,
                id="detection_policy_job",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=30
            )
            self.scheduler.add_job(
                self.expire_idle_sessions,
                "interval",
                minutes=1,
                id="idle_session_job",
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
