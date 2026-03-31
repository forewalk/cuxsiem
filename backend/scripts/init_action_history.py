import asyncio
import sys
import os

# 백엔드 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.opensearch import get_opensearch_client

async def init_action_history_index():
    client = get_opensearch_client()
    index_name = "cs_action_history"
    
    # 매핑 정의
    mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "action_id": {"type": "keyword"},
                "action_name": {"type": "keyword"},
                "user_id": {"type": "keyword"},
                "user_name": {"type": "keyword"},
                "total_count": {"type": "integer"},
                "success_count": {"type": "integer"},
                "fail_count": {"type": "integer"},
                "results": {
                    "type": "nested",
                    "properties": {
                        "log_id": {"type": "keyword"},
                        "status_code": {"type": "integer"},
                        "success": {"type": "boolean"},
                        "response": {"type": "text"},
                        "error": {"type": "text"}
                    }
                },
                "created_at": {"type": "date"}
            }
        }
    }

    if client.indices.exists(index=index_name):
        print(f"Index '{index_name}' already exists.")
    else:
        client.indices.create(index=index_name, body=mapping)
        print(f"Successfully created index '{index_name}'.")

if __name__ == "__main__":
    asyncio.run(init_action_history_index())
