from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

print("--- Sample Log from security-auditlog* ---")
try:
    recent = client.search(index="security-auditlog*", body={"size": 1})
    if recent['hits']['hits']:
        print(json.dumps(recent['hits']['hits'][0]['_source'], indent=2))
    else:
        print("No hits found")
except Exception as e:
    print(f"Error fetching logs: {e}")
