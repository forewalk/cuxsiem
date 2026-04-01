# setup/

CruxSIEM 신규 설치 및 데모 환경 구성 파일 모음.

---

## 서버 구성 (3-Node 기준)

| 호스트 | 역할 | 주요 포트 |
|--------|------|-----------|
| `sentinel` | OpenSearch | 9200 |
| `pipeline` | Kafka (KRaft) | 9092, 9093 |
| `webui` | CruxSIEM (백엔드·프론트), OpenSearch Dashboards, Kafbat | 443, 5601, 8080 |

> 단일 서버 데모 환경에서는 하나의 서버에 모두 설치 가능.

---

## 설치 순서

```
1. opensearch/   → OpenSearch 설치 및 인덱스 초기화
2. kafka/        → Kafka (KRaft) 설치 및 토픽 생성
3. vector/       → Vector 파이프라인 설치 및 스크립트 설정
4. platform/     → Docker Compose (OpenSearch Dashboards, Kafbat, Heartbeat)
5. env/          → 환경변수 파일 복사 및 값 입력
6. scripts/      → 백엔드·프론트엔드 시작
```

---

## 폴더 구조

```
setup/
├── README.md           ← 이 파일
├── opensearch/         ← OpenSearch 설치·설정·인덱스 초기화
├── kafka/              ← Kafka 설치·KRaft 설정·토픽 생성
├── vector/             ← Vector 파이프라인 설정·SentinelOne 수집 스크립트
├── platform/           ← 모니터링 Docker Compose (Dashboards, Kafbat, Heartbeat)
├── env/                ← 환경변수 예시 파일
└── scripts/            ← 서비스 시작·중지·상태 쉘 스크립트
```

---

## 스키마 동기화 규칙

`cs_` 인덱스 구조나 초기 데이터가 변경될 때마다 반드시 `setup/opensearch/` 파일도 업데이트해야 한다.

| 변경 유형 | 업데이트 대상 |
|-----------|--------------|
| 새 cs_ 인덱스 추가 | `opensearch/1_index_cruxsiem.json` |
| 초기 데이터 변경 | `opensearch/4_data_*.json` ~ `7_data_*.json` |
| 환경변수 항목 변경 | `env/backend.env.example`, `env/frontend.env.example` |

