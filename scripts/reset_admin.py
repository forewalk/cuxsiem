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
        # Check if index exists
        if not client.indices.exists(index="cs_users"):
            print("Index 'cs_users' does not exist. Creating...")
            # Here we assume the app will create it, or we create a basic one.
            # Usually app creates it on startup if logic exists.
            
        # Search for admin user
        response = client.search(
            index="cs_users",
            body={"query": {"term": {"username.keyword": admin_username}}}
        )
        
        hits = response['hits']['hits']
        
        hashed_pw = get_password_hash(admin_password)
        
        if hits:
            # Update existing admin
            user_id = hits[0]['_id']
            print(f"Found existing admin user (ID: {user_id}). Updating password...")
            
            doc = {
                "hashed_password": hashed_pw,
                "is_active": True,
                "is_superuser": True,
                # Ensure other required fields if schema changed
            }
            
            client.update(index="cs_users", id=user_id, body={"doc": doc})
            print("Admin password updated successfully.")
            
        else:
            # Create new admin
            print("Admin user not found. Creating new admin...")
            
            new_user = {
                "username": admin_username,
                "email": "admin@example.com",
                "full_name": "System Administrator",
                "hashed_password": hashed_pw,
                "is_active": True,
                "is_superuser": True,
                "role": "admin",
                "created_at": "2026-02-02T00:00:00",
                "updated_at": "2026-02-02T00:00:00"
            }
            
            client.index(index="cs_users", body=new_user, refresh=True)
            print("Admin user created successfully.")

        print("-" * 40)
        print(f"Username : {admin_username}")
        print(f"Password : {admin_password}")
        print("-" * 40)
            
    except Exception as e:
        print(f"Error resetting admin: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin())
