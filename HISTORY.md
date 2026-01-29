# HISTORY.md

## 작성 규칙

> **반드시 아래 형식을 따를 것. 서술형 문장 금지.**
>
> - 한 줄로 간결하게 작성
> - `[날짜] [작업자] [작업 유형] 내용` 형식
> - 작업 유형: `추가`, `수정`, `삭제`, `수리`, `리팩터`, `설정`
> - 예시: `2026-01-29 홍길동 추가 사용자 인증 API 엔드포인트`
> - **하지 말 것:** "사용자 인증 기능을 구현하였습니다" 같은 서술형

---

## 작업 이력

| 날짜 | 작업자 | 유형 | 내용 |
|------|--------|------|------|
| 2026-01-29 | 김장훈 | 추가 | .gitattributes, .editorconfig LF 개행 통일 및 OS간 빌드 오류 방지 |
| 2026-01-29 | 김경수 | 설정 | OpenSearch 구성 및 셋팅 |
| 2026-01-29 | 김장훈 | 설정 | 개발서버 2대 구성 (DB, AP) |
| 2026-01-29 | 김경인 | 추가 | `docs/figma/login/login.svg` 파일 생성 |
| 2026-01-29 | 김장훈 | 설정 | CLAUDE.md, GEMINI.md, HISTORY.md 생성 및 템플릿 파일 정리 |
| 2026-01-29 | 김장훈 | 추가 | 백엔드 기본 구조 (FastAPI + opensearch-py), PostgreSQL/SQLAlchemy/Alembic 제거 |
| 2026-01-29 | 김장훈 | 추가 | 프론트엔드 기본 구조 (React 18 + TypeScript + Vite + MUI) |
| 2026-01-29 | 김장훈 | 추가 | MUI 라이브러리 설치 (@mui/material, icons-material, x-data-grid, x-date-pickers) |
| 2026-01-29 | 김장훈 | 추가 | 프론트엔드 테마 설정 (다크 모드), axios API 클라이언트, React Router |
| 2026-01-29 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md OpenSearch 전용 + MUI 프론트엔드 반영 |
| 2026-01-29 | 김장훈 | 수정 | docs/ARCHITECTURE.md, docs/INSTALL.md 대문자 파일명 변경 및 내용 갱신 |
| 2026-01-29 | 김장훈 | 수정 | docs/GIT_GUIDE.md feature/기능명 브랜치 워크플로우 가이드 갱신 |
| 2026-01-29 | 김장훈 | 수정 | docs/DEPLOY.md OpenSearch 기반 Docker 배포 가이드 갱신 |
| 2026-01-29 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md 워크플로우 리소스 경로(.claude/) 필수 명시 |
| 2026-01-29 | 김장훈 | 설정 | OpenSearch 개발서버 접속정보 반영 (ns1.cruxdata.co.kr:11723) |
| 2026-01-29 | 김장훈 | 수정 | README.md 프로젝트 소개 및 참여자 정보 작성 |
| 2026-01-29 | 김장훈 | 설정 | 개발 시작 준비 완료 검증 (백엔드/프론트엔드 빌드 및 서버 기동 확인) |
