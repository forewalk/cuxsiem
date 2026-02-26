import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.notification import NotificationService

# uvicorn 로거 사용 (콘솔 출력을 위해)
logger = logging.getLogger("uvicorn.error")


class DetectionScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.service = NotificationService()

    async def run_active_detections(self):
        """활성화된 모든 알림 규칙을 조회하여 탐지 로직을 실행함"""
        try:
            # 모든 규칙 조회
            total, rules = await self.service.list_rules(limit=1000)
            
            active_rules = [r for r in rules if r.get("is_active")]
            logger.info(f"[스케줄러] 전체 {total}개 규칙 중 {len(active_rules)}개 활성화됨")

            now = datetime.utcnow()
            tasks = []

            for rule in rules:
                if not rule.get("is_active"):
                    logger.info(f"[스케줄러] 비활성 규칙 건너뜀: {rule.get('name')}")
                    continue

                # 규칙별 interval_min을 체크하여 실행 시점 결정
                interval_min = rule.get("interval_min")
                if interval_min is None:
                    logger.warning(f"[스케줄러] 규칙 '{rule.get('name')}' (ID: {rule.get('id')})에 interval_min 필드가 없습니다. 규칙을 건너뜁니다.")
                    continue
                    
                last_run_at = rule.get("last_run_at")

                # 마지막 실행 시각이 없거나, interval_min이 지났으면 실행
                should_run = False
                if not last_run_at:
                    should_run = True
                    logger.info(f"[스케줄러] 규칙 '{rule.get('name')}' 최초 실행, 즉시 스케줄링")
                else:
                    try:
                        # ISO 형식 문자열을 datetime으로 변환
                        last_run_dt = datetime.fromisoformat(last_run_at.replace('Z', '+00:00'))
                        elapsed_minutes = (now - last_run_dt).total_seconds() / 60

                        if elapsed_minutes >= interval_min:
                            should_run = True
                            logger.info(
                                f"[스케줄러] 규칙 '{rule.get('name')}' 경과시간 {elapsed_minutes:.1f}분 >= 설정주기 {interval_min}분, 실행 예정")
                        else:
                            logger.info(
                                f"[스케줄러] 규칙 '{rule.get('name')}' 경과시간 {elapsed_minutes:.1f}분 < 설정주기 {interval_min}분, 건너뜀")
                    except Exception as e:
                        logger.warning(f"규칙 {rule.get('id')}의 마지막 실행시각 파싱 오류: {e}")
                        should_run = True

                if should_run:
                    tasks.append(self.service.run_detection_for_rule(rule))

            if tasks:
                logger.info(f"[스케줄러] {len(tasks)}개 활성 규칙 탐지 시작...")
                await asyncio.gather(*tasks)
            else:
                logger.info("[스케줄러] 실행할 규칙 없음")

        except Exception as e:
            logger.error(f"[스케줄러] 스케줄러 태스크 오류: {e}", exc_info=True)

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
            logger.info("=" * 60)
            logger.info("[스케줄러] 알림 탐지 스케줄러 시작됨 - 1분마다 실행")
            logger.info("=" * 60)

    def stop(self):
        """스케줄러 종료"""
        if self.scheduler.running:
            logger.info("[스케줄러] 알림 탐지 스케줄러 종료 중...")
            self.scheduler.shutdown()
            logger.info("[스케줄러] 알림 탐지 스케줄러 종료됨")


# 싱글톤 인스턴스
detection_scheduler = DetectionScheduler()
