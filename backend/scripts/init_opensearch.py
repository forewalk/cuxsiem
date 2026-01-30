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
    response = client.search(
        index="cs_users",
        body={"query": {"match": {"email": "admin@example.com"}}},
    )

    if response["hits"]["total"]["value"] == 0:
        # Hash password with bcrypt
        password = "password123"
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode(), salt).decode()

        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@example.com",
            "password_hash": password_hash,
            "name": "Admin",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "deleted_at": None,
            "last_login_at": None,
        }

        client.index(
            index="cs_users",
            id=admin_user["id"],
            body=admin_user,
            refresh=True,
        )
        print(f"[+] Admin user created")
        print(f"    Email: admin@example.com")
        print(f"    Password: password123\n")
    else:
        print(f"[*] Admin user already exists\n")

    print("=" * 60)
    print("[+] OpenSearch initialization completed!")
    print("=" * 60)
    print("\nTest Account:")
    print("    Email: admin@example.com")
    print("    Password: password123\n")

except Exception as e:
    print(f"[-] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
