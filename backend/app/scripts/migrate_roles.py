"""
DB 마이그레이션: user.role 값을 내부 키에서 cs_code ID로 변환

AS-IS: admin, monitoring, approver, user
TO-BE: role-1, role-2, role-3, role-4

실행: python -m app.scripts.migrate_roles
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.opensearch import get_opensearch_client

ROLE_MIGRATION_MAP = {
    "admin": "role-1",
    "monitoring": "role-2",
    "approver": "role-3",
    "user": "role-4",
}

USER_INDEX = "cs_users"
NOTIFICATION_RULE_INDEX = "cs_notification_rules"
ALERT_INDEX = "cs_alerts"


def migrate_users(client):
    migrated = 0
    for old_role, new_role in ROLE_MIGRATION_MAP.items():
        response = client.search(
            index=USER_INDEX,
            body={
                "query": {"term": {"role": old_role}},
                "size": 1000,
                "_source": ["role"]
            }
        )
        hits = response["hits"]["hits"]
        for hit in hits:
            client.update(
                index=USER_INDEX,
                id=hit["_id"],
                body={"doc": {"role": new_role}}
            )
            migrated += 1
        if hits:
            print(f"  cs_users: '{old_role}' → '{new_role}' ({len(hits)}명)")
    return migrated


def migrate_notification_rules(client):
    migrated = 0
    for old_role, new_role in ROLE_MIGRATION_MAP.items():
        response = client.search(
            index=NOTIFICATION_RULE_INDEX,
            body={
                "query": {"term": {"receiver.values.keyword": old_role}},
                "size": 1000,
                "_source": ["receiver"]
            }
        )
        hits = response["hits"]["hits"]
        for hit in hits:
            receiver = hit["_source"].get("receiver", {})
            values = receiver.get("values", [])
            new_values = [new_role if v == old_role else v for v in values]
            client.update(
                index=NOTIFICATION_RULE_INDEX,
                id=hit["_id"],
                body={"doc": {"receiver": {**receiver, "values": new_values}}}
            )
            migrated += 1
        if hits:
            print(f"  cs_notification_rules: receiver '{old_role}' → '{new_role}' ({len(hits)}건)")
    return migrated


def migrate_alert_history(client):
    migrated = 0
    for old_role, new_role in ROLE_MIGRATION_MAP.items():
        response = client.search(
            index=ALERT_INDEX,
            body={
                "query": {"term": {"receiver.values.keyword": old_role}},
                "size": 1000,
                "_source": ["receiver"]
            }
        )
        hits = response["hits"]["hits"]
        for hit in hits:
            receiver = hit["_source"].get("receiver", {})
            values = receiver.get("values", [])
            new_values = [new_role if v == old_role else v for v in values]
            client.update(
                index=ALERT_INDEX,
                id=hit["_id"],
                body={"doc": {"receiver": {**receiver, "values": new_values}}}
            )
            migrated += 1
        if hits:
            print(f"  cs_alerts: receiver '{old_role}' → '{new_role}' ({len(hits)}건)")
    return migrated


def main():
    client = get_opensearch_client()

    print("=== Role Migration 시작 ===\n")

    print("[1/3] cs_users 마이그레이션...")
    u = migrate_users(client)
    print(f"  → 총 {u}명 변환 완료\n")

    print("[2/3] cs_notification_rules 마이그레이션...")
    r = migrate_notification_rules(client)
    print(f"  → 총 {r}건 변환 완료\n")

    print("[3/3] cs_alerts 마이그레이션...")
    a = migrate_alert_history(client)
    print(f"  → 총 {a}건 변환 완료\n")

    print(f"=== 완료: 총 {u + r + a}건 변환 ===")


if __name__ == "__main__":
    main()
