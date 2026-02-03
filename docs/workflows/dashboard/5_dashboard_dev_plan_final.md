# dashboard 기능 개발 계획서 (최종)

**작성일:** 2026-02-03
**최종 승인일:** 2026-02-03
**작성자:** Gemini AI
**상태:** ✅ 확정

---

## 📌 승인 정보

### 승인자
- 이름: 최지호 (사용자)
- 승인일: 2026-02-03
- 승인 의견: OpenSearch 집계 기반의 백엔드와 SVG 디자인을 충실히 반영한 프론트엔드 개발 계획을 승인함.

### 초안 대비 변경사항
1. 없음 (초안의 OpenSearch 기반 아키텍처를 유지)

---

## ✅ 확정된 개발 계획

### 목표
OpenSearch의 집계 기능을 활용하여 실시간 로그 통계 데이터를 제공하는 백엔드 API와, SVG 디자인을 충실히 반영한 프론트엔드 시각화 페이지를 구현합니다.

### 개발 범위 (확정)
- **백엔드:** `DashboardRepository` (OpenSearch aggs), `DashboardService`, `/api/v1/dashboard/stats` 엔드포인트.
- **프론트엔드:** `DashboardPage`, `ControlBar`, `BarChartWidget` (SVG 기반 커스텀).
- **자동화:** 30초 주기 Polling 데이터 갱신.

---

## 1. 아키텍처 설계 (확정)
- **레이어:** Repository (OpenSearch DSL) -> Service (Transformation) -> Endpoint (FastAPI)
- **프론트엔드:** MUI Grid + Custom SVG Components + Zustand 상태 관리

---

## 2. 데이터 설계 (확정)
- **대상:** `cs_log_events` 인덱스
- **집계:** `date_histogram` (로그 빈도), `terms` (심각도 분포)

---

## 3. API 설계 (확정)
- **GET /api/v1/dashboard/stats**
  - Query Params: `range` (15m, 1h, 24h 등)
  - Response: `summary`, `histogram_data`, `severity_stats` 포함

---

## 4. 구현 순서 (확정)

### Phase 1: 백엔드 개발 (진행 예정)
- [ ] Schema 정의 (`DashboardStatsResponse`)
- [ ] Repository 구현 (OpenSearch 집계 쿼리)
- [ ] Service 및 Endpoint 구현

### Phase 2: 프론트엔드 기반 구성
- [ ] DashboardPage 및 라우트 등록
- [ ] ControlBar (기간 필터) 구현

### Phase 3: 시각화 및 통합
- [ ] BarChartWidget (SVG 디자인 반영)
- [ ] API 연동 및 Polling 로직 적용

---

## 6. 개발 시작 승인

✅ **개발 착수 승인됨**

**다음 단계:** 6단계 - 개발 실행 (`/develop dashboard`)

---

**문서 상태:** 확정 및 잠금
**개발 시작일:** 2026-02-03
