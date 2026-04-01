# setup/scripts/

CruxSIEM 서비스 시작·중지·상태 확인 쉘 스크립트 모음.

---

## 파일 목록

| 파일 | 역할 |
|------|------|
| `setup.sh` | 전체 초기 설치 (인덱스 생성 + 초기 데이터 삽입) |
| `start.sh` | 백엔드·프론트엔드 시작 |
| `stop.sh` | 서비스 중지 |
| `status.sh` | 서비스 상태 확인 |

> 현재 원본 스크립트: `scripts/` (all.sh, backend.sh, frontend.sh 등) — 정리 예정

---

## 서비스 구성 개요

```
OpenSearch     → systemd (opensearch.service)
Kafka          → systemd (kafka.service)
Vector         → systemd (vector.service)
Dashboards/    → docker compose (setup/OPA/platform/)
Kafbat/HB
CruxSIEM API   → uvicorn (backend.sh)
CruxSIEM UI    → nginx (빌드된 dist/ 서빙)
```

---

## 빠른 참조

### 백엔드 시작 (개발)
```bash
conda activate cruxsiem
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 프론트엔드 빌드 및 배포
```bash
cd frontend
npm run build
# dist/ 를 nginx로 서빙
```

### 전체 시스템 상태 확인
```bash
systemctl --user status opensearch kafka vector
docker compose -f setup/OPA/platform/docker-compose.yml ps
```

### PID 파일 위치
```
/core/opensearch/opensearch.pid
/core/kafka/kafka.pid
scripts/pid/backend.pid
scripts/pid/frontend.pid
```

