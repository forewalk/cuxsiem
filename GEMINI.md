# GEMINI.md

이 파일은 Gemini가 이 저장소에서 작업할 때 참조하는 가이드입니다.

## 프로젝트 개요

SIEM (Security Information and Event Management) 웹 애플리케이션. 9단계 워크플로우 시스템을 통한 체계적 기능 개발.

**기술 스택:**
- 백엔드: FastAPI + Python 3.11 + SQLAlchemy (async) + Alembic
- 프론트엔드: React 18 + TypeScript + Vite
- 데이터베이스: PostgreSQL (주 RDB), OpenSearch (로그/검색)
- 데이터 파이프라인: Kafka + Vector
- 배포: Docker + Docker Compose, Nginx 리버스 프록시

## 빌드 및 실행 명령어

### 백엔드
```bash
conda create -n infolink python=3.11
conda activate infolink
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 프론트엔드
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 테스트
```bash
pytest                                              # 전체 테스트
pytest tests/test_repositories/test_{feature}.py -v # 단일 테스트 파일
pytest --cov=app --cov-report=html                  # 커버리지 포함
```

### 린트 및 타입 체크
```bash
flake8 app/
mypy app/
```

### 데이터베이스 마이그레이션
```bash
alembic revision --autogenerate -m "add {feature} table"
alembic upgrade head
alembic downgrade -1
```

### API 문서
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 아키텍처

### 백엔드 레이어 구조
```
Endpoint (app/api/v1/endpoints/)   -- HTTP 요청/응답, 인증
    ↓
Service (app/services/)            -- 비즈니스 로직, 검증
    ↓
Repository (app/repositories/)     -- 데이터 접근, CRUD
    ↓
Model (app/models/)                -- SQLAlchemy ORM 정의
    ↓
PostgreSQL / OpenSearch
```

모든 레이어는 **async/await** 사용. DB 세션은 `get_db()`에서 `AsyncSession`으로 주입.

### 기능별 파일 패턴
기능 구현 시 생성되는 파일:
```
app/models/{feature}.py
app/schemas/{feature}.py
app/repositories/{feature}.py
app/services/{feature}.py
app/api/v1/endpoints/{feature}.py
alembic/versions/xxx_add_{feature}_table.py
tests/test_repositories/test_{feature}.py
tests/test_services/test_{feature}.py
tests/test_api/test_{feature}.py
```

### 스키마 패턴 (Pydantic)
- `{Feature}Base` -- 공통 필드
- `{Feature}Create` -- 생성용 (필수 필드)
- `{Feature}Update` -- 수정용 (모두 Optional)
- `{Feature}Response` -- 응답용 (id + timestamps), `from_attributes = True`

### 데이터베이스 규칙
- **테이블명:** snake_case, 복수형 (`users`, `order_items`)
- **컬럼명:** snake_case (`created_at`, `user_id`)
- **Primary Key:** `id` BIGINT 자동 증가
- **타임스탬프:** `created_at`, `updated_at` (서버 기본값), `deleted_at` (nullable)
- **Soft delete:** 모든 모델은 `deleted_at` 컬럼 사용, 조회 시 삭제된 레코드 필터링
- **Foreign Key:** `{table}_id` 형식
- **Boolean 필드:** `is_`, `has_`, `can_`, `should_` 접두사

### 네이밍 규칙
- **모델:** PascalCase (`EmailVerification`)
- **리포지토리:** `{Feature}Repository`
- **서비스:** `{Feature}Service`
- **함수:** snake_case (`get_user`, `create_order`)
- **API 경로:** kebab-case (`/api/v1/email-verification`)

### RESTful 엔드포인트 패턴
```
POST   /api/v1/{features}         -- 생성 (201)
GET    /api/v1/{features}         -- 목록 조회, 페이지네이션 (200)
GET    /api/v1/{features}/{id}    -- 단건 조회 (200)
PUT    /api/v1/{features}/{id}    -- 수정 (200)
DELETE /api/v1/{features}/{id}    -- 삭제 (204)
```

새 라우터는 `app/api/v1/endpoints/__init__.py`에 등록.

## 9단계 개발 워크플로우

슬래시 커맨드를 활용한 체계적 기능 개발:

```
1. /workflow-start {feature}    -- 워크플로우 문서 스캐폴드 생성
2. /review-spec {feature}       -- AI 기획서 검토
3. /finalize-spec {feature}     -- 기획서 확정 (대화형)
4. /create-dev-plan {feature}   -- AI 개발 계획 생성
5. /approve-dev-plan {feature}  -- 개발 계획 승인
6. /develop {feature}           -- AI 코드 구현
7. /test {feature}              -- AI 테스트 실행
8. (수동 코드 리뷰)
9. /create-docs {feature}       -- AI 기술 문서 생성
```

워크플로우 문서: `docs/workflows/{feature}/` (예: `1_{feature}_spec.md` ~ `9_{feature}_technical_doc.md`)

템플릿: `.claude/workflow/templates/` / 슬래시 커맨드: `.claude/commands/`

## 중요: 한글 문서 인코딩

한글 마크다운 문서 생성 시 **반드시 Bash heredoc 문법 사용**:

```bash
cat << 'EOF' > docs/workflows/{feature}/1_{feature}_spec.md
# 한글 제목
내용...
EOF
```

## 프로덕션 아키텍처

- **웹:** FastAPI + Uvicorn (백엔드), Nginx + React 빌드 (프론트엔드)
- **데이터 파이프라인:** Kafka -> Vector -> OpenSearch
- **시각화:** OpenSearch Dashboard
- **Git 전략:** `feature/*` -> `develop` -> `main` (`hotfix/*`는 긴급 수정용)
- **CI/CD:** Docker Build -> Test -> Image Push -> Deploy (`main` 푸시 시 트리거)
