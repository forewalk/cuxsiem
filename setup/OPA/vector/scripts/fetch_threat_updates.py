#!/usr/bin/env python3
import json
import sys
import logging
from pathlib import Path
import requests
import fcntl
from confluent_kafka import Producer
from config import (KAFKA_BOOTSTRAP, KAFKA_TOPIC_THREATS,
                    BASE_URL, ACCOUNT_ID, API_TOKEN,
                    THREAT_UPDATES_STATE_FILE, THREAT_UPDATES_LOCK_FILE,
                    DEFAULT_STATE_FROM, MAX_BATCHES, ACTIVITY_TYPES)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

STATE_FILE = Path(THREAT_UPDATES_STATE_FILE)
LOCK_FILE  = Path(THREAT_UPDATES_LOCK_FILE)

def api_get(path, params):
    headers = {"Accept": "application/json", "Authorization": f"ApiToken {API_TOKEN}"}
    resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=params,
                        verify=False, timeout=30)
    resp.raise_for_status()
    return resp.json()

def fetch_activities(created_after, cursor=None):
    params = {"accountIds": ACCOUNT_ID, "activityTypes": ACTIVITY_TYPES,
              "createdAt__gt": created_after, "sortOrder": "asc", "limit": 100}
    if cursor:
        params["cursor"] = cursor
    return api_get("/activities", params)

def fetch_threat_by_id(threat_id):
    try:
        result = api_get("/threats", {"accountIds": ACCOUNT_ID, "ids": threat_id})
        threats = result.get("data", [])
        return threats[0] if threats else None
    except requests.exceptions.RequestException as e:
        log.warning(f"Failed to fetch threat {threat_id}: {e}")
        return None

def main():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

    lock_fd = open(LOCK_FILE, 'w')
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log.info("Already running, skipping.")
        lock_fd.close()
        sys.exit(0)

    try:
        if not STATE_FILE.exists():
            STATE_FILE.write_text(DEFAULT_STATE_FROM)
            log.info(f"Created state file with default value: {DEFAULT_STATE_FROM}")

        last_created = STATE_FILE.read_text().strip()
        log.info(f"Starting from: {last_created}")

        producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})

        cursor, batch_count, total = None, 0, 0

        while batch_count < MAX_BATCHES:
            result     = fetch_activities(last_created, cursor)
            activities = result.get("data", [])
            log.info(f"Fetched {len(activities)} activities (batch {batch_count+1})")

            if not activities:
                break

            batch_max = last_created
            for activity in activities:
                activity_created = activity.get("createdAt")
                threat_id = activity.get("threatId")

                if threat_id:
                    threat_detail = fetch_threat_by_id(threat_id)
                    if threat_detail:
                        threat_detail["@version"] = 2
                        producer.produce(KAFKA_TOPIC_THREATS,
                                         key=threat_detail.get("id", "").encode(),
                                         value=json.dumps(threat_detail).encode())
                        total += 1

                if activity_created and activity_created > batch_max:
                    batch_max = activity_created

            producer.flush()
            log.info(f"Produced {total} messages so far.")

            if batch_max > last_created:
                STATE_FILE.write_text(batch_max)
                last_created = batch_max
                log.info(f"State updated to: {last_created}")

            cursor = result.get("pagination", {}).get("nextCursor")
            if not cursor:
                break
            batch_count += 1

        log.info(f"Done. Total produced: {total}")

    except Exception as e:
        log.error(f"Error: {e}", exc_info=True)
        sys.exit(1)

    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()

if __name__ == "__main__":
    import urllib3; urllib3.disable_warnings()
    main()
