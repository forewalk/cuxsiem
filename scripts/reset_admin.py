import asyncio
import os
import sys
# Add /app to sys.path to ensure modules can be imported
sys.path.append('/app')

from app.core.opensearch import get_opensearch_client

async def migrate_users():
    print("Connecting to OpenSearch...")
    client = get_opensearch_client()
    
    try:
        print("Scanning for users to migrate ID format...")
        
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

        print("-" * 40)
        print("User migration process finished.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())
