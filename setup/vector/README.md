# setup/vector/

Vector 데이터 파이프라인 설치 및 설정 가이드.
SentinelOne API → Kafka → OpenSearch 데이터 흐름 담당.

---

## 설치 환경

- 설치 경로: `/core/vector/`
- 설정 파일: `/conf/vector/vector.yaml`
- 스크립트 위치: `/conf/vector/scripts/`
- 상태 파일 경로: `/data/vector/state/`
- 실패 로그(DLQ): `/data/vector/dlq/failed-%Y-%m-%d-%H.log`

---

## 데이터 흐름

```
SentinelOne API (90s/120s/300s 주기)
    ↓ fetch_threats.py / fetch_threat_updates.py / fetch_agents.py
Kafka Topics (threats / agents / edg / heartbeat)
    ↓
Vector Transforms (타임스탬프 파싱, 필드 정규화)
    ↓
OpenSearch
    ├── logs-sentinel_one.threats
    ├── logs-sentinel_one.agents
    ├── logs-sentinel_one.edr
    └── heartbeat
```

---

## 주요 설정값 (`vector.yaml`)

```yaml
data_dir: /data/vector/state

# Kafka 소스 공통
bootstrap_servers: pipeline:9092
group_id: vector
auto_offset_reset: earliest
session_timeout_ms: 10000
decoding.codec: json

# OpenSearch 싱크 공통
endpoints: https://opensearch:9200
auth.user: admin
auth.password: <비밀번호>
tls.verify_certificate: true
tls.verify_hostname: false
```

> 실제 설정 파일: `setup/OPA/vector/vector.yaml`

---

## SentinelOne 수집 스크립트 (`scripts/config.py`)

```python
# Kafka
KAFKA_BOOTSTRAP = "pipeline:9092"
KAFKA_TOPIC_THREATS = "threats"
KAFKA_TOPIC_AGENTS = "agents"

# SentinelOne API
BASE_URL = "https://<SENTINELONE_DOMAIN>/web/api/v2.1"
ACCOUNT_ID = "<ACCOUNT_ID>"
API_TOKEN = "<API_TOKEN>"

# 상태 파일 경로
STATE_DIR = "/data/vector/state/"
DEFAULT_STATE_FROM = "2025-01-01T00:00:00.000000Z"
MAX_BATCHES = 10
```

> **주의:** API_TOKEN은 환경변수 또는 비밀 관리 시스템으로 관리할 것.

---

## 수집 스크립트별 역할

| 스크립트 | 실행 주기 | 설명 |
|----------|-----------|------|
| `fetch_threats.py` | 90초 | SentinelOne 신규 위협 증분 수집 (상태 파일로 추적) |
| `fetch_threat_updates.py` | 120초 | Activity 기반 위협 업데이트 수집 |
| `fetch_agents.py` | 300초 | 에이전트 전체 목록 수집 (cursor 페이지네이션) |

---

## systemd 서비스 등록

```bash
cp setup/OPA/vector/systemd/user/vector.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable vector
systemctl --user start vector
```

### vector.service 주요 설정

```ini
ExecStartPre=/core/vector/bin/vector validate /conf/vector/vector.yaml
ExecStart=/core/vector/bin/vector --config /conf/vector/vector.yaml
Restart=on-failure
RestartSec=10s
StandardOutput=append:/logs/vector/vector.log
StandardError=append:/logs/vector/vector.log
```

---

## 필수 의존성

```bash
# Python 패키지 (수집 스크립트용)
pip install kafka-python requests

# Vector 바이너리 설치
curl --proto '=https' --tlsv1.2 -sSfL https://sh.vector.dev | bash
```

---

## 상태 파일 관리

Vector 스크립트는 수집 재개 지점을 파일로 추적:

| 파일 | 내용 |
|------|------|
| `/data/vector/state/threats.state` | 마지막 수집 타임스탬프 |
| `/data/vector/state/threats.lock` | 중복 실행 방지 락 |
| `/data/vector/state/threat_updates.state` | 마지막 activity ID |
| `/data/vector/state/agents.lock` | 에이전트 수집 락 |

> 초기화 시: `rm -f /data/vector/state/*.state` (처음부터 재수집)

