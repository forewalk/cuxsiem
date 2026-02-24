import sys
import os
import json
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.core.opensearch import get_opensearch_client

def check_agent_fields():
    client = get_opensearch_client()
    try:
        res = client.search(index="logs-sentinel_one.agents", body={"size": 1, "query": {"match_all": {}}})
        if res['hits']['hits']:
            print(json.dumps(res['hits']['hits'][0]['_source'], indent=2, ensure_ascii=False))
        else:
            print("No logs found in logs-sentinel_one.agents")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_agent_fields()
