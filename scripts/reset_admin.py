import asyncio
import os
import sys
# Add /app to sys.path to ensure modules can be imported
sys.path.append('/app')

import bcrypt
from app.core.opensearch import get_opensearch_client
from app.models.user import User

def get_password_hash(password: str) -> str:
    # Use bcrypt directly instead of passlib to avoid compatibility issues
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

async def reset_admin():
    print("Connecting to OpenSearch...")
    client = get_opensearch_client()
    
    admin_username = "admin"
    admin_password = "admin1234!" # 초기 비밀번호
    
    try:
        # 1. Cleanup: Delete existing admin users that have UUIDs (not 'admin' ID)
        cleanup_response = client.search(
            index="cs_users",
            body={
                "query": {
                    "bool": {
                        "must": [{"term": {"email.keyword": "admin@example.com"}}],
                        "must_not": [{"ids": {"values": ["admin"]}}]
                    }
                }
            }
        )
        
        for hit in cleanup_response['hits']['hits']:
            print(f"Deleting legacy admin user (ID: {hit['_id']})...")
            client.delete(index="cs_users", id=hit['_id'])

        # 2. Create or Update the correct admin user (ID='admin')
        admin_username = "admin"
        admin_email = "admin@example.com"
        hashed_pw = get_password_hash(admin_password)

        if client.exists(index="cs_users", id=admin_username):
            print(f"Found admin user (ID: {admin_username}). Updating password...")
            
            # Fetch current source to check field names
            source = client.get(index="cs_users", id=admin_username)['_source']
            pw_field = "password_hash" if "password_hash" in source else "hashed_password"

            doc = {
                pw_field: hashed_pw,
                "is_active": True,
                "updated_at": "2026-02-02T20:30:00"
            }
            client.update(index="cs_users", id=admin_username, body={"doc": doc})
            print("Admin password updated successfully.")
            
        else:
            print("Creating new admin user (ID: admin)...")
            new_user = {
                "username": admin_username,
                "email": admin_email,
                "name": "Admin",
                "full_name": "System Administrator",
                "password_hash": hashed_pw,
                "role": "admin",
                "is_active": True,
                "is_superuser": True,
                "created_at": "2026-02-02T20:30:00",
                "updated_at": "2026-02-02T20:30:00"
            }
            client.index(index="cs_users", id=admin_username, body=new_user, refresh=True)
            print("Admin user created successfully.")

        print("-" * 40)
            
    except Exception as e:
        print(f"Error resetting admin: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin())
