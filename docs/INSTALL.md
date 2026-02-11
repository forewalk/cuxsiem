# 설치 가이드

## 사전 요구사항

| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| Miniconda / Anaconda | 최신 | Python 가상환경 관리 |
| Python | 3.11 | 백엔드 런타임 |
| Node.js | 20 LTS 이상 | 프론트엔드 빌드 |
| npm | 10 이상 | 프론트엔드 패키지 관리 |
| Git | 최신 | 버전 관리 |

---

## 로컬 PC 개발 환경

### 1. 저장소 클론

```bash
git clone http://cruxdata.co.kr:9090/cruxsiem/web.git
cd web
```

### 2. Conda 가상환경 설정

```bash
conda create -n cruxsiem python=3.11
conda activate cruxsiem
```

> 이후 모든 백엔드 작업은 `cruxsiem` 가상환경이 활성화된 상태에서 진행합니다.

### 3. 백엔드 설정

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
```

`.env.example`을 복사하면 개발 서버 접속 정보가 기본 설정되어 있습니다:

```dotenv
OPENSEARCH_HOST=ns1.cruxdata.co.kr
OPENSEARCH_PORT=11723
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=admin
OPENSEARCH_USE_SSL=true
OPENSEARCH_VERIFY_CERTS=false
```

### 4. 프론트엔드 설정

```bash
cd frontend
npm install
cp .env.example .env
```

`.env` 파일 확인:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

### 5. 개발 서버 실행

```bash
# 터미널 1 - 백엔드
conda activate cruxsiem
cd backend
uvicorn app.main:app --reload

# 터미널 2 - 프론트엔드
cd frontend
npm run dev
```

### 6. 접속 확인

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:8000 |
| 헬스체크 | http://localhost:8000/health |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## 서버 정보

### OpenSearch

| 항목 | 값 |
|------|-----|
| 호스트 | ns1.cruxdata.co.kr |
| 포트 | 11723 |
| 인증 | administrator / admin |
| SSL | 사용 (인증서 검증 비활성) |

### Git (GitLab)

| 항목 | 값 |
|------|-----|
| URL | http://cruxdata.co.kr:9090/cruxsiem/web.git |
| 기본 브랜치 | main |
| 개발 브랜치 | develop |

### Docker Image Registry

| 항목 | 값 |
|------|-----|
| Registry | (추후 설정) |
| 이미지명 | cruxsiem-backend, cruxsiem-frontend |
