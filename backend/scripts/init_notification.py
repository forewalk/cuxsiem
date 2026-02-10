#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Notification system initialization script for OpenSearch
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opensearchpy import OpenSearch

load_dotenv()

opensearch_host = os.getenv("OPENSEARCH_HOST", "ns1.cruxdata.co.kr")
opensearch_port = int(os.getenv("OPENSEARCH_PORT", 11723))
opensearch_user = os.getenv("OPENSEARCH_USER", "admin")
opensearch_password = os.getenv("OPENSEARCH_PASSWORD", "admin")
opensearch_use_ssl = os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true"

print(f"[*] Connecting to OpenSearch: {opensearch_host}:{opensearch_port}")

client = OpenSearch(
    hosts=[{"host": opensearch_host, "port": opensearch_port}],
    http_auth=(opensearch_user, opensearch_password),
    use_ssl=opensearch_use_ssl,
    verify_certs=False,
    ssl_show_warn=False,
)

def create_index(index_name, body):
    if not client.indices.exists(index=index_name):
        print(f"[*] Creating index: {index_name}...")
        client.indices.create(index=index_name, body=body)
        print(f"[+] Index {index_name} created.")
    else:
        print(f"[*] Index {index_name} already exists.")

try:
    info = client.info()
    print(f"[+] OpenSearch connected: {info['version']['number']}")

    # 1. cs_notification_rules mapping
    rules_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "name": {"type": "text"},
                "target_index": {"type": "keyword"},
                "condition_type": {"type": "keyword"},
                "condition_config": {"type": "object", "enabled": True},
                "severity": {"type": "keyword"},
                "interval_min": {"type": "integer"},
                "window_min": {"type": "integer"},
                "webhooks": {"type": "keyword"},
                "receiver": {"type": "object", "enabled": True},
                "is_active": {"type": "boolean"},
                "created_at": {"type": "date"},
                "updated_at": {"type": "date"}
            }
        }
    }

    # 2. cs_notifications mapping
    notifications_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "rule_id": {"type": "keyword"},
                "title": {"type": "text"},
                "message": {"type": "text"},
                                "event_ref": {"type": "keyword"},
                                "dedup_key": {"type": "keyword"},
                                "receiver": {"type": "object", "enabled": True},
                                "status": {"type": "keyword"},
                                "created_at": {"type": "date"}
                ,
                "sent_at": {"type": "date"},
                "error_message": {"type": "text"}
            }
        }
    }

    create_index("cs_notification_rules", rules_mapping)
    create_index("cs_notifications", notifications_mapping)

    print("" + "=" * 60)
    print("[+] Notification indices initialization completed!")
    print("=" * 60)

except Exception as e:
    print(f"[-] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
