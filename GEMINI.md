# GEMINI.md

이 파일은 Gemini가 이 저장소에서 작업할 때 참조하는 가이드입니다.

## 언어 규칙

- **모든 대화와 문서는 한글로 작성**
- 코드 주석도 한글 사용 권장
- 커밋 메시지도 한글 가능

## 프로젝트 개요

SIEM (Security Information and Event Management) 웹 애플리케이션. 9단계 워크플로우 시스템을 통한 체계적 기능 개발.

**기술 스택:**
- 백엔드: FastAPI + Python 3.11 + opensearch-py
- 프론트엔드: React 18 + TypeScript + Vite + MUI (Material UI)
- 데이터베이스: OpenSearch (로그/검색/저장)
- 데이터 파이프라인: Kafka + Vector
- 배포: Docker + Docker Compose, Nginx 리버스 프록시

### 환경 설정
- DB 서버 정보: `docs/INSTALL.md` 참조
- 환경변수: `backend/.env`, `frontend/.env` (`.env.example` 복사 후 수정)
- AI 개발툴은 CLAUDE와 GEMINI를 사용, 따라서 `CLAUDE.md`, `GEMINI.md`를 항상 같은 내용으로 갱신

## 빌드 및 실행 명령어

### 백엔드
```bash
conda create -n cruxsiem python=3.11
conda activate cruxsiem
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
Model (app/models/)                -- 데이터 모델 정의
    ↓
OpenSearch
```

모든 레이어는 **async/await** 사용. OpenSearch 클라이언트는 `get_opensearch()`로 주입.

### 기능별 파일 패턴
기능 구현 시 생성되는 파일:
```
app/models/{feature}.py
app/schemas/{feature}.py
app/repositories/{feature}.py
app/services/{feature}.py
app/api/v1/endpoints/{feature}.py
tests/test_repositories/test_{feature}.py
tests/test_services/test_{feature}.py
tests/test_api/test_{feature}.py
```

### 스키마 패턴 (Pydantic)
- `{Feature}Base` -- 공통 필드
- `{Feature}Create` -- 생성용 (필수 필드)
- `{Feature}Update` -- 수정용 (모두 Optional)
- `{Feature}Response` -- 응답용 (id + timestamps), `from_attributes = True`

### OpenSearch 인덱스 규칙
- **인덱스명:** snake_case, 복수형 (`users`, `log_events`)
- **필드명:** snake_case (`created_at`, `user_id`)
- **타임스탬프:** `created_at`, `updated_at`, `deleted_at` (nullable)
- **Soft delete:** `deleted_at` 필드 사용, 조회 시 삭제된 문서 필터링
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

### 프론트엔드 구조
```
frontend/src/
├── components/       # 공통 재사용 컴포넌트
├── pages/            # 페이지 단위 컴포넌트
├── hooks/            # 커스텀 훅
├── services/         # API 호출 (axios)
├── theme/            # MUI 테마 설정
├── types/            # TypeScript 타입 정의
├── utils/            # 유틸리티 함수
├── routes/           # React Router 라우트 정의
├── main.tsx          # 엔트리 (ThemeProvider, RouterProvider)
└── App.tsx           # 루트 컴포넌트
```

### 프론트엔드 규칙
- **UI 라이브러리:** MUI (Material UI) 사용
  - `@mui/material` -- 코어 컴포넌트 (Button, TextField, Typography 등)
  - `@mui/icons-material` -- 아이콘
  - `@mui/x-data-grid` -- 데이터 테이블
  - `@mui/x-date-pickers` + `dayjs` -- 날짜 선택
- **상태 관리:** React 기본 훅 (useState, useReducer, useContext)
- **라우팅:** react-router-dom (createBrowserRouter)
- **HTTP 클라이언트:** axios (`src/services/api.ts`)
- **경로 별칭:** `@/` = `src/` (예: `import theme from "@/theme"`)
- **테마:** 다크 모드 기본, `src/theme/index.ts`에서 관리

