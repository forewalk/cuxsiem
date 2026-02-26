import os
from opensearchpy import OpenSearch
from dotenv import load_dotenv

load_dotenv()

def check_mapping():
    host = os.getenv("OPENSEARCH_HOST", "localhost")
    port = int(os.getenv("OPENSEARCH_PORT", 9200))
    auth = (os.getenv("OPENSEARCH_USER", "admin"), os.getenv("OPENSEARCH_PASSWORD", "admin"))
    
    client = OpenSearch(
        hosts=[{'host': host, 'port': port}],
        http_auth=auth,
        use_ssl=os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true",
        verify_certs=False,
        ssl_show_warn=False
    )
    
    indices = ["logs-sentinel_one.threats-000001", "activities*"]
    
    for index in indices:
        print(f"\n--- Mapping for {index} ---")
        try:
            mapping = client.indices.get_mapping(index=index)
            # 타임스탬프와 관련된 필드 검색
            properties = mapping[list(mapping.keys())[0]]['mappings']['properties']
            time_fields = [f for f in properties.keys() if 'time' in f.lower() or 'date' in f.lower() or f == '@timestamp']
            print(f"Time-related fields: {time_fields}")
            if 'timestamp' in properties:
                print("Confirmed: 'timestamp' field exists.")
            else:
                print("WARNING: 'timestamp' field NOT found!")
        except Exception as e:
            print(f"Error checking {index}: {e}")

if __name__ == "__main__":
    check_mapping()
