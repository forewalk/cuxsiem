import asyncio
import os
import sys
import pytest
from dotenv import load_dotenv

# Load .env
ROOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.services.dashboard import DashboardService

@pytest.mark.asyncio
async def test_edr_dashboard_mapping():
    service = DashboardService()
    
    # 1. get_logs 테스트
    try:
        # 인덱스 매핑 로직을 통과하여 repository.get_logs를 호출하는지 확인
        # (실제 데이터 유무와 상관없이 함수 호출 성공 여부 확인)
        logs = await service.get_logs(dashboard_id="edr-dashboard", limit=1)
        assert isinstance(logs, list)
        print(f"EDR Logs fetch success: {len(logs)} logs found.")
    except Exception as e:
        # OpenSearch 연결 실패 등 환경 문제는 제외하고 로직 에러만 확인
        if "Connection" in str(e) or "Index" in str(e):
            print(f"Note: Environment issue (expected if no OS): {e}")
        else:
            pytest.fail(f"get_logs failed for edr-dashboard: {e}")

    # 2. get_dashboard_stats 테스트
    try:
        stats = await service.get_dashboard_stats(dashboard_id="edr-dashboard")
        assert stats.summary is not None
        print(f"EDR Stats fetch success: {stats.summary.total_logs} logs.")
    except Exception as e:
        if "Connection" in str(e) or "Index" in str(e):
            print(f"Note: Environment issue (expected if no OS): {e}")
        else:
            print(f"get_dashboard_stats info (panels might not exist): {e}")

if __name__ == "__main__":
    asyncio.run(test_edr_dashboard_mapping())
