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
                    THREATS_STATE_FILE, THREATS_LOCK_FILE,
                    DEFAULT_STATE_FROM, MAX_BATCHES)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

STATE_FILE = Path(THREATS_STATE_FILE)
LOCK_FILE  = Path(THREATS_LOCK_FILE)

def fetch_threats(created_after, cursor=None):
    headers = {"Accept": "application/json", "Authorization": f"ApiToken {API_TOKEN}"}
    params  = {"accountIds": ACCOUNT_ID, "createdAt__gt": created_after,
               "sortOrder": "asc", "limit": 100}
    if cursor:
        params["cursor"] = cursor
    resp = requests.get(f"{BASE_URL}/threats", headers=headers, params=params,
                        verify=False, timeout=30)
    resp.raise_for_status()
    return resp.json()

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
            result  = fetch_threats(last_created, cursor)
            threats = result.get("data", [])
            log.info(f"Fetched {len(threats)} threats (batch {batch_count+1})")

            if not threats:
                break

            batch_max = last_created
            for threat in threats:
                threat["@version"] = 1
                producer.produce(KAFKA_TOPIC_THREATS,
                                 key=threat.get("id", "").encode(),
                                 value=json.dumps(threat).encode())
                t = threat.get("threatInfo", {}).get("createdAt")
                if t and t > batch_max:
                    batch_max = t
                total += 1

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
