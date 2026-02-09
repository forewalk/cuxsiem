# 알림 시스템 (Notification System) 상세 개발 계획서

**작성일:** 2026-02-09
**상세 내용:** SIEM 탐지 엔진 및 상태 관리형 알림 시스템 구현

---

## 1. 백엔드 구현 전략 (A안 엔진)

### 1.1 탐지 엔진 (Rule Engine)
- **모듈:** `app/services/notification/engine.py` (신규)
- **기술:** `APScheduler`를 활용하여 규칙별 독립적인 스케줄링 관리.
- **프로세스:**
    1. 규칙의 `condition_type`에 따라 Query DSL 동적 생성.
    2. OpenSearch 비동기 호출 및 결과 파싱.
    3. `dedup_key` 계산: `sha256(rule_id + values_of_dedup_fields)`.
    4. 쿨다운 검증 및 최종 알림 생성 결정.

### 1.2 Webhook 및 재시도
- **큐 관리:** Webhook 발송 실패 시 전용 상태(`delivery_failed`)로 기록하고, 별도 백그라운드 태스크로 재시도 수행.

---

## 2. 데이터베이스 매핑 상세 (OpenSearch)

### 2.1 cs_notification_rules
- SIEM 대응을 위해 `window_min`, `cooldown_min`, `dedup_fields` 필드 추가.
- `condition_config`는 DSL 쿼리 본문을 포함할 수 있도록 `object` 타입으로 설정.

### 2.2 cs_notifications
- `status` 필드 필수화: `new`(초기), `ack`(확인), `resolved`(해결), `dismissed`(무시).
- `evidence` 필드: 탐지된 로그의 일부나 집계된 숫자값을 저장하여 상세 페이지에서 활용.

---

## 3. 프론트엔드 UI/UX 구현

### 3.1 Split View 레이아웃 상세
- **목록:** `status` 및 `severity` 컬러 코딩 적용. `dedup_key` 기준 최신 알림 우선 노출.
- **상세 패널:** 
    - **상태 제어:** '확인(Acknowledge)', '해결(Resolve)' 버튼 배치 (PATCH API 연동).
    - **에비던스 뷰어:** 탐지된 원본 데이터를 JSON Tree 형식으로 출력.
    - **타임라인:** 최초 탐지 시간과 마지막 업데이트 시간 표시.

---

## 4. 구현 우선순위 및 일정

1. **Step 1:** `cs_notification_rules` 및 `cs_notifications` 인덱스 초기화 및 API CRUD 개발.
2. **Step 2:** `threats` 인덱스 기반의 집계/DSL 탐지 엔진 코어 개발.
3. **Step 3:** Dedup 및 Cooldown 로직 검증 테스트.
4. **Step 4:** 프론트엔드 Split View 및 상태 변경 기능 연동.