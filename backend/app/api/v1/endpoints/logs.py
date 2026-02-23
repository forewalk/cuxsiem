from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.opensearch import get_opensearch
from app.schemas.log import LogStreamResponse
from app.api.v1.deps import get_current_active_user
from app.schemas.user import UserResponse

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/stream", response_model=LogStreamResponse, response_model_by_alias=True)
async def stream_logs(
    last_timestamp: Optional[str] = Query(None, description="마지막 로그의 타임스탬프 (ISO 형식)"),
    q: Optional[str] = Query(None, description="검색어 (Lucene 쿼리 문법 지원)"),
    limit: int = Query(100, ge=1, le=1000, description="최대 조회 개수"),
    current_user: UserResponse = Depends(get_current_active_user),
    os_client=Depends(get_opensearch)
):
    """
    OpenSearch 'activities' 인덱스에서 최신 로그를 조회합니다.
    last_timestamp가 제공되면 해당 시간 이후의 로그만 조회합니다.
    """
    
    must_queries = [{"exists": {"field": "timestamp"}}]

    # 검색어 처리 (query_string 사용으로 유연한 검색 지원)
    if q:
        must_queries.append({
            "query_string": {
                "query": q,
                "default_field": "message"
            }
        })

    # 타임스탬프 범위 처리
    range_query = {}
    if last_timestamp:
        # 실시간 스트리밍 모드: 마지막 시간 이후만 조회
        range_query["gt"] = last_timestamp
    
    if range_query:
        must_queries.append({"range": {"timestamp": range_query}})

    query = {
        "size": limit,
        "sort": [{"timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": must_queries
            }
        }
    }

    # 'activities' 인덱스를 우선적으로 보되, 와일드카드를 사용하여 유연하게 대응
    index_name = "activities*"
    
    try:
        response = os_client.search(index=index_name, body=query)
        hits = response.get("hits", {}).get("hits", [])
    except Exception as e:
        # 인덱스가 없거나 검색 오류 시 빈 리스트 반환
        return {
            "logs": [],
            "last_timestamp": last_timestamp
        }
    
    logs = []
    new_last_timestamp = last_timestamp
    
    for hit in hits:
        source = hit.get("_source", {})
        ts = source.get("timestamp")
        
        # timestamp가 없는 문서는 이미 query에서 필터링되었겠지만, 안전을 위해 체크
        if not ts:
            continue

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
