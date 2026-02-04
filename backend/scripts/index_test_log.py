import sys
import os
from datetime import datetime, timezone

# 프로젝트 루트 디렉토리를 PYTHONPATH에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.opensearch import get_opensearch_client

def index_test_log():
    client = get_opensearch_client()
    index_name = "activities"
    
    # 1. 현재 시간으로 타임스탬프 설정 (실시간 스트리밍 확인용)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    
    doc1 = {
        "command": ["python3", "/conf/vector/scripts/fetch_activities.py"],
        "host": "elastic-logstach",
        "message": "Real-time streaming test log",
        "pid": 868263,
        "source_type": "exec",
        "stream": "stderr",
        "timestamp": now
    }
    
    # 2. 사용자가 제공한 과거 데이터 (초기 로딩 확인용)
    doc2 = {
        "command": ["python3", "/conf/vector/scripts/fetch_activities.py"],
        "host": "elastic-logstach",
        "message": "    raise err",
        "pid": 868263,
        "source_type": "exec",
        "stream": "stderr",
        "timestamp": "2026-02-03T00:55:01.256001966Z"
    }
    
    try:
        if not client.indices.exists(index=index_name):
            print(f"Index {index_name} does not exist. Creating...")
            client.indices.create(index=index_name)
            
        res1 = client.index(index=index_name, body=doc1, refresh=True)
        print(f"Indexed real-time log! ID: {res1.get('_id')}")
        
        res2 = client.index(index=index_name, body=doc2, refresh=True)
        print(f"Indexed historical log! ID: {res2.get('_id')}")
        
    except Exception as e:
        print(f"Error indexing document: {e}")

if __name__ == "__main__":
    index_test_log()
