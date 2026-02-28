#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenSearch initialization script
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import uuid
import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opensearchpy import OpenSearch
from opensearchpy.exceptions import NotFoundError

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

try:
    info = client.info()
    print(f"[+] OpenSearch connected: {info['version']['number']}\n")

    # Check/Create default password policy
    print("[*] Checking password policy...")
    policy_id = "password"
    try:
        client.get(index="cs_policies", id=policy_id)
        print(f"[*] Default password policy already exists\n")
    except Exception:
        print(f"[*] Creating default password policy...")
        default_policy = {
            "id": policy_id,
            "name": "기본 정책",
            "min_length": 9,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special_chars": True,
            "expiry_days": 90,
            "history_count": 3,
            "max_login_attempts": 5,
            "lockout_minutes": 10,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        client.index(
            index="cs_policies",
            id=policy_id,
            body=default_policy,
            refresh=True
        )
        print(f"[+] Default password policy created\n")

    # Check/Create advanced settings
    print("[*] Checking advanced settings...")
    settings_id = "advanced_settings"
    try:
        client.get(index="cs_policies", id=settings_id)
        print(f"[*] Advanced settings already exists\n")
    except Exception:
        print(f"[*] Creating default advanced settings...")
        default_settings = {
            "user_register": False,
            "updated_at": datetime.utcnow().isoformat()
        }
        client.index(
            index="cs_policies",
            id=settings_id,
            body=default_settings,
            refresh=True
        )
        print(f"[+] Default advanced settings created\n")

    print("=" * 60)
    print("[+] OpenSearch initialization completed!")
    print("=" * 60)

except Exception as e:
    print(f"[-] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
