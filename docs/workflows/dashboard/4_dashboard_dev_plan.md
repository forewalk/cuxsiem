# dashboard 기능 개발 계획서

**작성일:** 2026-02-03
**작성자:** Gemini AI
**기반 문서:** `3_dashboard_spec_final.md`
**상태:** 초안

---

## 📋 개발 개요

### 목표
OpenSearch의 집계 기능을 활용하여 실시간 로그 통계 데이터를 제공하는 백엔드 API와, SVG 디자인을 충실히 반영한 프론트엔드 시각화 페이지를 구현합니다.

### 개발 범위
- **백엔드:** OpenSearch `date_histogram` 및 `terms` 집계 쿼리를 처리하는 Repository, Service, Endpoint 구현.
- **프론트엔드:** `DashboardPage` 레이아웃, `ControlBar` 필터 컴포넌트, SVG 기반 `BarChartWidget` 구현.
- **연동:** 30초 주기 자동 데이터 갱신 로직 적용.

### 예상 개발 기간
- 예상 소요 시간: 약 8-10시간

---

## 1. 아키텍처 설계

### 1.1 레이어 구조 (OpenSearch 기반)
```
Endpoint (API Router)
    ↓
Service (Business Logic & Aggregation Data Parsing)
    ↓
Repository (OpenSearch DSL Client)
```

### 1.2 컴포넌트 설계

#### Schemas (app/schemas/dashboard.py)
- `DashboardStatsRequest`: 기간 필터(`time_range`), 필터 키워드 등
- `DashboardStatsResponse`: 차트 데이터 및 요약 수치 데이터

#### Repositories (app/repositories/dashboard.py)
- `DashboardRepository`: OpenSearch 클라이언트를 사용하여 `search` API 및 `aggs` 쿼리 실행

#### Services (app/services/dashboard.py)
- `DashboardService`: Repository 결과값을 프론트엔드 차트 라이브러리(또는 컴포넌트) 형식에 맞게 변환

#### Endpoints (app/api/v1/endpoints/dashboard.py)
- `GET /api/v1/dashboard/stats`: 대시보드 메인 통계 정보 반환

---

## 2. 데이터베이스 설계 (OpenSearch)

### 2.1 인덱스 활용
- **인덱스:** `cs_log_events` (또는 수집된 로그 인덱스 패턴)
- **주요 필드:**
  - `created_at`: 시간별 집계(`date_histogram`) 기준 필드
  - `severity`: 심각도별 분포(`terms`) 집계 필드

---

## 3. API 설계

### 3.1 엔드포인트 명세

#### 1. 대시보드 통계 조회
```
GET /api/v1/dashboard/stats?range=15m
Authorization: Bearer <token>

Response (200 OK):
{
  "summary": {
    "total_logs": 1540,
    "critical_logs": 5
  },
  "charts": {
    "histogram": [
      {"timestamp": "2026-02-03T10:00:00", "count": 120},
      ...
    ],
    "severity": [
      {"label": "info", "value": 1400},
      {"label": "warning", "value": 135},
      {"label": "critical", "value": 5}
    ]
  }
}
```

---

## 4. 프론트엔드 설계

### 4.1 컴포넌트 구조
- `DashboardPage`: 메인 레이아웃 및 상태 관리 (Zustand 또는 Local State)
- `ControlBar`: 기간 선택 드롭다운, 검색 필터, 새로고침 버튼 (`control_bar.svg` 기반)
- `StatsOverview`: 상단 요약 카드 섹션
- `BarChartWidget`: SVG와 MUI를 결합한 커스텀 막대 차트 (`bar_chart.svg` 디자인 반영)
- `RecentLogsWidget`: `DataGrid`를 활용한 최신 로그 목록

### 4.2 상태 관리
- `useDashboardStore`: 기간 설정, 자동 갱신 타이머, API 로딩 상태 관리

---

## 10. 구현 순서

### Phase 1: 백엔드 개발 (3-4 hours)
- [ ] 1. OpenSearch 집계 쿼리 Repository 구현
- [ ] 2. 데이터 변환 Service 구현
- [ ] 3. API 엔드포인트 및 Schema 정의
- [ ] 4. 백엔드 단위 테스트 (Mock OpenSearch 활용)

### Phase 2: 프론트엔드 레이아웃 (2-3 hours)
- [ ] 5. `DashboardPage` 기본 레이아웃 구성
- [ ] 6. `ControlBar` 컴포넌트 구현 (디자인 충실)
- [ ] 7. 기간 필터링 전역 상태 연동

### Phase 3: 시각화 컴포넌트 (3-4 hours)
- [ ] 8. `BarChartWidget` 커스텀 구현 (SVG 디자인 반영)
- [ ] 9. API 연동 및 자동 갱신 로직 구현
- [ ] 10. 반응형 레이아웃 및 다크 모드 세부 조정

---

## 12. 다음 단계

✅ 5단계: 개발 계획 승인 (`/approve-dev-plan dashboard`)

---

**문서 상태:** 초안 (검토 대기)
**승인 후:** 개발 시작 가능
