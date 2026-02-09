# cruxSIEM

SIEM (Security Information and Event Management) 웹 애플리케이션.

보안 로그 수집, 검색, 분석, 시각화를 위한 통합 보안 관제 플랫폼.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | FastAPI + Python 3.11 + opensearch-py |
| 프론트엔드 | React 18 + TypeScript + Vite + MUI |
| 데이터베이스 | OpenSearch |
| 데이터 파이프라인 | Kafka + Vector |
| 배포 | Docker + Docker Compose, Nginx |

## 프로젝트 구조

```
cruxsiem/
├── backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── api/v1/       # REST API 엔드포인트
│   │   ├── core/         # 설정, OpenSearch 클라이언트
│   │   ├── models/       # 데이터 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── repositories/ # 데이터 접근 계층
│   │   └── services/     # 비즈니스 로직
│   └── tests/
├── frontend/             # React 프론트엔드
│   └── src/
│       ├── components/   # 공통 컴포넌트
│       ├── pages/        # 페이지
│       ├── services/     # API 클라이언트
│       ├── theme/        # MUI 테마
│       └── routes/       # 라우팅
└── docs/                 # 프로젝트 문서
```

## 빠른 시작

```bash
# 백엔드
conda create -n cruxsiem python=3.11
conda activate cruxsiem
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 관리자 계정 생성

초기 설치 시 관리자(admin) 계정은 자동으로 생성되지 않습니다. 백엔드 컨테이너 내부 또는 로컬 환경에서 별도의 스크립트를 실행하여 생성해야 합니다.

```bash
# 컨테이너 내부에서 실행 시 (추천)
docker compose exec backend python scripts/create_admin.py

# 또는 옵션과 함께 실행
docker compose exec backend python scripts/create_admin.py --username myadmin --email admin@example.com

# 로컬 환경에서 실행 시 (backend 디렉토리)
python scripts/create_admin.py
```

## 배포 전략 (오프라인 환경)

이 프로젝트는 인터넷이 차단된 **오프라인 서버 환경**에 배포되는 것을 전제로 합니다.
따라서 로컬 개발 환경이나 CI/CD 서버에서 Docker 이미지를 빌드한 후, `docker save`로 `.tar` 파일로 압축하여 서버로 전달하는 방식을 사용합니다.

### Docker 빌드 필수

Client PC(개발자 PC)의 OS 환경(Windows, macOS 등)에 따른 줄바꿈 문자(CRLF/LF) 문제나 라이브러리 호환성 문제를 방지하기 위해, **모든 빌드 및 패키징은 Docker 컨테이너 내부에서 수행**하는 것을 원칙으로 합니다.

```bash
# 예시: 오프라인 배포용 이미지 저장
docker compose build
docker save cruxsiem-backend:latest | gzip > cruxsiem-backend.tar.gz
docker save cruxsiem-frontend:latest | gzip > cruxsiem-frontend.tar.gz
```

## 문서

| 문서 | 내용 |
|------|------|
| [INSTALL.md](docs/INSTALL.md) | 개발 환경 설치 가이드 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처 |
| [GIT_GUIDE.md](docs/GIT_GUIDE.md) | Git 브랜치 전략 및 작업 가이드 |
| [DEPLOY.md](docs/DEPLOY.md) | Docker 빌드 및 서버 배포 가이드 |
| [ROADMAP.md](ROADMAP.md) | 기능 개발 로드맵 |
| [ASSISTANT.md](ASSISTANT.md) | AI 공통 개발 가이드 (프로젝트 규칙, 아키텍처, 워크플로우) |
| [CLAUDE.md](CLAUDE.md) | AI 진입점 - Claude (ASSISTANT.md 참조) |
| [GEMINI.md](GEMINI.md) | AI 진입점 - Gemini (ASSISTANT.md 참조) |

## 참여자

| 이름 | 역할 |
|------|------|
| 김장훈 | 오케스트레이터 |
| 박지은 | 메인 개발 |
| 김경인 | 서브 개발 |
| 최지호 | 서브 개발 |
| 김경수 | 서브 개발 |
| 박상현 | 서브 개발 |
| 박재현 | 서브 개발 |
| 전성욱 | 서브 개발 |
