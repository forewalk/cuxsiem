import sys
import os
import json
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from app.core.opensearch import get_opensearch_client

def check_dashboards():
    client = get_opensearch_client()
    res = client.search(index="cs_dashboards", body={"size": 100, "query": {"match_all": {}}})
    for hit in res['hits']['hits']:
        print(json.dumps(hit['_source'], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    check_dashboards()
