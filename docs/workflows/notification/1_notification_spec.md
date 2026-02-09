# 알림 시스템 (Notification System) 기능 기획서

**작성일:** 2026-02-09
**작성자:** Gemini CLI
**버전:** 1.2
**상태:** 초안 (수정 중)

---

## 1. 개요

### 1.1 목적
SIEM 내에서 발생하는 다양한 보안 이벤트 및 시스템 상태 변화를 사용자에게 즉각적이고 체계적으로 전달하여, 신속한 보안 사고 대응 및 시스템 관리를 지원함.

### 1.2 배경
- 특정 조건(임계치 초과, 위험 패턴 발생 등)에 대한 자동화된 알림 체계 필요.
- 알림 발생 시 외부(Webhook)로 실시간 데이터를 전송하여 외부 시스템과의 연동 강화.

### 1.3 범위

**포함:**
- 알림 규칙(Rule) 설정 및 관리 (CRUD)
- 규칙별 Webhook 수신처 설정 및 논리적 그룹화
- 백그라운드 배치 알림 엔진 (최소 주기 1분 이상)
- 프론트엔드 알림 UI (하단 3초 스낵바, 알림 목록 페이지)
- 알림 상태 관리 (읽음 여부, 발송 여부)

**제외:**
- 화면 중앙 모달 팝업 (상위 사용자 설정 서비스에서 처리하므로 제외)
- 별도의 수신 그룹 전용 인덱스 (규칙 내 필드로 통합 관리)
- 알림음 지원

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)
1. **알림 규칙 관리 (CRUD):** 
   - 모니터링 대상 인덱스, 발생 조건(Count/필드 패턴), 알림 등급, 배치 주기(1분 이상) 설정.
   - **Webhook 관리:** 규칙 내에 수신 받을 Webhook URL 리스트를 직접 등록.
   - **수신 대상 설정:** 규칙 관리를 용이하게 하기 위해 '수신 대상(receiver)' 필드를 제공하여 객체 형태로 관리 (예: `{ "type": "role", "values": ["admin"] }`).
2. **배치 알림 엔진:** 
   - 설정된 주기(1분 이상)마다 OpenSearch 쿼리를 수행.
   - 조건 만족 시 `cs_notifications` 생성 및 해당 규칙에 등록된 모든 Webhook으로 데이터 전송.
3. **실시간 UI 알림:** 
   - 신규 알림 발생 시 웹 하단에 3초간 표시되는 스낵바 알림.
4. **알림 목록 페이지:** 
   - 알림 발생 시간, 등급, 읽음 여부 등을 확인할 수 있는 인덱스 기반 목록 페이지.

#### 선택 기능 (Should Have)
1. **알림 필터링:** 등급별, 날짜별, 수신 대상별 알림 목록 필터링.
2. **미확인 알림 뱃지:** 헤더에 미확인 알림 개수 표시.

---

## 4. 데이터 요구사항

### 4.1 알림 규칙 인덱스 (`cs_notification_rules`)
| 데이터 항목 | 타입 | 필수 여부 | 설명 |
|------------|------|----------|------|
| `id` | keyword | 필수 | 규칙 고유 ID |
| `name` | text | 필수 | 규칙 이름 |
| `target_index` | keyword | 필수 | 모니터링 대상 OpenSearch 인덱스 |
| `condition_type` | keyword | 필수 | count, pattern |
| `condition_config` | object | 필수 | 필드명, 키워드, 임계치 등 설정 |
| `severity` | keyword | 필수 | info, warning, critical |
| `interval_min` | integer | 필수 | 배치 실행 주기 (최소 1) |
| `webhooks` | keyword[] | 필수 | 수신 받을 Webhook URL 리스트 |
| `receiver` | object | 필수 | 수신 대상 (`{type: role, values: [admin]}`) |
| `is_active` | boolean | 필수 | 활성화 여부 |

### 4.2 알림 인덱스 (`cs_notifications`)
| 데이터 항목 | 타입 | 필수 여부 | 설명 |
|------------|------|----------|------|
| `id` | keyword | 필수 | 알림 고유 ID |
| `rule_id` | keyword | 필수 | 발생 규칙 ID |
| `severity` | keyword | 필수 | info, warning, critical |
| `title` | text | 필수 | 알림 제목 |
| `message` | text | 필수 | 상세 내용 |
| `event_ref` | keyword | 필수 | 원본 이벤트 참조 |
| `dedup_key` | keyword | 필수 | 중복 방지 키 |
| `receiver` | object | 필수 | 수신 대상 (Rule에서 복사) |
| `is_read` | boolean | 필수 | 읽음 여부 (default: false) |
| `status` | keyword | 필수 | 상태 관리 (`created`, `sent`, `failed`) |
| `created_at` | date | 필수 | 발생 시간 |

---

## 5. API 요구사항

### 5.1 알림 규칙 API
- `GET /api/v1/notification-rules`: 규칙 목록 조회
- `POST /api/v1/notification-rules`: 규칙 생성
- `PUT /api/v1/notification-rules/{id}`: 규칙 수정
- `DELETE /api/v1/notification-rules/{id}`: 규칙 삭제

### 5.2 알림 내역 API
- `GET /api/v1/notifications`: 알림 목록 조회
- `PATCH /api/v1/notifications/{id}/read`: 읽음 처리

---

## 8. 성공 기준

### 8.1 완료 조건
- [ ] 알림 규칙의 CRUD 기능 정상 작동.
- [ ] 배치 엔진이 1분 이상의 주기로 조건을 감지하고 알림을 생성함.
- [ ] 알림 발생 시 규칙에 정의된 Webhook 리스트로 전송됨.
- [ ] UI 하단 스낵바와 알림 목록 페이지가 정상 작동함.

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|-----|------|----------|--------|
| 2026-02-09 | 1.0  | 초안 작성 | Gemini CLI |
| 2026-02-09 | 1.1  | 팝업 제외, 수신 그룹 인덱스 추가 | Gemini CLI |
| 2026-02-09 | 1.2  | 수신 그룹 인덱스 삭제, 규칙 내 Webhook 필드 통합 | Gemini CLI |
