# CruxSIEM

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

## 문서

| 문서 | 내용 |
|------|------|
| [INSTALL.md](docs/INSTALL.md) | 개발 환경 설치 가이드 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처 |
| [GIT_GUIDE.md](docs/GIT_GUIDE.md) | Git 브랜치 전략 및 작업 가이드 |
| [DEPLOY.md](docs/DEPLOY.md) | Docker 빌드 및 서버 배포 가이드 |
| [CLAUDE.md](CLAUDE.md) | AI 개발 가이드 (Claude) |
| [GEMINI.md](GEMINI.md) | AI 개발 가이드 (Gemini) |

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
