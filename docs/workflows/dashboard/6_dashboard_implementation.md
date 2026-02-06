# dashboard 기능 구현 체크리스트

**개발 시작일:** 2026-02-03
**개발자:** Gemini AI
**기반 문서:** `5_dashboard_dev_plan_final.md`
**상태:** 진행 중

---

## 📋 구현 진행 상황

### 전체 진행률
```
[░░░░░░░░░░░░░░░░░░░░] 0% (0/10 완료)
```

---

## Phase 1: 백엔드 개발

### 1.1 Schema 정의
- [ ] Pydantic 스키마 클래스 생성
  - 파일: `backend/app/schemas/dashboard.py`
  - `DashboardStatsResponse` 정의 (histogram, severity stats 포함)

---

### 1.2 Repository 구현
- [ ] `DashboardRepository` 클래스 생성
  - 파일: `backend/app/repositories/dashboard.py`
  - `get_stats()`: OpenSearch Aggregation 쿼리 실행 로직 구현

---

### 1.3 Service 및 Endpoint 구현
- [ ] `DashboardService` 클래스 생성
  - 파일: `backend/app/services/dashboard.py`
  - OpenSearch 응답 데이터를 프론트엔드용으로 변환
- [ ] Endpoint 구현
  - 파일: `backend/app/api/v1/endpoints/dashboard.py`
  - `GET /stats` 엔드포인트 구현
- [ ] Router 등록
  - 파일: `backend/app/api/v1/endpoints/__init__.py` 수정

---

## Phase 2: 프론트엔드 기반 구성

### 2.1 DashboardPage 및 라우트
- [ ] `DashboardPage` 파일 생성
- [ ] `src/routes/index.tsx`에 대시보드 라우트 등록

---

### 2.2 ControlBar 구현
- [ ] 기간 선택 필터 및 수동 새로고침 UI 구현
- [ ] Zustand 또는 Context API를 통한 기간 상태 관리

---

## Phase 3: 시각화 및 통합

### 3.1 BarChartWidget 구현
- [ ] SVG 디자인 리소스 기반의 커스텀 막대 차트 구현
- [ ] MUI 테마(다크 모드) 연동

---

### 3.2 데이터 연동 및 Polling
- [ ] API 호출 및 30초 주기 자동 갱신 로직 적용
- [ ] 로딩 및 에러 상태 UI 처리

---

## 다음 단계

✅ 7단계: 테스트 실행 (`/test dashboard`)

---

**상태:** 진행 중
