#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys
from dotenv import load_dotenv
from opensearchpy import OpenSearch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

client = OpenSearch(
    hosts=[{"host": os.getenv("OPENSEARCH_HOST"), "port": int(os.getenv("OPENSEARCH_PORT"))}],
    http_auth=(os.getenv("OPENSEARCH_USER"), os.getenv("OPENSEARCH_PASSWORD")),
    use_ssl=False,
    verify_certs=False,
    ssl_show_warn=False,
)

try:
    # Check users
    response = client.search(
        index="cs_users",
        body={"query": {"match_all": {}}}
    )
    
    print("[*] Users in OpenSearch:")
    print(f"Total: {response['hits']['total']['value']}\n")
    
    for hit in response['hits']['hits']:
        user = hit['_source']
        print(f"ID: {user['id']}")
        print(f"Email: {user['email']}")
        print(f"Name: {user['name']}")
        print(f"Role: {user['role']}")
        print(f"Active: {user['is_active']}")
        print(f"Hash: {user['password_hash'][:20]}...")
        print()

except Exception as e:
    print(f"[-] Error: {e}")
    sys.exit(1)
