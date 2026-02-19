"""
cs_alerts 인덱스 생성 스크립트

기존 cs_notifications 인덱스를 대체하는 새로운 알림 저장 인덱스
- 메시지 템플릿 저장
- 원본 이벤트 Document 저장
- 규칙 메타데이터 저장
"""
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.opensearch import get_opensearch_client

ALERTS_INDEX_NAME = "cs_alerts"

ALERTS_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            # 기본 식별자
            "id": {"type": "keyword"},
            "rule_id": {"type": "keyword"},
            
            # 규칙 메타데이터
            "rule_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "rule_description": {"type": "text"},
            "rule_severity": {"type": "keyword"},
            "rule_target_index": {"type": "keyword"},
            
            # 메시지 관련
            "message": {"type": "text"},
            "message_template": {"type": "text"},
            
            # 이벤트 관련
            "event_ref": {"type": "keyword"},
            "event_index": {"type": "keyword"},
            "event_source": {"type": "object", "enabled": True},  # JSON 저장
            
            # 중복 제거
            "dedup_key": {"type": "keyword"},
            
            # 수신자 정보
            "receiver": {"type": "object", "enabled": True},
            
            # 상태 관리
            "status": {"type": "keyword"},
            "error_message": {"type": "text"},
            "severity": {"type": "keyword"},
            
            # 발송 증적 (webhook 등)
            "channel": {"type": "keyword"},
            "endpoint": {"type": "keyword"},
            "request_headers": {"type": "object", "enabled": False},
            "outgoing_payload": {"type": "object", "enabled": False},
            "response_status_code": {"type": "integer"},
            "response_body": {"type": "text"},
            
            # 타임스탬프
            "created_at": {"type": "date"},
            "sent_at": {"type": "date"}
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "refresh_interval": "1s"
    }
}


def init_alerts_index():
    """cs_alerts 인덱스 생성"""
    client = get_opensearch_client()
    
    print(f"=== cs_alerts 인덱스 초기화 ===")
    
    # 기존 인덱스 확인
    if client.indices.exists(index=ALERTS_INDEX_NAME):
        print(f"⚠️  인덱스 '{ALERTS_INDEX_NAME}'가 이미 존재합니다.")
        response = input("기존 인덱스를 삭제하고 재생성하시겠습니까? (yes/no): ")
        
        if response.lower() in ['yes', 'y']:
            client.indices.delete(index=ALERTS_INDEX_NAME)
            print(f"✅ 기존 인덱스 '{ALERTS_INDEX_NAME}' 삭제 완료")
        else:
            print("❌ 작업이 취소되었습니다.")
            return
    
    # 인덱스 생성
    try:
        client.indices.create(index=ALERTS_INDEX_NAME, body=ALERTS_INDEX_MAPPING)
        print(f"✅ 인덱스 '{ALERTS_INDEX_NAME}' 생성 완료!")
        
        # 매핑 확인
        mapping = client.indices.get_mapping(index=ALERTS_INDEX_NAME)
        print(f"\n📋 생성된 인덱스 매핑:")
        import json
        print(json.dumps(mapping, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ 인덱스 생성 실패: {e}")
        raise


def delete_old_notifications_index():
    """기존 cs_notifications 인덱스 삭제 (선택사항)"""
    client = get_opensearch_client()
    old_index = "cs_notifications"
    
    if client.indices.exists(index=old_index):
        print(f"\n⚠️  기존 '{old_index}' 인덱스 발견")
        response = input(f"'{old_index}' 인덱스를 삭제하시겠습니까? (yes/no): ")
        
        if response.lower() in ['yes', 'y']:
            client.indices.delete(index=old_index)
            print(f"✅ '{old_index}' 인덱스 삭제 완료")
        else:
            print(f"ℹ️  '{old_index}' 인덱스는 유지됩니다.")


if __name__ == "__main__":
    try:
        init_alerts_index()
        delete_old_notifications_index()
        print("\n🎉 모든 작업이 완료되었습니다!")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        sys.exit(1)
