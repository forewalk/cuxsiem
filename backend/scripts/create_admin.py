#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Admin User Creation Script
"""
import os
import sys
import argparse
import getpass
from datetime import datetime
from dotenv import load_dotenv
import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opensearchpy import OpenSearch
from opensearchpy.exceptions import NotFoundError

load_dotenv()

def create_admin_user(username, password, email, name):
    opensearch_host = os.getenv("OPENSEARCH_HOST", "localhost")
    opensearch_port = int(os.getenv("OPENSEARCH_PORT", 9200))
    opensearch_user = os.getenv("OPENSEARCH_USER", "admin")
    opensearch_password = os.getenv("OPENSEARCH_PASSWORD", "admin")
    opensearch_use_ssl = os.getenv("OPENSEARCH_USE_SSL", "false").lower() == "true"
    opensearch_verify_certs = os.getenv("OPENSEARCH_VERIFY_CERTS", "false").lower() == "true"
    opensearch_ca_certs = os.getenv("OPENSEARCH_CA_CERTS")

    print(f"[*] Connecting to OpenSearch: {opensearch_host}:{opensearch_port}")

    client = OpenSearch(
        hosts=[{"host": opensearch_host, "port": opensearch_port}],
        http_auth=(opensearch_user, opensearch_password),
        use_ssl=opensearch_use_ssl,
        verify_certs=opensearch_verify_certs,
        ca_certs=opensearch_ca_certs,
        ssl_show_warn=False,
    )

    try:
        # Check if user already exists
        try:
            client.get(index="cs_users", id=username)
            print(f"[-] User '{username}' already exists. Use a different username or delete the existing user first.")
            return False
        except NotFoundError:
            pass

        # Hash password
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode(), salt).decode()

        admin_user = {
            "id": username,
            "email": email,
            "password_hash": password_hash,
            "name": name,
            "role": "role-1",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "deleted_at": None,
            "last_login_at": None,
        }

        client.index(
            index="cs_users",
            id=username,
            body=admin_user,
            refresh=True,
        )
        print(f"[+] Admin user '{username}' created successfully.")
        return True

    except Exception as e:
        print(f"[-] Error: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new admin user for CruxSIEM")
    parser.add_argument("--username", help="Admin username", default="administrator")
    parser.add_argument("--email", help="Admin email", default="administrator@cruxdata.co.kr")
    parser.add_argument("--name", help="Admin full name", default="Administrator")
    parser.add_argument("--password", help="Admin password (if not provided, will prompt)")

    args = parser.parse_args()
    
    password = args.password
    if not password:
        password = getpass.getpass("Enter password for new admin user: ")
        confirm_password = getpass.getpass("Confirm password: ")
        if password != confirm_password:
            print("[-] Passwords do not match.")
            sys.exit(1)

    create_admin_user(args.username, password, args.email, args.name)
