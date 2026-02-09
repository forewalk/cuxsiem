# 알림 시스템 (Notification System) 최종 개발 계획서 (Final)

**확정일:** 2026-02-09
**작성자:** Gemini CLI
**버전:** 1.0 (Final)
**상태:** 확정

---

## 1. 아키텍처 및 UI 전략

### 1.1 백엔드 아키텍처
- **엔진:** `FastAPI` + `APScheduler` 기반의 백그라운드 스케줄러.
- **Webhook:** `httpx` 비동기 통신 및 지수 백오프(Exponential Backoff) 기반 최대 3회 재시도.
- **제어 로직:** 규칙별 `cooldown_min`을 활용하여 중복 알림 발생 억제.

### 1.2 프론트엔드 UI (팝업 없는 UX)
- **레이아웃:** 알림 목록 페이지 내 **Split View (Master-Detail)** 구조.
    - **좌측(Main):** MUI DataGrid 기반 알림 목록 (Pagination 적용).
    - **우측(Detail Panel):** 선택된 알림의 상세 메시지, 원본 JSON 데이터, Webhook 발송 상태 표시.
- **실시간성:** 1분 단위 Polling을 통해 헤더 뱃지와 목록 데이터를 최신화.
- **알림 피드백:** 화면 하단에 3초간 노출되는 Snackbar (클릭 시 상세 패널과 연동).

---

## 2. 데이터베이스 및 API 설계

### 2.1 인덱스 매핑 (OpenSearch)
- `cs_notification_rules`: 규칙명, 대상 인덱스, 조건(Count/Pattern), 주기, 쿨다운, Webhook URL 리스트, 활성화 여부.
- `cs_notifications`: 발생 규칙 ID, 등급(Severity), 제목/본문, 읽음 여부, Webhook 배송 상태(`delivery_status`), 발생 시점.

### 2.2 주요 API
- 규칙 관리: `GET`, `POST`, `PUT`, `DELETE` `/api/v1/notification-rules`
- 알림 내역: `GET`, `PATCH` (읽음), `POST` (전체 읽음) `/api/v1/notifications`

---

## 3. 구현 세부 가이드라인

### 3.1 알림 생성 로직
1. 규칙의 `interval_min` 도래 시 OpenSearch Query DSL 실행.
2. 결과값과 규칙의 `threshold` 비교.
3. 조건 만족 시 `(현재 시간 - last_triggered_at) > cooldown_min` 확인 후 알림 생성.

### 3.2 Webhook 전송 스키마
```json
{
  "alert_id": "uuid",
  "severity": "critical",
  "title": "로그인 실패 5회 초과",
  "rule_name": "Brute Force Detection",
  "timestamp": "ISO-8601",
  "detail_link": "http://ui-url/notifications?id=uuid"
}
```

---

## 4. 단계별 구현 계획

1. **Phase 1 (Backend):** OpenSearch 인덱스 초기화 및 CRUD API 구현.
2. **Phase 2 (Engine):** 배치 스케줄러, 쿼리 엔진, Webhook 발송기 구현.
3. **Phase 3 (Frontend):** Split View 기반 목록/상세 화면 및 Snackbar 연동.
4. **Phase 4 (Verify):** 시나리오 테스트 및 성능 검증.

---

## 5. 변경 및 특이사항
- 팝업/모달 제거: 탭 기반 UI 일관성을 위해 Split View 레이아웃으로 최종 확정.
- 그룹 인덱스 미사용: 규칙 내 Webhook 필드 직접 포함으로 단순화.
