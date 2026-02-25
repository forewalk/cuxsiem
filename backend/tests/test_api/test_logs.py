"""로그 API 엔드포인트 테스트"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, patch
from app.main import app
from app.api.v1.deps import get_current_active_user
from app.core.opensearch import get_opensearch

# Mock 사용자 데이터
mock_user = {
    "id": "user-123",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin",
    "is_active": True,
}

@pytest.mark.asyncio
async def test_get_indices_success():
    """인덱스 목록 조회 성공 테스트"""
    transport = ASGITransport(app=app)
    
    # OpenSearch 클라이언트 모의(Mock)
    mock_os = MagicMock()
    mock_os.cat.indices.return_value = [
        {"index": "activities-2026.02.23"},
        {"index": "cs_policies"},
        {"index": ".opendistro_security"},
    ]
    
    # 의존성 주입 재정의
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_opensearch] = lambda: mock_os
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/logs/indices")
        
        assert response.status_code == 200
        data = response.json()
        assert "indices" in data
        # 시스템 인덱스(.)는 제외되어야 함
        assert ".opendistro_security" not in data["indices"]
        # 일반 인덱스는 포함되어야 함
        assert "activities-2026.02.23" in data["indices"]
        assert "cs_policies" in data["indices"]
        # activities* 패턴이 목록에 없어도 수동 추가되어야 함 (코드 로직 확인)
        assert "activities*" in data["indices"]

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_stream_logs_success():
    """로그 스트리밍 조회 성공 테스트"""
    transport = ASGITransport(app=app)
    
    mock_os = MagicMock()
    # 타임스탬프 필드 감지를 위한 매핑 모의
    mock_os.indices.get_mapping.return_value = {
        "activities*": {
            "mappings": {
                "properties": {
                    "@timestamp": {"type": "date"},
                    "message": {"type": "text"}
                }
            }
        }
    }
    
    # 검색 결과 모의 (최신순 desc)
    mock_os.search.return_value = {
        "hits": {
            "hits": [
                {
                    "_id": "log-2",
                    "_index": "activities-2026.02.23",
                    "_source": {
                        "@timestamp": "2026-02-23T10:00:01.000Z",
                        "message": "Latest log"
                    }
                },
                {
                    "_id": "log-1",
                    "_index": "activities-2026.02.23",
                    "_source": {
                        "@timestamp": "2026-02-23T10:00:00.000Z",
                        "message": "Older log"
                    }
                }
            ]
        }
    }
    
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_opensearch] = lambda: mock_os
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. 초기 조회 (limit=2)
        response = await client.get("/api/v1/logs/stream?limit=2&index=activities*")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) == 2
        # 백엔드에서 reverse()를 수행하므로, 시간 순서대로(log-1 -> log-2) 반환되어야 함
        assert data["logs"][0]["_id"] == "log-1"
        assert data["logs"][1]["_id"] == "log-2"
        assert data["last_timestamp"] == "2026-02-23T10:00:01.000Z"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_stream_logs_with_last_timestamp():
    """last_timestamp 이후 로그 조회 테스트"""
    transport = ASGITransport(app=app)
    
    mock_os = MagicMock()
    mock_os.search.return_value = {
        "hits": {
            "hits": [
                {
                    "_id": "log-3",
                    "_index": "activities-2026.02.23",
                    "_source": {
                        "@timestamp": "2026-02-23T10:00:02.000Z",
                        "message": "New log"
                    }
                }
            ]
        }
    }
    
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_opensearch] = lambda: mock_os
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # last_timestamp 파라미터 전달
        response = await client.get("/api/v1/logs/stream?last_timestamp=2026-02-23T10:00:01.000Z")
        
        assert response.status_code == 200
        data = response.json()
        
        # OpenSearch 쿼리에 range 필터가 포함되었는지 간접 확인 (mock_os.search.call_args)
        args, kwargs = mock_os.search.call_args
        body = kwargs["body"]
        range_filter = body["query"]["bool"]["must"][0]["bool"]["should"][0]["range"]["@timestamp"]
        assert range_filter["gt"] == "2026-02-23T10:00:01.000Z"
        
        assert len(data["logs"]) == 1
        assert data["logs"][0]["_id"] == "log-3"

    app.dependency_overrides.clear()
