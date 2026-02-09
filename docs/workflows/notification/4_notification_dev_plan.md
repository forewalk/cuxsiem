# 알림 시스템 (Notification System) 개발 계획서

**작성일:** 2026-02-09
**작성자:** Gemini CLI
**버전:** 1.0
**상태:** 초안

---

## 1. 기술 스택 및 아키텍처

### 1.1 백엔드 (FastAPI)
- **Scheduler:** `APScheduler` 또는 FastAPI의 `BackgroundTasks`를 활용한 1분 단위 폴링 엔진.
- **Repository:** OpenSearch Python 클라이언트를 사용한 `cs_notification_rules`, `cs_notifications` 접근.
- **Webhook Client:** `httpx` (비동기 HTTP 클라이언트)를 사용하여 비차단(Non-blocking) 발송 구현.

### 1.2 프론트엔드 (React + MUI)
- **Real-time Notice:** 1분 단위 Polling 또는 알림 인덱스의 최신 생성 일자를 체크하여 Snackbar 노출.
- **State Management:** 알림 목록 및 미확인 카운트 관리를 위한 전역 상태 또는 전용 훅.
- **Components:** `MUI Snackbar`, `MUI DataGrid` (알림 목록), `MUI Dialog` (규칙 설정).

---

## 2. 데이터베이스 설계 (OpenSearch)

### 2.1 cs_notification_rules (인덱스 매핑)
- `name`: text
- `target_index`: keyword
- `condition_type`: keyword (count | pattern)
- `condition_config`: object (field, value, operator, threshold 등)
- `interval_min`: integer
- `cooldown_min`: integer
- `last_triggered_at`: date (중복 방지 체크용)
- `webhooks`: keyword[]
- `receiver_group_name`: keyword
- `is_active`: boolean

### 2.2 cs_notifications (인덱스 매핑)
- `rule_id`: keyword
- `severity`: keyword (info, warning, critical)
- `title`: text
- `message`: text
- `is_read`: boolean
- `delivery_status`: object { status: keyword, retry_count: integer, last_attempt: date }
- `created_at`: date

---

## 3. API 상세 명세

### 3.1 알림 규칙 (Rules)
- `GET /api/v1/notification-rules`: 규칙 목록 (Pagination)
- `POST /api/v1/notification-rules`: 규칙 생성
- `PUT /api/v1/notification-rules/{id}`: 규칙 수정
- `DELETE /api/v1/notification-rules/{id}`: 규칙 삭제

### 3.2 알림 내역 (Notifications)
- `GET /api/v1/notifications`: 내역 조회 (필터: severity, is_read, receiver_group_name)
- `PATCH /api/v1/notifications/{id}/read`: 단일 읽음 처리
- `POST /api/v1/notifications/read-all`: 전체 읽음 처리 (Bulk update)

---

## 4. 핵심 로직 설계

### 4.1 배치 알림 엔진 (Batch Engine)
1. `interval_min`에 맞춰 실행 대상을 필터링.
2. `target_index`에 대해 `condition_config` 기반 Query DSL 생성 및 실행.
3. 결과가 임계치를 초과하고 `cooldown_min`이 경과했다면:
    - `cs_notifications` 생성.
    - Webhook 발송 로직 트리거.
    - 규칙의 `last_triggered_at` 업데이트.

### 4.2 Webhook 재시도 로직
1. 발송 실패 시(HTTP 2xx 아님) `delivery_status`를 `retrying`으로 설정.
2. 지수 백오프(Exponential Backoff: 1분, 5분, 15분)를 적용하여 최대 3회 재전송 시도.
3. 최종 실패 시 `fail` 상태로 기록.

---

## 5. 구현 일정 및 단계

### 1단계: 백엔드 기초 (2-3일)
- [ ] OpenSearch 인덱스 생성 스크립트 작성 (`init_opensearch.py`).
- [ ] 규칙(Rules) 및 알림(Notifications) CRUD API 및 리포지토리 구현.

### 2단계: 알림 엔진 및 Webhook (3-4일)
- [ ] 백그라운드 스케줄러 및 엔진 코어 로직 구현.
- [ ] 비동기 Webhook 발송 및 재시도 로직 구현.

### 3단계: 프론트엔드 UI (3일)
- [ ] 알림 목록 페이지 및 전체 읽음 처리 기능.
- [ ] 규칙 설정 관리 화면.
- [ ] 헤더 알림 뱃지 및 하단 스낵바 연동.

### 4단계: 테스트 및 안정화 (2일)
- [ ] 단위 테스트 및 대량 발생 시 성능 테스트.
- [ ] 최종 기술 문서 작성.
