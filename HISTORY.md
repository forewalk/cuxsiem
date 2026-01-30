# HISTORY.md

## 작성 규칙

> **반드시 아래 형식을 따를 것. 서술형 문장 금지.**
>
> - 한 줄로 간결하게 작성
> - `[날짜 시간] [작업자] [작업 유형] 내용` 형식
> - 날짜 형식: `YYYY-MM-DD HH:MM`
> - 작업 유형: `추가`, `수정`, `삭제`, `수리`, `리팩터`, `설정`, `배포`
> - 예시: `2026-01-29 14:30 홍길동 추가 사용자 인증 API 엔드포인트`
> - **하지 말 것:** "사용자 인증 기능을 구현하였습니다" 같은 서술형
>
> ### 필수: 원격 Git Push 이력 기록
>
> **원격 Git에 Push할 때 반드시 이 파일에 이력을 남길 것.**
> - 작업 유형: `배포`
> - 내용에 브랜치명 명시 (예: `origin/develop push`, `origin/main push`)
> - Push 직전에 이 파일에 기록을 추가한 후 함께 커밋하여 Push
> - 예시: `2026-01-29 21:42 김장훈 배포 origin/develop push (ROADMAP, CLAUDE.md/GEMINI.md 동기화)`

---

## 작업 이력