### MUI (Material UI) 테마 및 공통 컴포넌트

#### 테마 구조

MUI ThemeProvider를 사용하여 라이트/다크 테마를 관리:
- `src/theme/types.ts` - Palette 타입 확장 (`custom.bgTertiary`, `custom.borderColor`)
- `src/theme/theme.ts` - `getTheme(mode)` 함수 (기존 CSS 변수 색상을 MUI palette에 매핑)
- `src/theme/index.ts` - barrel export

`App.tsx`에서 `useThemeStore().theme`을 읽어 `useMemo`로 MUI Theme를 생성하고, `<ThemeProvider>` + `<CssBaseline />`으로 래핑.

#### 색상 매핑

| 용도 | MUI palette | 라이트 | 다크 |
|------|-------------|--------|------|
| 액션 버튼 | `primary.main` | `#4A90D9` | `#5B9BD5` |
| 로그인/확인 버튼 | `secondary.main` | `#4CAF50` | `#4CAF50` |
| 기본 배경 | `background.default` | `#FAFAFA` | `#1A1A1A` |
| 카드 배경 | `background.paper` | `#FFFFFF` | `#2D2D2D` |
| 3차 배경 | `custom.bgTertiary` | `#F5F5F5` | `#3D3D3D` |
| 기본 텍스트 | `text.primary` | `#1A1A1A` | `#FFFFFF` |
| 보조 텍스트 | `text.secondary` | `#666666` | `#AAAAAA` |
| 비활성 텍스트 | `text.disabled` | `#999999` | `#888888` |
| 테두리 | `custom.borderColor` | `#CCCCCC` | `#444444` |
| 구분선 | `divider` | `#E5E5E5` | `#3D3D3D` |

#### 공통 레이아웃 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `AppLayout` | `components/layout/AppLayout.tsx` | 페이지 래퍼 (AppHeader + Container + 배경) |
| `AppHeader` | `components/layout/AppHeader.tsx` | AppBar + Toolbar (타이틀, 뒤로가기, 언어/테마/로그아웃) |
| `ThemeToggle` | `components/common/ThemeToggle.tsx` | 다크모드 토글 IconButton |
| `LanguageSelect` | `components/common/LanguageSelect.tsx` | MUI Select 기반 언어 선택 |

**사용법:**
```tsx
// 기본 페이지 레이아웃 (헤더 + 컨텐츠)
<AppLayout title="페이지 제목">
  <Paper elevation={1}>내용</Paper>
</AppLayout>

// 뒤로가기 버튼 포함
<AppLayout title="상세" showBack backTo="/board">
  <Paper>내용</Paper>
</AppLayout>
```

`AppLayout`은 AppHeader(언어 선택, 다크모드 토글, 로그아웃 버튼 포함) + Container를 자동으로 구성하므로, 개별 페이지에서 헤더를 중복 구현할 필요가 없음.

#### 모달 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `GuestModeModal` | `components/common/GuestModeModal.tsx` | MUI Dialog 기반 비회원 모드 안내 |
| `LoginRequiredModal` | `components/common/LoginRequiredModal.tsx` | MUI Dialog 기반 로그인 필수 안내 |

**새 모달 작성 시 패턴:**
```tsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

<Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
  <DialogTitle>제목</DialogTitle>
  <DialogContent>내용</DialogContent>
  <DialogActions>
    <Button variant="outlined" onClick={onClose}>취소</Button>
    <Button variant="contained" color="secondary" onClick={onConfirm}>확인</Button>
  </DialogActions>
</Dialog>
```

#### MUI 컴포넌트 사용 규칙

- **인라인 스타일 금지**: `style={{}}` 대신 MUI의 `sx` prop 사용
- **색상 참조**: 하드코딩 대신 palette 참조 (예: `color="text.secondary"`, `sx={{ bgcolor: 'background.paper' }}`)
- **버튼 색상 구분**: 일반 액션은 `color="primary"`, 로그인/확인 계열은 `color="secondary"`, 삭제는 `color="error"`
- **카드/패널**: `Paper elevation={1}` 또는 `Card` 사용
- **아이콘**: `@mui/icons-material`에서 개별 import (예: `import EditIcon from '@mui/icons-material/Edit'`)
- **레이아웃**: 페이지는 `AppLayout`으로 감싸고, 내부는 `Box`, `Stack`, `Container` 활용

