from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

print("--- Checking incidentStatus distribution ---")
body = {
    "size": 0,
    "aggs": {
        "status_list": {
            "terms": {
                "field": "threatInfo.incidentStatus.keyword",
                "size": 10
            }
        },
        "all_fields": {
            "top_hits": {
                "size": 1
            }
        }
    }
}

try:
    result = client.search(index="logs-sentinel_one.threats", body=body)
    print("Buckets found:")
    print(json.dumps(result['aggregations']['status_list']['buckets'], indent=2))
    
    print("\n--- Sample Document ---")
    if result['hits']['hits']:
        print(json.dumps(result['hits']['hits'][0]['_source']['threatInfo'], indent=2))
except Exception as e:
    print(f"Error: {e}")
