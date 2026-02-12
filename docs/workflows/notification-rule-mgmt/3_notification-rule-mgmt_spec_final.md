# 알림 규칙 관리 (Notification Rule Management) 최종 기능 명세서

**확정일:** 2026-02-11
**상태:** 확정

---

## 1. 개요
OpenSearch 로그 데이터를 기반으로 탐지 규칙을 설정하고, 발생 시 Slack, Webhook, Email 등으로 알림을 전송하는 규칙 관리 기능을 구현한다.

## 2. 주요 기능
### 2.1 알림 규칙 목록
- DataGrid 기반 테이블 UI
- 컬럼: 규칙명, 위험도, 주기, 상태, 최근 발생 시간, 액션(수정/삭제)
- 검색: 규칙명 기반 필터링

### 2.2 알림 규칙 생성 및 수정
- 다이얼로그(Dialog) 기반 폼 UI
- **기본 설정:**
    - 규칙명 (name): 필수
    - 대상 인덱스 (target_index): 필수 (기본값: logs-sentinel_one.threats)
    - 위험도 (severity): Critical, High, Medium, Low, Info
    - 활성 상태 (is_active): 토글
- **탐지 설정:**
    - 실행 주기 (interval_min): 분 단위 (>= 1)
    - 조회 범위 (window_min): 분 단위 (>= interval_min)
    - 탐지 조건 (condition_config): OpenSearch DSL 쿼리 (JSON 형식 입력 및 검증)
- **알림 채널 설정:**
    - Slack: 채널명, Webhook URL
    - Webhook: URL, Method, Headers (JSON)
    - Email: 수신자 목록
- **중복 제거 설정:**
    - 중복 제거 TTL (dedup_ttl_min)
    - 중복 제거 키 템플릿 (dedup_key_template)

## 3. 데이터 및 API
- **스키마:** `NotificationRuleBase` (backend/app/schemas/notification.py)
- **API:**
    - GET/POST `/api/v1/notifications/rules`
    - GET/PUT/DELETE `/api/v1/notifications/rules/{id}`

## 4. UI/UX 상세
- MUI `Dialog`, `TextField`, `Select`, `Switch`, `Stack` 활용.
- DSL 쿼리 입력창은 `multiline` 및 `monospace` 폰트 적용.
- 채널 설정은 동적으로 추가/삭제 가능한 리스트 형태로 구성.

## 5. i18n 번역 키
- `ruleName`, `targetIndex`, `severity`, `interval`, `window`, `condition`, `channels`, `addChannel`, `active`, `inactive` 등 추가 필요.
