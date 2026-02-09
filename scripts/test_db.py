#!/usr/bin/env python3
import os
import sys

try:
    from opensearchpy import OpenSearch
except ImportError:
    print("Error: 'opensearch-py' library is not installed.")
    print("If running inside the container, this shouldn't happen.")
    print("If running on host, install it with: pip install opensearch-py")
    sys.exit(1)

def load_env(file_path=".env.production"):
    """Load env variables from file if exists"""
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                key, value = line.split("=", 1)
                os.environ[key] = value

def test_connection():
    # Load env from .env.production if it exists in current dir
    load_env()

    host = os.getenv('OPENSEARCH_HOST', 'localhost')
    port = int(os.getenv('OPENSEARCH_PORT', 9200))
    user = os.getenv('OPENSEARCH_USER', 'admin')
    password = os.getenv('OPENSEARCH_PASSWORD', 'admin')
    use_ssl = os.getenv('OPENSEARCH_USE_SSL', 'true').lower() == 'true'
    verify_certs = os.getenv('OPENSEARCH_VERIFY_CERTS', 'false').lower() == 'true'

    print("=" * 60)
    print(" cruxSIEM: OpenSearch Connection Test")
    print("=" * 60)
    print(f"Target: {host}:{port}")
    print(f"User  : {user}")
    print(f"SSL   : {use_ssl} (Verify: {verify_certs})")
    print("-" * 60)

    try:
        client = OpenSearch(
            hosts=[{'host': host, 'port': port}],
            http_auth=(user, password),
            use_ssl=use_ssl,
            verify_certs=verify_certs,
            ssl_show_warn=False
        )

        info = client.info()
        print(f"SUCCESS: Connected to cluster '{info.get('cluster_name')}'")
        print(f"Version: {info.get('version', {}).get('number')}")
        
        health = client.cluster.health()
        print(f"Health : {health.get('status')}")
        
        print("-" * 60)
        print("Indices starting with 'cs_':")
        indices = client.cat.indices(index="cs_*", format="json")
        if indices:
            for idx in indices:
                print(f"- {idx['index']} (docs: {idx['docs.count']})")
        else:
            print("(No 'cs_' indices found)")
            
    except Exception as e:
        print(f"FAILED : Could not connect to OpenSearch.")
        print(f"Error  : {e}")
        print("\nSuggestions:")
        print("1. Check if OPENSEARCH_HOST is correct in .env.production")
        print("2. If OpenSearch is on host, use 'host.docker.internal' or Host IP")
        print("3. Check if firewall allows port {port})")
        sys.exit(1)

    print("=" * 60)

if __name__ == "__main__":
    test_connection()
