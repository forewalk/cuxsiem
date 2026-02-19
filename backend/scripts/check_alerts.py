"""
알림 내역 (cs_alerts) 확인 스크립트
- 저장된 알림 개수 확인
- 최근 알림 샘플 출력
- receiver 필드 구조 확인
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.opensearch import get_opensearch_client
import json

def check_alerts():
    client = get_opensearch_client()
    
    print("=" * 80)
    print("📊 알림 내역 (cs_alerts) 현황")
    print("=" * 80)
    
    # 1. 인덱스 존재 확인
    if not client.indices.exists(index="cs_alerts"):
        print("❌ cs_alerts 인덱스가 존재하지 않습니다!")
        return
    
    print("✅ cs_alerts 인덱스 존재\n")
    
    # 2. 전체 알림 개수 확인
    total_result = client.count(index="cs_alerts", body={"query": {"match_all": {}}})
    total_count = total_result["count"]
    print(f"📈 전체 알림 개수: {total_count}개\n")
    
    if total_count == 0:
        print("⚠️  알림 데이터가 없습니다!")
        print("\n가능한 원인:")
        print("  1. 스케줄러가 실행되지 않음")
        print("  2. 알림 규칙이 비활성화 상태")
        print("  3. 규칙의 조건이 매칭되지 않음")
        print("  4. target_index에 데이터가 없음")
        return
    
    # 3. 최근 알림 5개 조회
    recent_alerts = client.search(
        index="cs_alerts",
        body={
            "size": 5,
            "sort": [{"created_at": {"order": "desc"}}],
            "query": {"match_all": {}}
        }
    )
    
    print("=" * 80)
    print("📋 최근 알림 5개")
    print("=" * 80)
    
    for i, hit in enumerate(recent_alerts["hits"]["hits"], 1):
        alert = hit["_source"]
        print(f"\n[{i}] Alert ID: {alert.get('id', 'N/A')}")
        print(f"    규칙명: {alert.get('rule_name', 'N/A')}")
        print(f"    심각도: {alert.get('severity', 'N/A')}")
        print(f"    메시지: {alert.get('message', 'N/A')[:100]}...")
        print(f"    생성시간: {alert.get('created_at', 'N/A')}")
        print(f"    수신자(receiver): {json.dumps(alert.get('receiver'), ensure_ascii=False, indent=2)}")
        print(f"    이벤트 인덱스: {alert.get('event_index', 'N/A')}")
        print(f"    상태: {alert.get('status', 'N/A')}")
    
    # 4. 역할별 알림 개수 확인
    print("\n" + "=" * 80)
    print("👥 역할별 알림 개수")
    print("=" * 80)
    
    for role in ['admin', 'user', 'monitoring', 'approver']:
        role_count = client.count(
            index="cs_alerts",
            body={
                "query": {
                    "term": {
                        "receiver.values": role
                    }
                }
            }
        )
        print(f"  {role}: {role_count['count']}개")
    
    # 5. 최근 24시간 알림 개수
    print("\n" + "=" * 80)
    print("⏰ 최근 24시간 알림")
    print("=" * 80)
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    
    recent_count = client.count(
        index="cs_alerts",
        body={
            "query": {
                "range": {
                    "created_at": {
                        "gte": yesterday.isoformat()
                    }
                }
            }
        }
    )
    print(f"  최근 24시간: {recent_count['count']}개")
    
    print("\n" + "=" * 80)
    print("✅ 알림 내역 확인 완료")
    print("=" * 80)

if __name__ == "__main__":
    try:
        check_alerts()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
