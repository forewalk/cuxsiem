from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.opensearch import get_opensearch
from app.schemas.log import LogStreamResponse, IndexListResponse
from app.api.v1.deps import get_current_active_user
from app.schemas.user import UserResponse

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/indices", response_model=IndexListResponse)
async def get_indices(
    current_user: UserResponse = Depends(get_current_active_user),
    os_client=Depends(get_opensearch)
):
    """
    사용 가능한 OpenSearch 인덱스 목록을 조회합니다.
    시스템 인덱스(.)를 제외하고 반환합니다.
    """
    try:
        # 인덱스 목록 조회
        response = os_client.cat.indices(format="json")
        
        # 시스템 인덱스(.) 및 내부용 인덱스 제외 필터링
        indices = [
            item["index"] for item in response 
            if not item["index"].startswith(".") 
            and not item["index"].startswith("security-auditlog")
        ]
        
        # 중복 제거 및 정렬
        unique_indices = sorted(list(set(indices)))
        
        # activities* 패턴이 목록에 없다면 수동 추가 (기본 인덱스 보장)
        if not any(idx.startswith("activities") for idx in unique_indices):
            unique_indices.insert(0, "activities*")

        return {"indices": unique_indices}
    except Exception as e:
        return {"indices": ["activities*"]}

@router.get("/stream", response_model=LogStreamResponse, response_model_by_alias=True)
async def stream_logs(
    last_timestamp: Optional[str] = Query(None, description="마지막 로그의 타임스탬프 (ISO 형식)"),
    index: str = Query("activities*", description="조회할 인덱스명 또는 와일드카드"),
    q: Optional[str] = Query(None, description="검색어 (Lucene 쿼리 문법 지원)"),
    from_time: Optional[str] = Query(None, description="시작 시간 (상대적 -15m 또는 절대적 ISO)"),
    to_time: Optional[str] = Query(None, description="종료 시간"),
    limit: int = Query(100, ge=1, le=1000, description="최대 조회 개수"),
    current_user: UserResponse = Depends(get_current_active_user),
    os_client=Depends(get_opensearch)
):
    """
    OpenSearch 인덱스에서 최신 로그를 조회합니다.
    @timestamp 또는 timestamp 필드를 자동으로 감지하여 정렬 및 필터링합니다.
    """
    
    # 1. 인덱스 매핑을 통해 사용할 타임스탬프 필드 결정
    ts_field = "timestamp" # 기본값
    try:
        # 특정 인덱스가 아닌 '*' 또는 와일드카드인 경우, 전체 properties를 확인하거나 
        # 일반적인 SIEM 관례(@timestamp 우선)를 따름
        if index == "*" or "*" in index:
            # 여러 인덱스 조회 시에는 @timestamp를 우선 시도하고, 
            # 정렬 시 unmapped_type을 사용하여 필드가 없는 인덱스 오류 방지
            ts_field = "@timestamp"
        else:
            mapping = os_client.indices.get_mapping(index=index)
            first_index = list(mapping.keys())[0]
            properties = mapping[first_index]['mappings']['properties']
            if "@timestamp" in properties:
                ts_field = "@timestamp"
    except:
        ts_field = "@timestamp" # 실패 시 관례적인 @timestamp 시도

    # 'exists' 조건 제거 (여러 인덱스 혼합 시 필드명이 다를 수 있음)
    must_queries = []

    # 검색어 처리
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
        range_query["gt"] = last_timestamp
    elif from_time or to_time:
        if from_time:
            range_query["gte"] = from_time
        if to_time:
            range_query["lte"] = to_time
    elif not last_timestamp:
        range_query["gte"] = "now-15m"

    if range_query:
        # @timestamp와 timestamp 두 가지 가능성을 모두 고려한 필터링
        must_queries.append({
            "bool": {
                "should": [
                    {"range": {"@timestamp": range_query}},
                    {"range": {"timestamp": range_query}}
                ],
                "minimum_should_match": 1
            }
        })

    # 정렬 시에도 두 필드 모두 고려 (존재하는 필드 우선)
    query = {
        "size": limit,
        "sort": [
            {"@timestamp": {"order": "desc", "unmapped_type": "date"}},
            {"timestamp": {"order": "desc", "unmapped_type": "date"}}
        ],
        "query": {
            "bool": {
                "must": must_queries
            }
        }
    }

    try:
        response = os_client.search(index=index, body=query)
        hits = response.get("hits", {}).get("hits", [])
    except Exception as e:
        return {"logs": [], "last_timestamp": last_timestamp}
    
    logs = []
    new_last_timestamp = last_timestamp
    
    for hit in hits:
        source = hit.get("_source", {})
        # @timestamp 또는 timestamp 중 존재하는 필드 사용
        ts = source.get("@timestamp") or source.get("timestamp")
        
        if not ts:
            continue

        logs.append({
            "_id": hit.get("_id"),
            "_index": hit.get("_index"),
            "timestamp": ts, 
            "message": source.get("message") or source.get("event", {}).get("original") or source.get("log", {}).get("original") or str(source),
            "_source": source
        })
        if not new_last_timestamp or ts > new_last_timestamp:
            new_last_timestamp = ts

    logs.reverse()

    return {
        "logs": logs,
        "last_timestamp": new_last_timestamp
    }
