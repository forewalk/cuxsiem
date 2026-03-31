# 기획서: 액션 > API 관리 페이지 신설

## 1. 개요
SIEM 시스템에서 탐지된 위협에 대해 외부 시스템(예: 방화벽, EDR, 웹훅 등)으로 대응 액션을 보낼 수 있도록 API 타겟 정보를 관리하는 기능을 추가한다. 이 기능은 '액션' 메뉴 하위의 'API 관리' 페이지에서 제공된다.

## 2. 사용자 시나리오
- 사용자는 '액션' 메뉴를 클릭하여 'API 관리' 서브 메뉴로 이동한다.
- 사용자는 새로운 API 타겟(이름, URL, 포트, 로직 등)을 등록한다.
- 등록된 API 목록을 조회하고, 상세 내용을 확인하거나 수정/삭제할 수 있다.

## 3. 기능 요구사항
### 백엔드 (FastAPI)
- `cs_action` 인덱스에 대한 CRUD 엔드포인트 구현 (`/api/v1/actions`)
- Pydantic 스키마 정의 (`ActionBase`, `ActionCreate`, `ActionUpdate`, `ActionResponse`)
- OpenSearch Repository 및 Service 레이어 구현

### 프론트엔드 (React/MUI)
- 사이드바 '액션' 메뉴 하위에 'API 관리' 항목 추가
- `API 관리` 페이지 UI 구현 (MUI `DataGrid` 사용)
- API 등록/수정 모달 구현
- 다국어 지원 (`ko.json`, `en.json` 등)

## 4. 데이터 모델 (OpenSearch: cs_action)
- `name`: API 명칭 (keyword)
- `description`: 설명 (text)
- `target_host`:
  - `url`: 타겟 URL (keyword)
  - `port`: 포트 (integer)
- `action_logic`:
  - `dsl`: 실행할 로직/쿼리 (text)
  - `type`: 액션 타입 (keyword, 예: 'webhook', 'rest_api')
- `user_id`: 생성자 (keyword)
- `timestamps`: `created_at`, `updated_at`, `deleted_at` (soft delete)

## 5. 단계별 계획
- 1단계: 기획서 검토 및 확정
- 2단계: 개발 계획 수립
- 3단계: 백엔드 구현 및 테스트 (TDD)
- 4단계: 프론트엔드 UI 구현 및 API 연동
- 5단계: 통합 테스트 및 기술 문서 작성
