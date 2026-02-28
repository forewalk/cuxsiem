"""OpenSearch 접속 테스트 스크립트"""
from app.core.opensearch import get_opensearch_client
from app.core.config import settings


def test_connection():
    """OpenSearch 연결 테스트"""
    print("=" * 60)
    print("OpenSearch Connection Test")
    print("=" * 60)
    print(f"Host: {settings.OPENSEARCH_HOST}:{settings.OPENSEARCH_PORT}")
    print(f"User: {settings.OPENSEARCH_USER}")
    print(f"SSL: {settings.OPENSEARCH_USE_SSL}")
    print("=" * 60)

    try:
        client = get_opensearch_client()

        # 1. 클러스터 정보 확인
        print("\n[1] Cluster Info:")
        info = client.info()
        print(f"  - Cluster: {info.get('cluster_name')}")
        print(f"  - Version: {info.get('version', {}).get('number')}")

        # 2. 클러스터 상태 확인
        print("\n[2] Cluster Health:")
        health = client.cluster.health()
        print(f"  - Status: {health.get('status')}")
        print(f"  - Nodes: {health.get('number_of_nodes')}")
        print(f"  - Data Nodes: {health.get('number_of_data_nodes')}")

        # 3. 인덱스 목록 조회 (.cs- 접두사)
        print("\n[3] cruxSIEM Indices (.cs-*):")
        try:
            indices = client.cat.indices(index=".cs-*", format="json")
            if indices:
                for idx in indices:
                    print(f"  - {idx['index']} (docs: {idx['docs.count']}, size: {idx['store.size']})")
            else:
                print("  (No indices yet)")
        except Exception:
            print("  (No .cs-* indices found)")

        # 4. 테스트 인덱스 생성 및 삭제
        print("\n[4] Test Index Create/Delete:")
        test_index = ".cs-connection-test"

        # 생성
        client.indices.create(index=test_index, body={
            "settings": {"number_of_shards": 1, "number_of_replicas": 0}
        })
        print(f"  - Index created: {test_index}")

        # 문서 추가
        client.index(
            index=test_index,
            body={"message": "connection test", "timestamp": "2026-01-30"},
            refresh=True
        )
        print(f"  - Document inserted")

        # 검색
        result = client.search(index=test_index, body={"query": {"match_all": {}}})
        print(f"  - Search result: {result['hits']['total']['value']} docs")

        # 삭제
        client.indices.delete(index=test_index)
        print(f"  - Index deleted")

        print("\n" + "=" * 60)
        print("SUCCESS: OpenSearch connection test passed!")
        print("=" * 60)

        return True

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"FAILED: OpenSearch connection test failed!")
        print(f"Error: {type(e).__name__}: {e}")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = test_connection()
    exit(0 if success else 1)
