from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

print("--- Fetching one full sample from threats index ---")
try:
    result = client.search(index="logs-sentinel_one.threats", body={"size": 1})
    if result['hits']['hits']:
        doc = result['hits']['hits'][0]['_source']
        print(json.dumps(doc, indent=2))
    else:
        print("No documents found at all.")
except Exception as e:
    print(f"Error: {e}")
