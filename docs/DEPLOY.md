# CruxSIEM 배포 가이드

## 개요

CruxSIEM 애플리케이션을 Docker 이미지로 빌드하여, 인터넷이 차단된 폐쇄망 온프레미스 서버에 배포하는 절차를 설명합니다.

### 아키텍처

```
┌───────────────────────────────────────────────────┐
│            Host (Rocky Linux 9.7)                 │
│                                                   │
│  ┌──────────┐  ┌──────────┐   ┌───────────────┐  │
│  │ frontend │  │ backend  │   │  OpenSearch    │  │
│  │ (Nginx)  │  │ (Uvicorn)│──►│  (호스트/별도) │  │
│  │ :80      │  │ :8000    │   │  :9200         │  │
│  └────┬─────┘  └────┬─────┘   └───────────────┘  │
│       │              │                             │
│       └── docker network ──┘                       │
└───────────────────────────────────────────────────┘
```

- **frontend**: Nginx 컨테이너 (정적 파일 서빙 + API 리버스 프록시)
- **backend**: Uvicorn 컨테이너 (FastAPI 앱)
- **OpenSearch**: 호스트 또는 별도 서버에 설치

---

## 1. 사전 요구사항

### 개발 PC (빌드 환경)

- Docker Engine 20.10 이상
- Docker Compose v2 이상
- Git (Windows의 경우 Git Bash 사용 권장)
- **주의:** 빌드 스크립트(`*.sh`)는 반드시 **LF (Line Feed)** 줄바꿈 형식을 유지해야 합니다. Windows에서 작업 시 Git 설정(`core.autocrlf`)이나 `.gitattributes`가 올바르게 설정되어 있는지 확인하세요.

### 배포 서버 (대상 환경)

- OS: Rocky Linux 9.7 (또는 RHEL 호환)
- Docker Engine 20.10 이상
- Docker Compose v2 이상
- OpenSearch (호스트 또는 별도 서버에 설치 완료)

---

## 2. 빌드 (개발 PC)

### 2-1. 이미지 빌드 및 패키징

```bash
# 프로젝트 루트에서 실행
./scripts/build.sh

# 버전 태그 지정 시
./scripts/build.sh 1.0.0
```

빌드가 완료되면 `dist/` 폴더에 다음 파일들이 생성됩니다:

| 파일 | 설명 |
|------|------|
| `cruxsiem-images-{version}.tar.gz` | Docker 이미지 아카이브 |
| `docker-compose.yml` | 컨테이너 오케스트레이션 설정 |
| `.env.production.example` | 환경변수 템플릿 |
| `deploy.sh` | 배포 스크립트 |

### 2-2. 파일 전달

생성된 `dist/` 폴더의 파일들을 배포 서버로 전달합니다.

전달 방법: USB, 공유 폴더, OneDrive 등

---

## 3. 배포 (대상 서버)

### 3-1. 파일 배치

```bash
# 배포 디렉토리 생성
mkdir -p /opt/cruxsiem
cd /opt/cruxsiem

# 전달받은 파일 복사
cp /path/to/dist/* .
```

배포 디렉토리 구조:
```
/opt/cruxsiem/
├── cruxsiem-images-latest.tar.gz
├── docker-compose.yml
├── .env.production.example
└── deploy.sh
```

### 3-2. 환경변수 설정

```bash
cp .env.production.example .env.production
vi .env.production
```

**반드시 수정해야 할 항목:**

| 변수 | 설명 | 예시 |
|------|------|------|
| `OPENSEARCH_HOST` | OpenSearch 호스트 | `host.docker.internal` 또는 서버 IP |
| `OPENSEARCH_PORT` | OpenSearch 포트 | `9200` |
| `OPENSEARCH_USER` | OpenSearch 인증 사용자 | `admin` |
| `OPENSEARCH_PASSWORD` | OpenSearch 인증 비밀번호 | (설정한 비밀번호) |
| `OPENSEARCH_USE_SSL` | SSL 사용 여부 | `true` |

> `host.docker.internal`은 Docker 컨테이너에서 호스트 머신을 가리키는 특수 DNS 이름입니다.
> OpenSearch가 호스트에 설치되어 있으면 이 주소를 사용합니다.

### 3-3. 배포 실행

```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

또는 수동으로:

```bash
# 이미지 로드
docker load < cruxsiem-images-latest.tar.gz

# 컨테이너 시작
docker compose up -d
```

### 3-4. 배포 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# DB 연결 테스트 (중요)
docker compose exec backend python test_db.py

# 로그 확인
docker compose logs -f
```

---

## 4. 운영

### 환경 변수 및 DB 연결 관리

서버마다 달라지는 설정(DB 주소, 비밀번호 등)은 **이미지를 새로 빌드할 필요 없이** 배포 서버의 `.env.production` 파일만 수정하면 됩니다.

1. `.env.production` 파일 수정
   ```bash
   vi /opt/cruxsiem/.env.production
   ```
2. 컨테이너 재시작으로 변경 사항 적용
   ```bash
   docker compose down
   docker compose up -d
   ```
   > **Note:** `docker compose restart`만으로는 환경변수 변경이 적용되지 않을 수 있으므로 `down` 후 `up`을 권장합니다.

### 서비스 관리

```bash
# 컨테이너 중지
docker compose down

# 컨테이너 재시작
docker compose restart

# 로그 확인
docker compose logs -f
docker compose logs -f backend    # 백엔드만
docker compose logs -f frontend   # 프론트엔드만
```

### 업데이트 배포

1. 개발 PC에서 새 버전 빌드: `./scripts/build.sh 1.1.0`
2. `dist/` 파일들을 서버로 전달
3. 서버에서 배포: `./deploy.sh 1.1.0`
   - 기존 컨테이너 자동 중지 → 새 이미지 로드 → 재시작

### 데이터 관리

- OpenSearch 데이터는 별도 볼륨 또는 호스트에 저장되므로 컨테이너 재시작과 무관하게 유지됩니다.
- 데이터 백업/복원은 OpenSearch snapshot API를 활용합니다.

---

## 5. 트러블슈팅

### 백엔드가 OpenSearch에 연결하지 못할 때

```bash
# 1. 환경변수 확인
cat .env.production | grep OPENSEARCH

# 2. OpenSearch 실행 여부 확인
curl -k https://localhost:9200

# 3. Docker 컨테이너에서 OpenSearch 접속 테스트
docker compose exec backend python -c "
from opensearchpy import OpenSearch
client = OpenSearch(hosts=[{'host': 'host.docker.internal', 'port': 9200}])
print(client.info())
"
```

### 프론트엔드에서 API 호출 실패 시

```bash
# Nginx 로그 확인
docker compose logs frontend

# 백엔드 컨테이너 직접 접속 테스트
docker compose exec frontend curl http://backend:8000/health
```

### 컨테이너가 시작되지 않을 때

```bash
# 상세 로그 확인
docker compose logs --tail=50

# 개별 컨테이너 상태
docker compose ps -a

# 이미지가 정상 로드되었는지 확인
docker images | grep cruxsiem
```

### 포트 충돌 시

```bash
# 80번 포트 사용 중인 프로세스 확인
sudo ss -tlnp | grep :80

# docker-compose.yml에서 포트 변경
# ports: - "8080:80"  # 80 대신 8080 사용
```
