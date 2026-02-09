# SIEM 알림 시스템 최종 데이터 명세 (Final)

**확정일:** 2026-02-09
**상태:** 데이터 모델 확정

---

## 1. 인덱스 명세

### 1.1 알림 규칙 인덱스 (`cs_notification_rules`)
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | keyword | 규칙 고유 ID |
| `name` | text | 규칙 명칭 |
| `target_index` | keyword | 모니터링 대상 (기본: threats) |
| `condition_type` | keyword | 탐지 유형 (dsl_query 등) |
| `condition_config` | object | Query DSL 저장 |
| `severity` | keyword | 위험도 (critical, warning, info) |
| `interval_min` | integer | 실행 주기 (>= 1) |
| `window_min` | integer | 조회 시간 범위 (>= interval) |
| `webhooks` | keyword[] | 수신 URL 리스트 |
| `receiver_group_name` | keyword | 수신처 그룹명 |
| `is_active` | boolean | 활성화 여부 |
| `created_at` | date | 생성일 |
| `updated_at` | date | 수정일 |

### 1.2 알림 내역 인덱스 (`cs_notifications`)
| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | keyword | 알림 고유 ID |
| `rule_id` | keyword | 발생 규칙 ID |
| `severity` | keyword | 알림 위험도 |
| `title` | text | 알림 제목 |
| `message` | text | 알림 본문 |
| `event_ref` | keyword | 원본 이벤트 참조 (threatId 또는 _id) |
| `dedup_key` | keyword | 중복 방지 키 |
| `is_read` | boolean | 읽음 여부 (default: false) |
| `status` | keyword | 상태 관리 (`created`, `sent`, `failed`) |
| `created_at` | date | 탐지 및 생성 시간 |
| `sent_at` | date | 발송 시간 (선택) |
| `error_message` | text | 발송 실패 시 에러 메시지 (선택) |

---

## 2. 운영 로직
- **Status 관리:** `created`(생성됨) -> `sent`(발송완료) 또는 `failed`(발송실패)로 전환됨으로써 발송 여부와 시스템 건전성을 동시에 파악.
- **Dedup 로직:** `dedup_key`를 활용하여 동일 `event_ref`에 대한 중복 생성을 원천 차단.