| 날짜 | 작업자 | 유형 | 내용 |
|------|--------|------|------|
| 2026-01-30 19:40 | 김장훈 | 배포 | origin/feature/login push (RememberMe 제거, i18n 추가, 헤더 통합, 다크모드/언어 지속성) |
| 2026-01-30 19:35 | 김장훈 | 삭제 | RememberMe 기능 제거 (LoginPage.tsx, 다국어 파일 업데이트) |
| 2026-01-30 19:11 | 김장훈 | 배포 | origin/feature/login push (로그인 기능 완성, Figma 디자인 적용, 다국어 지원, UI 개선) |
| 2026-01-30 19:11 | 김장훈 | 수정 | frontend/src/pages/LoginPage.tsx Figma 디자인 기반 스타일 적용 및 헤더 리디자인 |
| 2026-01-30 19:11 | 김장훈 | 수정 | frontend/src/services/api.ts 로그인 페이지에서 401 에러 메시지 표시 처리 |
| 2026-01-30 19:11 | 김장훈 | 추가 | frontend/src/locales/ 다국어 지원 파일 (ko.json, en.json, ja.json) |
| 2026-01-30 19:11 | 김장훈 | 수정 | backend/app/core/security.py bcrypt 직접 사용으로 passlib 호환성 문제 해결 |
| 2026-01-30 19:11 | 김장훈 | 수정 | 프로젝트명 CruxSIEM → cruxSIEM 표기 통일 |
| 2026-01-30 15:30 | 김장훈 | 배포 | origin/develop push (OpenSearch 접속 설정 및 테스트, 인덱스 명명 규칙 변경) |
| 2026-01-30 15:30 | 김장훈 | 추가 | backend/test_opensearch_connection.py OpenSearch 접속 테스트 스크립트 |
| 2026-01-30 15:30 | 김장훈 | 수정 | backend/.env.example OPENSEARCH_USE_SSL=false 변경 (SSL 미사용) |
| 2026-01-30 15:30 | 김장훈 | 수정 | ASSISTANT.md OpenSearch 인덱스 명명 규칙 (.cs- → cs_) |
| 2026-01-29 22:50 | 김장훈 | 배포 | origin/develop push (HISTORY 규칙 강화, README 갱신, push 이력 의무화) |
| 2026-01-29 22:50 | 김장훈 | 수정 | README.md 문서 테이블에 ASSISTANT.md 추가, CLAUDE.md/GEMINI.md 설명 갱신 |
| 2026-01-29 22:48 | 김장훈 | 수정 | HISTORY.md 날짜+시간 형식 변경, 원격 Git Push 이력 기록 의무화 |
| 2026-01-29 22:48 | 김장훈 | 수정 | ASSISTANT.md 필수 행동 강령 추가 (Push 시 HISTORY.md 기록 의무) |
| 2026-01-29 22:32 | 김장훈 | 수정 | CLAUDE.md/GEMINI.md에 ASSISTANT.md 외 내용 추가 금지 명시 |
| 2026-01-29 22:31 | 김장훈 | 리팩터 | ASSISTANT.md 신규 생성, CLAUDE.md/GEMINI.md 공통 가이드 분리 |
| 2026-01-29 22:31 | 김장훈 | 배포 | origin/develop push (ASSISTANT.md 생성, CLAUDE.md/GEMINI.md 분리) |
| 2026-01-29 21:44 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md 내용 완전 동기화 (언어규칙, 환경설정 누락 보완) |
| 2026-01-29 21:44 | 김장훈 | 배포 | origin/develop push (CLAUDE.md/GEMINI.md 동기화) |
| 2026-01-29 21:41 | 김장훈 | 추가 | ROADMAP.md 기능 개발 로드맵 생성 |
| 2026-01-29 21:41 | 김장훈 | 수정 | CLAUDE.md MUI 테마/모달/i18n 내용 정리 및 중복 제거 |
| 2026-01-29 21:41 | 김장훈 | 수정 | GEMINI.md CLAUDE.md와 동기화 (MUI/i18n/테마/모달 반영) |
| 2026-01-29 21:41 | 김장훈 | 추가 | docs/figma/resolver/ 어택라인, 프로세스트리 디자인 파일 |
| 2026-01-29 21:41 | 김장훈 | 배포 | origin/develop push (ROADMAP, figma 디자인, CLAUDE.md/GEMINI.md 동기화) |
| 2026-01-29 20:48 | 김장훈 | 추가 | .gitattributes, .editorconfig LF 개행 통일 및 OS간 빌드 오류 방지 |
| 2026-01-29 20:48 | 김장훈 | 배포 | origin/develop push (.gitattributes, .editorconfig) |
| 2026-01-29 17:40 | 김장훈 | 배포 | origin/develop push (백엔드/프론트엔드 구조, 문서 갱신, README) |
| 2026-01-29 16:26 | 김장훈 | 배포 | origin/main push (백엔드/프론트엔드 기본 구조 머지) |
| 2026-01-29 16:26 | 김경수 | 설정 | OpenSearch 구성 및 셋팅 |
| 2026-01-29 16:26 | 김장훈 | 설정 | 개발서버 2대 구성 (DB, AP) |
| 2026-01-29 16:26 | 김경인 | 추가 | `docs/figma/login/login.svg` 파일 생성 |
| 2026-01-29 14:08 | 김장훈 | 설정 | CLAUDE.md, GEMINI.md, HISTORY.md 생성 및 템플릿 파일 정리 |
| 2026-01-29 14:08 | 김장훈 | 추가 | 백엔드 기본 구조 (FastAPI + opensearch-py), PostgreSQL/SQLAlchemy/Alembic 제거 |
| 2026-01-29 14:08 | 김장훈 | 추가 | 프론트엔드 기본 구조 (React 18 + TypeScript + Vite + MUI) |
| 2026-01-29 14:08 | 김장훈 | 추가 | MUI 라이브러리 설치 (@mui/material, icons-material, x-data-grid, x-date-pickers) |
| 2026-01-29 14:08 | 김장훈 | 추가 | 프론트엔드 테마 설정 (다크 모드), axios API 클라이언트, React Router |
| 2026-01-29 14:08 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md OpenSearch 전용 + MUI 프론트엔드 반영 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/ARCHITECTURE.md, docs/INSTALL.md 대문자 파일명 변경 및 내용 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/GIT_GUIDE.md feature/기능명 브랜치 워크플로우 가이드 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/DEPLOY.md OpenSearch 기반 Docker 배포 가이드 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md 워크플로우 리소스 경로(.claude/) 필수 명시 |
| 2026-01-29 14:08 | 김장훈 | 설정 | OpenSearch 개발서버 접속정보 반영 (ns1.cruxdata.co.kr:11723) |
| 2026-01-29 14:08 | 김장훈 | 수정 | README.md 프로젝트 소개 및 참여자 정보 작성 |
| 2026-01-29 14:08 | 김장훈 | 설정 | 개발 시작 준비 완료 검증 (백엔드/프론트엔드 빌드 및 서버 기동 확인) |
