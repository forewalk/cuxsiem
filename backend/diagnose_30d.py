import asyncio
import json
from app.repositories.dashboard import DashboardRepository

async def diagnose_30d():
    repo = DashboardRepository()
    print("--- Diagnosing Dashboard Stats (30 Days) ---")
    try:
        # 30일 조회 시뮬레이션
        raw_result = await repo.get_stats(from_value=30, from_unit="d")
        print(f"Total Hits: {raw_result.get('hits', {}).get('total', {}).get('value')}")
        print("\n--- Aggregations Result (Keys only) ---")
        print(list(raw_result.get('aggregations', {}).keys()))
    except Exception as e:
        print(f"Error during diagnosis: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose_30d())
