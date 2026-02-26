# 개발 계획: 로그 스트리밍 기능 강화

## 1. 구현 단계별 상세 계획

### 1단계: 데이터 분석 및 State 확장
- `logs`에서 모든 필드(Flat keys)를 추출하는 `useMemo` 로직 추가.
- `visibleFields` 상태를 동적으로 관리하도록 수정 (초기값: `['timestamp', '_index', 'message']`).

### 2단계: 필드 선택기 UI 구현
- `FieldSelectorPopover` 컴포넌트 작성 (MUI `Popover` + `Checkbox` + `List`).
- 컨트롤바에 '필드' 버튼 추가.

### 3단계: 로그 상세 패널 확장
- `LogDetailPanel`의 각 행에 클릭 이벤트 핸들러 추가.
- `onFilterAdd` 콜백 함수 구현 및 연동.

### 4단계: 테이블 헤더 및 로우 렌더링 동적화
- `visibleFields`에 따라 헤더 넓이 및 내용이 유연하게 변하도록 스타일 수정.
- 필드별 적절한 넓이 비율(Weight) 설정 로직 추가.

## 2. 테스트 계획
- [ ] 새로운 필드를 선택했을 때 테이블 컬럼이 즉시 업데이트되는지 확인.
- [ ] 상세 패널에서 필드 클릭 시 검색창에 쿼리가 올바르게 추가되는지 확인.
- [ ] 검색 쿼리 추가 후 로그 목록이 새로고침되는지 확인.
- [ ] 다크 모드/라이트 모드에서 UI 가독성 확인.

## 3. 예상 변경 파일
- `frontend/src/pages/admin/tabs/LogStreamingTab.tsx`
- (필요 시) `frontend/src/locales/ko.json` 등 다국어 파일
