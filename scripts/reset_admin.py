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
        # Search for admin user by email or username
        response = client.search(
            index="cs_users",
            body={
                "query": {
                    "bool": {
                        "should": [
                            {"term": {"username.keyword": admin_username}},
                            {"term": {"email.keyword": "admin@example.com"}}
                        ]
                    }
                }
            }
        )
        
        hits = response['hits']['hits']
        
        hashed_pw = get_password_hash(admin_password)
        
        
        if hits:
            # Update existing admin
            user_id = hits[0]['_id']
            source = hits[0]['_source']
            print(f"Found existing admin user (ID: {user_id}). Updating password...")
            
            # Use existing field names (password_hash vs hashed_password)
            pw_field = "password_hash" if "password_hash" in source else "hashed_password"
            
            doc = {
                pw_field: hashed_pw,
                "is_active": True,
                "updated_at": "2026-02-02T19:40:00"
            }
            
            client.update(index="cs_users", id=user_id, body={"doc": doc})
            print(f"Admin password updated successfully using field: {pw_field}")
            
        else:
            # Create new admin
            print("Admin user not found. Creating new admin...")
            
            admin_email = "admin@example.com"
            new_user = {
                "username": admin_username,
                "email": admin_email,
                "name": "Admin",
                "full_name": "System Administrator",
                "password_hash": hashed_pw, # Standard field name
                "role": "admin",
                "is_active": True,
                "is_superuser": True,
                "created_at": "2026-02-02T19:40:00",
                "updated_at": "2026-02-02T19:40:00"
            }
            
            # Use username as Document ID
            client.index(index="cs_users", id=admin_username, body=new_user, refresh=True)
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
