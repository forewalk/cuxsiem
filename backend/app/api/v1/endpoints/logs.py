from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.opensearch import get_opensearch
from app.schemas.log import LogStreamResponse
from app.api.v1.deps import get_current_user
from app.schemas.user import UserResponse

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/stream", response_model=LogStreamResponse)
async def stream_logs(
    last_timestamp: Optional[str] = Query(None, description="마지막 로그의 타임스탬프 (ISO 형식)"),
    limit: int = Query(100, ge=1, le=1000, description="최대 조회 개수"),
    current_user: UserResponse = Depends(get_current_user),
    os_client=Depends(get_opensearch)
):
    """
    OpenSearch 'activities' 인덱스에서 최신 로그를 조회합니다.
    last_timestamp가 제공되면 해당 시간 이후의 로그만 조회합니다.
    """
    
    query = {
        "size": limit,
        "sort": [{"timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": []
            }
        }
    }

    if last_timestamp:
        query["query"]["bool"]["must"].append({
            "range": {
                "timestamp": {
                    "gt": last_timestamp
                }
            }
        })
    else:
        query["query"]["bool"]["must"].append({
            "match_all": {}
        })

    # 'activities' 인덱스가 없을 수 있으므로 와일드카드 또는 특정 인덱스 설정
    # 기획서에 따라 'activities'를 우선적으로 보되, 유연하게 대응
    index_name = "activities"
    
    response = os_client.search(index=index_name, body=query)
    hits = response.get("hits", {}).get("hits", [])
    
    logs = []
    new_last_timestamp = last_timestamp
    
    for hit in hits:
        source = hit.get("_source", {})
        ts = source.get("timestamp")
        logs.append({
            "_id": hit.get("_id"),
            "_index": hit.get("_index"),
            "timestamp": ts,
            "message": source.get("message", ""),
            "_source": source
        })
        # 역순 정렬이므로 첫 번째 데이터가 가장 최신임
        if not new_last_timestamp or ts > new_last_timestamp:
            new_last_timestamp = ts

    # 프론트엔드에서는 최신 로그가 아래로 가야하므로, 결과를 다시 시간순(오름차순)으로 뒤집어서 전달
    logs.reverse()

    return {
        "logs": logs,
        "last_timestamp": new_last_timestamp
    }
