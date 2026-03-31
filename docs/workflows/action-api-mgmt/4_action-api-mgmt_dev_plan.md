# 개발 계획: 액션 > API 관리 페이지 구현

## 1. 백엔드 구현 (TDD 준수)
- [ ] `app/schemas/action.py`: `ActionCreate`, `ActionUpdate`, `ActionResponse` Pydantic 모델 정의
- [ ] `app/repositories/action.py`: `ActionRepository` 클래스 (OpenSearch 연동 CRUD)
- [ ] `app/services/action.py`: `ActionService` 클래스 (비즈니스 로직 및 검증)
- [ ] `app/api/v1/endpoints/action.py`: API 엔드포인트 구현 (`GET`, `POST`, `PUT`, `DELETE`)
- [ ] `app/api/v1/endpoints/__init__.py`: 라우터 등록
- [ ] `tests/test_services/test_action.py`: 서비스 레이어 단위 테스트 작성 및 검증

## 2. 프론트엔드 구현
- [ ] `frontend/src/locales/*.json`: "apiMgmtMenu", "actionApiListTitle" 등 다국어 키 추가
- [ ] `frontend/src/services/ActionService.ts`: 백엔드 API 호출을 위한 axios 서비스 작성
- [ ] `frontend/src/pages/ActionApiPage.tsx`: MUI DataGrid 기반의 목록 페이지 구현
- [ ] `frontend/src/components/ActionApiModal.tsx`: 등록 및 수정을 위한 Dialog 컴포넌트 구현
- [ ] `frontend/src/components/AdminSidemenu.tsx`: '액션' 하위 메뉴로 'API 관리' 추가 및 라우팅 연결

## 3. 통합 테스트 및 마무리
- [ ] 전체 연동 테스트 (API 호출 -> OpenSearch 저장 확인)
- [ ] `docs/workflows/action-api-mgmt/9_action-api-mgmt_technical_doc.md` 기술 문서 작성