### i18n (다국어 지원)

- react-i18next 사용, 기본 언어: 한국어 (`ko`), 폴백: 영어 (`en`)
- 네임스페이스: `common`, `auth`, `board` 등 기능별 분리
- 번역 파일: `src/i18n/locales/{ko,en}/{namespace}.json`
- 새 기능 추가 시 해당 네임스페이스 JSON 파일을 ko/en 모두 생성

## 9단계 개발 워크플로우

> **필수:** 모든 기능 개발은 반드시 이 워크플로우를 따른다.
> 슬래시 커맨드(`.claude/commands/`)와 템플릿(`.claude/workflow/templates/`)을 사용한다.

### 워크플로우 리소스 위치

| 경로 | 내용 |
|------|------|
| `.claude/commands/` | 슬래시 커맨드 정의 (workflow-start, review-spec, develop 등) |
| `.claude/workflow/templates/` | 단계별 문서 템플릿 (1_spec ~ 9_technical_doc) |
| `.claude/workflow/workflow_templates/` | 워크플로우 가이드 (WORKFLOW_GUIDE.md, WORKFLOW_README.md) |
| `docs/workflows/{feature}/` | 기능별 워크플로우 산출물 저장 위치 |

### 워크플로우 명령어

| 명령어 | 설명 |
|--------|------|
| `/workflow-start {기능}` | 워크플로우 폴더 및 템플릿 생성 |
| `/review-spec {기능}` | 기획서 검토 (2단계) |
| `/finalize-spec {기능}` | 기획서 확정 (3단계) |
| `/create-dev-plan {기능}` | 개발 계획 생성 (4단계) |
| `/approve-dev-plan {기능}` | 개발 계획 승인 (5단계) |
| `/develop {기능}` | 구현 실행 (6단계) |
| `/test {기능}` | 테스트 실행 (7단계) |
| `/create-docs {기능}` | 기술 문서 생성 (9단계) |

```
1.기획서작성(사람) → 2.AI검토 → 3.기획확정 → 4.개발계획(AI) → 5.계획승인
                                                                    ↓
                        9.문서화 ← 8.코드리뷰(사람) ← 7.테스트 ← 6.개발실행
```

산출물: `docs/workflows/{feature}/1_{feature}_spec.md` ~ `9_{feature}_technical_doc.md`

## 중요: 한글 문서 인코딩

한글 마크다운 문서 생성 시 **반드시 Bash heredoc 문법 사용** (Write 도구 대신):

```bash
cat << 'EOF' > docs/workflows/{feature}/1_{feature}_spec.md
# 한글 제목
내용...
EOF
```

## 프로젝트 문서

| 문서 | 내용 |
|------|------|
| `docs/ARCHITECTURE.md` | 전체 아키텍처 다이어그램 |
| `docs/INSTALL.md` | 로컬 PC 개발 환경 설치 가이드 |
| `docs/GIT_GUIDE.md` | Git 브랜치 전략 및 작업 가이드 |
| `docs/DEPLOY.md` | Docker 이미지 빌드 및 서버 배포 가이드 |
| `ROADMAP.md` | 기능 개발 로드맵 및 진행 체크리스트 |

## 프로덕션 아키텍처

- **웹:** FastAPI + Uvicorn (백엔드), Nginx + React 빌드 (프론트엔드)
- **데이터 파이프라인:** Kafka -> Vector -> OpenSearch
- **시각화:** OpenSearch Dashboard
- **Git 전략:** `feature/*` -> `develop` -> `main` (`hotfix/*`는 긴급 수정용)
- **CI/CD:** Docker Build -> Test -> Image Push -> Deploy (`main` 푸시 시 트리거)
