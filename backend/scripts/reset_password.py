#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
User Password Reset Script (CLI)
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

def reset_password(username, new_password):
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
        # Check if user exists
        try:
            client.get(index="cs_users", id=username)
        except NotFoundError:
            print(f"[-] Error: User '{username}' not found.")
            return False

        # Hash new password
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(new_password.encode(), salt).decode()

        # Update only password_hash and updated_at
        client.update(
            index="cs_users",
            id=username,
            body={
                "doc": {
                    "password_hash": password_hash,
                    "updated_at": datetime.utcnow().isoformat(),
                    "is_active": True  # Ensure user is active
                }
            },
            refresh=True
        )
        print(f"[+] Password for user '{username}' has been reset successfully.")
        return True

    except Exception as e:
        print(f"[-] Error: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset user password for CruxSIEM")
    parser.add_argument("--username", help="Username to reset password", default="administrator")
    parser.add_argument("--password", help="New password (if not provided, will prompt)")

    args = parser.parse_args()
    
    password = args.password
    if not password:
        password = getpass.getpass(f"Enter new password for '{args.username}': ")
        confirm_password = getpass.getpass("Confirm new password: ")
        if password != confirm_password:
            print("[-] Passwords do not match.")
            sys.exit(1)
        if len(password) < 8:
            print("[-] Error: Password must be at least 8 characters long.")
            sys.exit(1)

    reset_password(args.username, password)
