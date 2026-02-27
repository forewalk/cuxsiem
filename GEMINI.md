# GEMINI.md

이 파일은 Gemini가 이 저장소에서 작업할 때 참조하는 가이드입니다.

이 저장소에서 작업하기 전에 반드시 `ASSISTANT.md`를 읽어야 합니다.

## 필수: ASSISTANT.md 선행 참조

**작업 시작 전 `ASSISTANT.md`를 반드시 읽을 것.** 다음 내용이 포함되어 있습니다:

| 섹션 | 주요 내용 |
|------|-----------|
| 필수 행동 강령 | 원격 Push 금지 규칙, `docs/HISTORY.md` 기록 의무 |
| 빌드 및 실행 명령어 | 백엔드(`uvicorn`), 프론트엔드(`npm run dev`), 테스트(`pytest`), 린트 |
| 아키텍처 | 백엔드 레이어(Endpoint→Service→Repository→Model→OpenSearch) |
| OpenSearch 규칙 | 인덱스 네이밍(`cs_` 접두사), soft delete(`deleted_at`), 필드 규칙 |
| 프론트엔드 구조 | 디렉토리 구조, MUI 사용법, 테마/색상 매핑, 공통 레이아웃 컴포넌트 |
| i18n 규칙 | **모든 텍스트 하드코딩 금지**, `src/locales/*.json`에서 관리 |
| 9단계 워크플로우 | 슬래시 커맨드 목록(`/workflow-start`, `/develop`, `/test` 등) |
| 프로젝트 문서 | `docs/ARCHITECTURE.md`, `docs/INSTALL.md`, `docs/GIT_GUIDE.md` 등 |

## 주의사항

- **이 파일에 프로젝트 가이드 내용을 추가하지 마세요.**
- 새로운 규칙, 아키텍처 변경, 컨벤션 등 모든 갱신 사항은 **`ASSISTANT.md`에 작성**하세요.
- 이 파일은 Gemini 전용 진입점 역할만 합니다.
