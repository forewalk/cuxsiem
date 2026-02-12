import asyncio
import json
from datetime import datetime, timedelta
from app.repositories.dashboard import DashboardRepository

async def diagnose():
    repo = DashboardRepository()
    # 최근 15분 데이터 조회 시뮬레이션
    print("--- Diagnosing Dashboard Stats ---")
    try:
        # q="" (검색어 없음), 15분 전 조건
        raw_result = await repo.get_stats(from_value=15, from_unit="m")
        
        print(f"Total Hits: {raw_result.get('hits', {}).get('total', {}).get('value')}")
        print("\n--- Aggregations Result ---")
        print(json.dumps(raw_result.get('aggregations', {}), indent=2))
        
        if raw_result.get('hits', {}).get('total', {}).get('value') == 0:
            print("\n[WARNING] No documents found. Checking if index exists and has data...")
            # 인덱스 전체 데이터 1건 확인
            sample = repo.client.search(index=repo.fixed_index, body={"size": 1})
            if sample['hits']['hits']:
                print("Sample Document Found! Check if @timestamp field exists in your data:")
                print(json.dumps(sample['hits']['hits'][0]['_source'], indent=2))
            else:
                print("Index is empty.")
                
    except Exception as e:
        print(f"Error during diagnosis: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose())
