from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
    http_auth=('admin', 'admin'),
    use_ssl=False,
    verify_certs=False,
)

target_indices = ["activities", "edr", "threats"]

for index in target_indices:
    print(f"\n--- Sample Log from [{index}] ---")
    try:
        recent = client.search(index=index, body={"size": 1})
        if recent['hits']['hits']:
            print(json.dumps(recent['hits']['hits'][0]['_source'], indent=2))
        else:
            print(f"No documents found in index [{index}]")
    except Exception as e:
        print(f"Error fetching from [{index}]: {e}")
