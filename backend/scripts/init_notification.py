#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Notification system initialization script for OpenSearch
- 최신 스키마를 반영하여 인덱스를 삭제 후 재생성합니다.
"""
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opensearchpy import OpenSearch

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

opensearch_host = os.getenv("OPENSEARCH_HOST", "ns1.cruxdata.co.kr")
opensearch_port = int(os.getenv("OPENSEARCH_PORT", 11723))
opensearch_user = os.getenv("OPENSEARCH_USER", "admin")
opensearch_password = os.getenv("OPENSEARCH_PASSWORD", "admin")
opensearch_use_ssl = os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true"

logger.info(f"Connecting to OpenSearch: {opensearch_host}:{opensearch_port}")

client = OpenSearch(
    hosts=[{"host": opensearch_host, "port": opensearch_port}],
    http_auth=(opensearch_user, opensearch_password),
    use_ssl=opensearch_use_ssl,
    verify_certs=False,
    ssl_show_warn=False,
)

def recreate_index(index_name, mapping):
    """기존 인덱스를 삭제하고 새 매핑으로 생성"""
    if client.indices.exists(index=index_name):
        logger.info(f"[*] Index {index_name} already exists. Deleting for fresh start...")
        client.indices.delete(index=index_name)
    
    logger.info(f"[*] Creating index: {index_name}...")
    client.indices.create(index=index_name, body=mapping)
    logger.info(f"[+] Index {index_name} created successfully.")

try:
    info = client.info()
    logger.info(f"[+] OpenSearch connected: {info['version']['number']}")

    # 1. cs_notification_rules mapping (운영 필드 및 채널 객체 반영)
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
                "message_template": {"type": "text"},
                "severity": {"type": "keyword"},
                "interval_min": {"type": "integer"},
                "trigger_condition": {"type": "text"},
                "channels": { 
                    "properties": {
                        "webhooks": {
                            "type": "nested",
                            "properties": {
                                "url": {"type": "keyword"},
                                "method": {"type": "keyword"},
                                "headers": {"type": "object"}
                            }
                        },
                        "slack": {
                            "type": "nested",
                            "properties": {
                                "channel": {"type": "keyword"},
                                "webhook_url": {"type": "keyword"}
                            }
                        },
                        "email": {
                            "type": "nested",
                            "properties": {
                                "recipients": {"type": "keyword"},
                                "subject_template": {"type": "text"}
                            }
                        }
                    }
                },
                "receiver": {
                    "properties": {
                        "type": {"type": "keyword"},
                        "values": {"type": "keyword"}
                    }
                },
                "is_active": {"type": "boolean"},
                "last_run_at": {"type": "date"},
                "last_triggered_at": {"type": "date"},
                "total_alerts_count": {"type": "integer"},
                "created_at": {"type": "date"},
                "updated_at": {"type": "date"},
                "deleted_at": {"type": "date"}
            }
        }
    }

    # 2. cs_notifications mapping (알림 로그) - 하위 호환성 유지
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
                "created_at": {"type": "date"},
                "sent_at": {"type": "date"},
                "error_message": {"type": "text"}
            }
        }
    }

    # 3. cs_alerts mapping (실제 알림 내역 저장소)
    alerts_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "rule_id": {"type": "keyword"},
                
                # 규칙 메타데이터
                "rule_name": {"type": "text"},
                "rule_description": {"type": "text"},
                "rule_severity": {"type": "keyword"},
                "rule_target_index": {"type": "keyword"},
                
                # 메시지
                "message": {"type": "text"},
                "message_template": {"type": "text"},
                
                # 이벤트 관련
                "event_ref": {"type": "keyword"},
                "event_index": {"type": "keyword"},
                "event_source": {"type": "object", "enabled": True},
                
                # 중복 제거 및 수신자
                "dedup_key": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "receiver": {
                    "properties": {
                        "type": {"type": "keyword"},
                        "values": {"type": "keyword"}
                    }
                },
                
                # 상태
                "status": {"type": "keyword"},
                "error_message": {"type": "text"},
                "created_at": {"type": "date"}
            }
        }
    }

    recreate_index("cs_notification_rules", rules_mapping)
    recreate_index("cs_notifications", notifications_mapping)
    recreate_index("cs_alerts", alerts_mapping)

    logger.info("=" * 60)
    logger.info("[+] Notification system re-initialized cleanly!")
    logger.info("=" * 60)

except Exception as e:
    logger.error(f"[-] Critical Error: {e}")
    sys.exit(1)
