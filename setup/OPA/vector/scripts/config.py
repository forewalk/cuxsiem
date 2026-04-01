# /conf/vector/scripts/config.py

# ── Kafka ─────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP           = "pipeline:9092"
KAFKA_TOPIC_THREATS       = "threats"
KAFKA_TOPIC_AGENTS        = "agents"

# ── SentinelOne API ───────────────────────────────────────────────────────────
BASE_URL   = "https://sentinelone.local/web/api/v2.1"
ACCOUNT_ID = "2418791195212779875"
API_TOKEN  = "s6C7vo1gK6Oc8uU03PfV3wZbU4e4HOWXjkM0xVwJbwCxsoscy4Bg64pEZseEPkFQh4tX0BFfAXxI2Hq3"

# ── State / Lock 파일 경로 ─────────────────────────────────────────────────────
STATE_DIR                 = "/data/vector/state"
THREATS_STATE_FILE        = f"{STATE_DIR}/threats.state"
THREATS_LOCK_FILE         = f"{STATE_DIR}/threats.lock"
THREAT_UPDATES_STATE_FILE = f"{STATE_DIR}/threat_updates.state"
THREAT_UPDATES_LOCK_FILE  = f"{STATE_DIR}/threat_updates.lock"
AGENTS_LOCK_FILE          = f"{STATE_DIR}/agents.lock"

# ── 수집 기본값 ────────────────────────────────────────────────────────────────
DEFAULT_STATE_FROM = "2025-01-01T00:00:00.000000Z"
MAX_BATCHES        = 10

# ── Activity 타입 (threat_updates) ────────────────────────────────────────────
ACTIVITY_TYPES = "4020,4021,4022,2030,2028,2036,2037,4008"

# ── state 디렉토리 보장 ────────────────────────────────────────────────────────
from pathlib import Path
Path(STATE_DIR).mkdir(parents=True, exist_ok=True)

