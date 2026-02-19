# 알림 센터 (Notification Center) 통합 기술 문서

## 📝 개요
이 문서는 SIEM 시스템의 핵심 구성 요소인 알림 센터의 아키텍처, 데이터 흐름 및 구현 상세를 정의합니다.

## 🏗 시스템 아키텍처

### 1. 데이터 흐름 (Data Flow)
1. **Detection**: `APScheduler`가 1분마다 `cs_notification_rules`를 스캔.
2. **Query**: OpenSearch의 `logs-sentinel_one.threats` 인덱스에 시간 윈도우 필터를 적용한 DSL 쿼리 수행.
3. **Deduplication**: `dedup_key_template`을 기반으로 중복 알림 여부 판단.
4. **Creation**: 신규 위협 발견 시 `cs_notifications` 인덱스에 내역 저장.
5. **Delivery**: 설정된 채널(Webhook 등)로 HTTP POST 요청 발송.
6. **Audit**: 발송 원문(Payload) 및 수신측 응답(Response)을 해당 알림 내역에 업데이트.
7. **Notification**: 프론트엔드 폴링 로직이 신규 데이터를 감지하여 사용자에게 Snackbar 알림 노출.

### 2. 주요 컴포넌트

#### 백엔드 (Python/FastAPI)
- `app/core/scheduler.py`: 비동기 작업을 관리하는 스케줄러.
- `app/services/notification.py`: 탐지 로직, 페이로드 가공 및 발송 담당.
- `app/repositories/notification.py`: OpenSearch 인덱스(`cs_notification_rules`, `cs_notifications`) 접근 계층.

#### 프론트엔드 (React/MUI)
- `NotificationRuleListTab.tsx`: 규칙 설정 및 CRUD 인터페이스.
- `NotificationHistoryTab.tsx`: 실시간 모니터링 및 인라인 확장을 이용한 증적(Evidence) 뷰어.

## 🔒 보안 및 증적 (Audit & Evidence)
- **증적 무결성**: 발송된 JSON 원문을 `outgoing_payload` 필드에 보존하여 추후 검증 및 재현 가능하도록 설계.
- **민감 정보 보호**: 전송 헤더 중 `Authorization`, `ApiKey` 등은 저장 전 마스킹 처리.
- **상태 추적**: HTTP 응답 코드 및 응답 바디를 기록하여 발송 실패 원인 추적 지원.

## 🛠 주요 API 인터페이스
- `GET /api/v1/notifications/rules`: 알림 규칙 목록 조회.
- `POST /api/v1/notifications/rules`: 신규 규칙 생성.
- `GET /api/v1/notifications/`: 알림 내역 및 발송 결과 조회.

---
**최종 업데이트:** 2026-02-12
