# GEMINI.md

이 파일은 Gemini가 이 저장소에서 작업할 때 참조하는 가이드입니다.

## 필수: 작업 전 ASSISTANT.md 전체 읽기

**모든 작업 시작 전 반드시 `ASSISTANT.md`를 읽을 것.**

## 절대 금지 규칙 (ASSISTANT.md 읽기 전에도 적용)

1. **원격 Push 금지**: 사용자 명시적 요청 없이 `git push` 금지
2. **테스트 없이 기능 구현 금지**: 새 기능/버그 수정 시 반드시 테스트 먼저 작성
3. **UI 텍스트 하드코딩 금지**: 모든 텍스트는 `frontend/src/locales/*.json`에서 관리

## ASSISTANT.md 주요 섹션 위치

| 섹션 | 내용 |
|------|------|
| 빌드/실행 명령어 | `uvicorn`, `npm run dev`, `pytest`, `npm test` |
| 아키텍처 | Endpoint→Service→Repository→Model→OpenSearch |
| OpenSearch 규칙 | `cs_` 접두사, soft delete, 필드 네이밍 |
| 프론트엔드 구조 | MUI v7, 테마/색상, AppLayout 컴포넌트 |
| 9단계 워크플로우 | `/workflow-start`, `/develop`, `/test` 등 |

## 주의사항

- 이 파일에 추가 가이드를 작성하지 말 것. 모든 갱신 사항은 **`ASSISTANT.md`에 작성**.
