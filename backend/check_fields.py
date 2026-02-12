from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

print("--- Checking field mapping and values for Detections ---")
# 1. 실제 데이터 1건에서 detectionEngines 경로 확인
sample = client.search(index="logs-sentinel_one.threats", body={"size": 1})
if sample['hits']['hits']:
    source = sample['hits']['hits'][0]['_source']
    print("Data Sample (threatInfo):")
    print(json.dumps(source.get('threatInfo', {}), indent=2))

# 2. 여러 필드 후보로 집계 시도
body = {
    "size": 0,
    "aggs": {
        "with_keyword": {
            "terms": {"field": "threatInfo.detectionEngines.title.keyword", "size": 5}
        },
        "without_keyword": {
            "terms": {"field": "threatInfo.detectionEngines.title", "size": 5}
        },
        "engine_key": {
            "terms": {"field": "threatInfo.detectionEngines.key.keyword", "size": 5}
        }
    }
}

try:
    result = client.search(index="logs-sentinel_one.threats", body=body)
    print("\n--- Aggregation Results ---")
    print(json.dumps(result['aggregations'], indent=2))
except Exception as e:
    print(f"\nError: {e}")
