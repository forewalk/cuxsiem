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

    # Check/Create admin user
    print("[*] Checking admin user...")
    
    # Check if admin exists by ID
    admin_id = "admin"
    try:
        client.get(index="cs_users", id=admin_id)
        print(f"[*] Admin user already exists (ID: {admin_id})\n")
    except Exception:
        # Admin does not exist, create one
        print(f"[*] Creating admin user (ID: {admin_id})...")
        
        # Hash password with bcrypt
        password = "password123"
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode(), salt).decode()

        admin_user = {
            "id": admin_id,
            "email": "admin@cruxdata.co.kr", # Email is just a profile field now
            "password_hash": password_hash,
            "name": "Administrator",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "deleted_at": None,
            "last_login_at": None,
        }

        client.index(
            index="cs_users",
            id=admin_id,
            body=admin_user,
            refresh=True,
        )
        print(f"[+] Admin user created")
        print(f"    ID: admin")
        print(f"    Password: password123\n")

    # Check/Create default password policy
    print("[*] Checking password policy...")
    policy_id = "default"
    try:
        client.get(index="cs_password_policies", id=policy_id)
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
            index="cs_password_policies",
            id=policy_id,
            body=default_policy,
            refresh=True
        )
        print(f"[+] Default password policy created\n")

    print("=" * 60)
    print("[+] OpenSearch initialization completed!")
    print("=" * 60)
    print("\n[Login Info]")
    print("    ID: admin")
    print("    Password: password123\n")

except Exception as e:
    print(f"[-] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
