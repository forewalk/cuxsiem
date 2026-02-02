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
        print("Scanning for users to migrate...")
        
        # 1. Scan all users
        response = client.search(
            index="cs_users",
            body={"query": {"match_all": {}}, "size": 1000}
        )
        
        hits = response['hits']['hits']
        print(f"Found {len(hits)} total user documents.")

        for hit in hits:
            old_id = hit['_id']
            source = hit['_source']
            email = source.get('email', '')

            if not email:
                print(f"Skipping doc {old_id} (no email field)")
                continue

            # Derive new ID from email local-part
            new_id = email.split('@')[0].lower()

            # If the document ID is already the username, skip migration
            if old_id == new_id:
                print(f"User '{new_id}' is already in correct format.")
                continue

            print(f"Migrating user: {email} (UUID: {old_id} -> ID: {new_id})")

            # Prepare new document
            source['id'] = new_id
            
            # Normalize password field
            if 'hashed_password' in source and 'password_hash' not in source:
                source['password_hash'] = source['hashed_password']
            
            # Index new document with custom ID
            client.index(index="cs_users", id=new_id, body=source, refresh=True)
            
            # Delete old UUID document
            client.delete(index="cs_users", id=old_id, refresh=True)
            print("Migration complete.")

        # 2. Ensure Admin Exists & Reset Password (Safety Net)
        admin_username = "admin"
        admin_email = "admin@example.com"
        hashed_pw = get_password_hash("admin1234!") # Default reset password

        if not client.exists(index="cs_users", id=admin_username):
             print("Admin user missing after migration. Creating new admin...")
             new_user = {
                "id": admin_username,
                "username": admin_username,
                "email": admin_email,
                "name": "Admin",
                "full_name": "System Administrator",
                "password_hash": hashed_pw,
                "role": "admin",
                "is_active": True,
                "is_superuser": True,
                "created_at": "2026-02-02T20:45:00",
                "updated_at": "2026-02-02T20:45:00"
            }
             client.index(index="cs_users", id=admin_username, body=new_user, refresh=True)
        else:
            # Force update admin password to ensure login works
            print("Updating admin password to default (admin1234!)...")
            client.update(
                index="cs_users", 
                id=admin_username, 
                body={"doc": {"password_hash": hashed_pw, "is_active": True}}
            )

        print("-" * 40)
            
    except Exception as e:
        print(f"Error resetting admin: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin())
