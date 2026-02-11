# 로그 스트리밍 기능 개발 계획서

## 1. 개요
OpenSearch의 실시간 데이터를 10초 주기로 폴링하여 표시하는 로그 스트리밍 기능을 구현합니다.

## 2. 작업 단계

### Step 1: 백엔드 API 구현
- `app/api/v1/endpoints/logs.py` 생성.
- `GET /api/v1/logs/stream` 엔드포인트 구현.
    - `opensearch-py`를 사용하여 `timestamp` 기준 정렬 및 조회.
- `app/main.py` 또는 라우터 등록 파일에 새 엔드포인트 등록.

### Step 2: 프론트엔드 서비스 및 타입 정의
- `frontend/src/services/logService.ts` 생성: API 호출 함수 정의.
- `frontend/src/types/index.ts`에 로그 데이터 관련 인터페이스 추가.

### Step 3: 프론트엔드 UI 컴포넌트 개발
- `frontend/src/pages/admin/tabs/LogStreamingTab.tsx` (또는 별도 페이지) 생성.
- 콘솔 스타일의 어두운 UI 구현 (MUI `Box`, `Typography` 활용).
- `useEffect`와 `setInterval`을 이용한 폴링 로직 구현.
- 자동 스크롤(Auto-scroll) 및 데이터 제한(1,000개) 로직 적용.

### Step 4: 메뉴 및 라우팅 설정
- `frontend/src/locales/*.json`에 다국어 텍스트 추가.
- `frontend/src/components/AdminSidemenu.tsx`에 "로그 스트리밍" 메뉴 추가.
- `frontend/src/routes/index.tsx`에 신규 페이지 라우트 등록.

## 3. 구현 세부 사항
- **OpenSearch Query:**
    ```json
    {
      "sort": [{ "timestamp": "desc" }],
      "size": 100
    }
    ```
- **Frontend State:** `logs` 배열과 `lastTimestamp` 관리.

## 4. 테스트 계획
- **백엔드:** `pytest`를 사용하여 API 응답 포맷 및 OpenSearch 쿼리 정상 여부 확인.
- **프론트엔드:** 
    - 10초마다 데이터가 누적되는지 확인.
    - 1,000개 초과 시 데이터가 삭제되는지 확인.
    - 자동 스크롤 동작 및 해제 확인.

---
**다음 단계:** 개발 계획 승인 및 구현 (5~6단계)