from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

print("--- Indices Status ---")
indices = client.cat.indices(index="*", format="json")
for idx in indices:
    print(f"Index: {idx['index']}, Status: {idx['status']}, Docs Count: {idx['docs.count']}")

print("\n--- Recent 1 Log from cs_log_events*")
try:
    recent = client.search(index="cs_log_events*", body={"size": 1, "sort": [{"created_at": "desc"}]})
    print(json.dumps(recent, indent=2))
except Exception as e:
    print(f"Error fetching logs: {e}")
