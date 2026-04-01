#!/usr/bin/env python3
import json
import sys
import logging
from pathlib import Path
import requests
import fcntl
from confluent_kafka import Producer
from config import (KAFKA_BOOTSTRAP, KAFKA_TOPIC_AGENTS,
                    BASE_URL, ACCOUNT_ID, API_TOKEN,
                    AGENTS_LOCK_FILE)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

LOCK_FILE = Path(AGENTS_LOCK_FILE)

def fetch_agents(cursor=None):
    headers = {"Accept": "application/json", "Authorization": f"ApiToken {API_TOKEN}"}
    params  = {"accountIds": ACCOUNT_ID, "limit": 100}
    if cursor:
        params["cursor"] = cursor
    resp = requests.get(f"{BASE_URL}/agents", headers=headers, params=params,
                        verify=False, timeout=30)
    resp.raise_for_status()
    return resp.json()

def main():
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)

    lock_fd = open(LOCK_FILE, 'w')
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log.info("Already running, skipping.")
        lock_fd.close()
        sys.exit(0)

    try:
        producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})

        cursor, total = None, 0

        while True:
            result = fetch_agents(cursor)
            agents = result.get("data", [])
            log.info(f"Fetched {len(agents)} agents")

            if not agents:
                break

            for agent in agents:
                agent["@version"] = 1
                producer.produce(KAFKA_TOPIC_AGENTS,
                                 key=agent.get("uuid", "").encode(),
                                 value=json.dumps(agent).encode())
                total += 1

            producer.flush()
            log.info(f"Produced {total} messages so far.")

            cursor = result.get("pagination", {}).get("nextCursor")
            if not cursor:
                break

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
