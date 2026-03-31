import asyncio
import sys
import os

# 백엔드 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.opensearch import get_opensearch_client

async def create_cs_action_index():
    client = get_opensearch_client()
    index_name = "cs_action"
    
    # 매핑 정의
    mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "name": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword",
                            "ignore_above": 256
                        }
                    }
                },
                "description": {"type": "text"},
                "target_host": {
                    "properties": {
                        "url": {"type": "keyword"},
                        "port": {"type": "integer"},
                        "path": {"type": "keyword"}
                    }
                },
                "action_logic": {
                    "properties": {
                        "dsl": {"type": "text"},
                        "type": {"type": "keyword"}
                    }
                },
                "user_id": {"type": "keyword"},
                "created_at": {"type": "date"},
                "updated_at": {"type": "date"},
                "deleted_at": {"type": "date"}
            }
        }
    }

    if client.indices.exists(index=index_name):
        print(f"Index '{index_name}' already exists. Deleting and recreating...")
        client.indices.delete(index=index_name)

    client.indices.create(index=index_name, body=mapping)
    print(f"Successfully created index '{index_name}'.")

if __name__ == "__main__":
    asyncio.run(create_cs_action_index())
