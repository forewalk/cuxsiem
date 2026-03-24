# 알림센터 전면 재설계 기획서

**작성일:** 2026-03-24
**작성자:** 박지은
**버전:** 1.0
**상태:** 초안

---

## 1. 개요

### 1.1 목적

알림센터를 **위협감지 전용 DSL 쿼리 실행기**에서 **프로젝트 전체 서비스 이벤트 알림 허브**로 전환한다. 사용자가 소스 타입(헬스체크, BOM, 라이선스 등)을 선택하고 구조화된 조건을 설정하면, 스케줄러가 주기적으로 평가하여 알림을 발생시킨다.

### 1.2 배경

- 기존 알림센터는 OpenSearch 인덱스에 원시 DSL 쿼리를 실행하는 구조로, 위협 로그 감지에만 특화되어 있다.
- 디텍션 정책(Detector) 시스템이 이미 위협감지 역할을 수행하므로, 알림센터의 DSL 기반 규칙은 중복이다.
- 헬스체크 모니터 DOWN, BOM 만료, 라이선스 만료 등 프로젝트 내부 서비스 이벤트에 대한 알림 체계가 없다.

### 1.3 범위

**포함:**
- 알림 규칙 스키마를 `source_type` + `source_config` 기반으로 재설계
- 소스별 평가기(Evaluator) 패턴 도입 (확장 가능한 플러그인 구조)
- 1차 구현: `healthcheck` 소스 타입 (Elastic Heartbeat 기반)
- 프론트엔드: DSL 에디터 제거, 소스 타입 선택 + 조건 빌더 UI
- 기존 WebSocket/Webhook 전달 체계 유지
- 알림 내역(cs_alerts) 구조 유지 (소스 메타데이터 추가)

**제외:**
- BOM 평가기 (BOM 백엔드 미구현 상태이므로 향후 확장)
- 라이선스 평가기 (향후 확장)
- 기존 DSL 기반 규칙 마이그레이션 (완전 교체이므로 기존 규칙 폐기)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)

1. **소스 타입 기반 알림 규칙 CRUD**: `source_type`과 `source_config`를 통해 서비스별 조건을 구조화하여 관리
2. **헬스체크 평가기**: OpenSearch `heartbeat` 인덱스를 조회하여 모니터 상태(DOWN) 및 레이턴시 초과를 감지
3. **조건 빌더 UI**: 소스 타입 선택 시 해당 소스에 맞는 조건 입력 폼을 동적으로 렌더링
4. **스케줄러 연동**: 기존 1분 주기 스케줄러가 새 평가기를 통해 규칙을 실행
5. **알림 전달**: 조건 충족 시 WebSocket(실시간 토스트) + Webhook 전달
6. **알림 내역 조회**: 기존 NotificationHistoryTab 유지, 소스 메타데이터 추가 표시

#### 선택 기능 (Should Have)

1. **규칙 테스트(프리뷰)**: 규칙 저장 전 현재 상태를 평가하여 "지금 이 조건이면 알림이 발생하는지" 미리 확인
2. **규칙 Export/Import**: JSON 기반 내보내기/가져오기 유지

#### 향후 고려사항 (Nice to Have)

1. BOM 평가기 (CVE 발견, 라이선스 만료 감지)
2. 라이선스 평가기 (제품 라이선스 만료 임박 감지)
3. 커스텀 평가기 (사용자 정의 OpenSearch 쿼리)

### 2.2 비기능 요구사항

#### 성능
- 스케줄러 1회 실행 시 모든 활성 규칙 평가 완료: 30초 이내
- 헬스체크 평가기 1회 실행: 5초 이내

#### 보안
- 인증/인가: JWT 기반 (기존과 동일)
- 역할 기반 알림 수신: `receiver.values`에 지정된 역할만 WebSocket 수신

#### 확장성
- 새 소스 타입 추가 시 Evaluator 클래스 1개 + 프론트엔드 ConditionBuilder 1개만 구현하면 됨
- 소스 타입 레지스트리를 통한 동적 등록

---

## 3. 사용자 시나리오

### 3.1 주요 사용자

- **보안 관리자(role-1)**: 알림 규칙 생성/수정/삭제, 알림 내역 조회
- **일반 운영자(role-2~4)**: 역할에 따라 알림 수신 및 내역 조회

### 3.2 사용 시나리오

#### 시나리오 1: 헬스체크 DOWN 알림 규칙 생성

**사전 조건:**
- Elastic Heartbeat 에이전트가 실행 중이며 `heartbeat` 인덱스에 데이터 적재 중
- 사용자가 role-1(관리자) 권한으로 로그인

**실행 단계:**
1. 사이드메뉴 "관리 설정 > 알림 센터 > 알림 규칙 목록" 클릭
2. "규칙 생성" 버튼 클릭
3. 기본 정보 입력: 이름 "웹서버 다운 알림", 심각도 "critical"
4. 소스 타입 드롭다운에서 "헬스체크" 선택
5. 조건 빌더가 헬스체크용으로 전환됨:
   - 조건: "상태 DOWN" 선택
   - 모니터 필터: "web-*" 입력 (와일드카드)
6. 실행 주기: 1분
7. 수신자: role-1 토글 ON, Webhook URL 입력
8. "테스트" 버튼으로 현재 조건 프리뷰 확인
9. "저장" 클릭

**기대 결과:**
- 규칙이 `cs_alert_rules` 인덱스에 저장됨
- 1분 주기 스케줄러가 `heartbeat` 인덱스에서 "web-*" 모니터 중 DOWN 상태를 감지
- DOWN 감지 시 WebSocket 토스트 + Webhook 전송

#### 시나리오 2: 헬스체크 레이턴시 초과 알림

**사전 조건:**
- 동일

**실행 단계:**
1. 규칙 생성 화면에서 소스 타입 "헬스체크" 선택
2. 조건: "레이턴시 초과" 선택
3. 임계값: 5000ms 입력
4. 모니터 필터: "*" (전체)
5. 저장

**기대 결과:**
- 스케줄러가 전체 모니터의 레이턴시를 확인하여 5000ms 초과 시 알림 발생

---

## 4. 데이터 요구사항

### 4.1 알림 규칙 데이터 모델 (NotificationRule)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string (UUID) | 자동생성 | 고유 식별자 |
| `name` | string | O | 규칙 이름 |
| `description` | string | X | 규칙 설명 |
| `source_type` | string | O | `healthcheck`, `bom`, `license` 등 |
| `source_config` | object | O | 소스별 구조화된 조건 (아래 상세) |
| `severity` | string | O | `info` / `low` / `medium` / `high` / `critical` |
| `interval_min` | integer (1~1440) | O | 평가 주기 (분) |
| `message_template` | string | O | 알림 메시지 템플릿 (`{{variable}}` 지원) |
| `receiver` | object | O | 수신자 설정 (역할 + Webhook) |
| `is_active` | boolean | O | 활성 상태 |
| `last_run_at` | datetime | 자동 | 마지막 실행 시각 |
| `last_triggered_at` | datetime | 자동 | 마지막 알림 발생 시각 |
| `total_alerts_count` | integer | 자동 | 누적 알림 횟수 |
| `created_at` | datetime | 자동 | 생성 시각 |
| `updated_at` | datetime | 자동 | 수정 시각 |
| `change_history` | array | 자동 | 변경 이력 |

### 4.2 source_config 상세 — `healthcheck` 타입

```json
{
  "condition": "status_down",
  "monitor_filter": "*",
  "latency_threshold_ms": null
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `condition` | string | `status_down`: 모니터 DOWN 감지, `latency_high`: 레이턴시 초과 감지 |
| `monitor_filter` | string | 모니터 이름 와일드카드 패턴 (`*` = 전체, `web-*` = web- 접두사) |
| `latency_threshold_ms` | integer / null | `latency_high` 조건일 때만 사용. 초과 시 알림 (밀리초) |

### 4.3 source_config 상세 — `bom` 타입 (향후)

```json
{
  "condition": "expiration_approaching",
  "days_before": 30
}
```

### 4.4 source_config 상세 — `license` 타입 (향후)

```json
{
  "condition": "license_expiring",
  "days_before": 30
}
```

### 4.5 receiver 구조 (기존 유지)

```json
{
  "type": "role",
  "values": ["role-1", "role-2"],
  "webhook_url": "https://hooks.example.com/alert",
  "webhook_headers": { "Content-Type": "application/json" },
  "webhook_body": "{\"text\": \"{{message}}\"}"
}
```

### 4.6 알림 내역 (AlertResponse) — 변경점

기존 필드에 추가:

| 필드 | 타입 | 설명 |
|------|------|------|
| `source_type` | string | 알림 발생 소스 타입 |
| `source_detail` | object | 소스별 부가 정보 (예: `{ "monitor_name": "web-01", "status": "down" }`) |

기존 `rule_target_index`, `event_index` 필드 → 소스 타입에 따라 자동 설정.

### 4.7 OpenSearch 인덱스

| 인덱스 | 용도 | 변경 |
|--------|------|------|
| `cs_alert_rules` | 알림 규칙 저장 | 매핑에 `source_type`, `source_config` 추가. `target_index`, `condition_config`, `trigger_condition` 제거 |
| `cs_alerts` | 알림 내역 저장 | 매핑에 `source_type`, `source_detail` 추가 |

---

## 5. API 요구사항

### 5.1 변경 없는 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/notifications/rules` | 규칙 목록 (기존 필터링/페이지네이션 유지) |
| `GET` | `/api/v1/notifications/rules/{rule_id}` | 규칙 상세 |
| `DELETE` | `/api/v1/notifications/rules/{rule_id}` | 규칙 삭제 (소프트 삭제) |
| `GET` | `/api/v1/notifications/` | 알림 내역 목록 |
| `POST` | `/api/v1/notifications/webhook/test` | Webhook 연결 테스트 |
| `GET` | `/api/v1/notifications/rules/export` | 규칙 내보내기 |
| `POST` | `/api/v1/notifications/rules/import` | 규칙 가져오기 |

### 5.2 변경되는 엔드포인트

#### POST `/api/v1/notifications/rules` — 규칙 생성

**요청:**
```json
{
  "name": "웹서버 다운 알림",
  "description": "웹서버 모니터가 DOWN일 때 알림",
  "source_type": "healthcheck",
  "source_config": {
    "condition": "status_down",
    "monitor_filter": "web-*",
    "latency_threshold_ms": null
  },
  "severity": "critical",
  "interval_min": 1,
  "message_template": "{{monitor_name}} 모니터가 DOWN 상태입니다.",
  "receiver": {
    "type": "role",
    "values": ["role-1"],
    "webhook_url": "https://hooks.example.com/alert"
  },
  "is_active": true
}
```

#### PUT `/api/v1/notifications/rules/{rule_id}` — 규칙 수정

동일 구조, 변경된 필드만 포함.

### 5.3 제거되는 엔드포인트

| Method | Path | 사유 |
|--------|------|------|
| `POST` | `/api/v1/notifications/rules/test-query` | DSL 쿼리 테스트 → 소스별 프리뷰로 대체 |
| `POST` | `/api/v1/notifications/rules/test-trigger` | 트리거 조건 테스트 → 소스별 프리뷰로 대체 |

### 5.4 신규 엔드포인트

#### POST `/api/v1/notifications/rules/preview` — 규칙 프리뷰

저장 전 현재 조건을 즉시 평가하여 결과를 반환한다.

**요청:**
```json
{
  "source_type": "healthcheck",
  "source_config": {
    "condition": "status_down",
    "monitor_filter": "web-*"
  }
}
```

**응답:**
```json
{
  "would_trigger": true,
  "matched_count": 2,
  "details": [
    { "monitor_name": "web-01", "status": "down", "url": "https://web-01.example.com", "timestamp": "..." },
    { "monitor_name": "web-03", "status": "down", "url": "https://web-03.example.com", "timestamp": "..." }
  ],
  "message_preview": "web-01 모니터가 DOWN 상태입니다."
}
```

### 5.5 소스 타입 목록 조회

#### GET `/api/v1/notifications/source-types` — 사용 가능한 소스 타입 목록

**응답:**
```json
[
  {
    "id": "healthcheck",
    "name": "헬스체크",
    "description": "HTTP/TCP 모니터 상태 및 SSL 인증서 만료 감지",
    "conditions": [
      { "id": "status_down", "name": "상태 DOWN", "fields": ["monitor_filter"] },
      { "id": "latency_high", "name": "레이턴시 초과", "fields": ["monitor_filter", "latency_threshold_ms"] }
    ]
  }
]
```

---

## 6. UI/UX 요구사항

### 6.1 화면 구성

기존 알림센터의 Master-Detail 레이아웃을 유지하되, 규칙 생성/수정 폼을 전면 재설계한다.

```
┌──────────────────────────────────────────────────────────────┐
│  알림 규칙 목록 (좌측 패널)  │  규칙 상세/편집 (우측 패널)       │
│                             │                                │
│  [+ 규칙 생성] [내보내기]    │  ┌─ 기본 정보 ──────────────┐   │
│                             │  │ 이름: ___________        │   │
│  ☑ 웹서버 다운 알림  🔴crit │  │ 심각도: [critical ▼]     │   │
│  ☐ API 레이턴시 경고  🟡med │  │ 설명: ___________        │   │
│  ☐ DB 연결 확인      🔵info│  └────────────────────────────┘   │
│                             │  ┌─ 이벤트 소스 ─────────────┐   │
│                             │  │ 소스 타입: [헬스체크 ▼]    │   │
│                             │  │                            │   │
│                             │  │ ┌─ 조건 빌더 ───────────┐ │   │
│                             │  │ │ 조건: [상태 DOWN ▼]    │ │   │
│                             │  │ │ 모니터: [web-*    ]    │ │   │
│                             │  │ └────────────────────────┘ │   │
│                             │  └────────────────────────────┘   │
│                             │  ┌─ 실행 설정 ──────────────┐    │
│                             │  │ 주기: [1] 분              │    │
│                             │  │ 메시지: [__________]      │    │
│                             │  └────────────────────────────┘   │
│                             │  ┌─ 수신자 설정 ─────────────┐   │
│                             │  │ 역할: [role-1 ✓] [role-2] │   │
│                             │  │ Webhook URL: [___]        │   │
│                             │  └────────────────────────────┘   │
│                             │                                │
│                             │  [테스트] [저장] [삭제]           │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 소스 타입 선택 UI

소스 타입 드롭다운은 아이콘 + 이름 + 설명을 포함한 선택 메뉴로 구현한다.

```
┌──────────────────────────────────┐
│  🏥 헬스체크                      │
│     HTTP/TCP 모니터 상태 감지     │
├──────────────────────────────────┤
│  📦 BOM (예정)                   │
│     CVE/라이선스 만료 감지        │
├──────────────────────────────────┤
│  🔑 라이선스 (예정)               │
│     제품 라이선스 만료 감지        │
└──────────────────────────────────┘
```

### 6.3 조건 빌더 — 헬스체크

소스 타입 선택 후 조건 빌더 영역이 해당 소스에 맞게 동적으로 전환된다.

**상태 DOWN 조건:**
```
조건: [상태 DOWN ▼]
모니터 필터: [web-* ] (와일드카드 지원, * = 전체)
```

**레이턴시 초과 조건:**
```
조건: [레이턴시 초과 ▼]
모니터 필터: [* ]
임계값: [5000] ms
```

### 6.4 알림 내역 테이블 변경

기존 컬럼에 "소스" 컬럼을 추가하여 어떤 서비스에서 발생한 알림인지 구분한다.

| 날짜 | 소스 | 심각도 | 규칙 이름 | 수신 역할 |
|------|------|--------|-----------|-----------|
| 2026-03-24 09:41 | 헬스체크 | 🔴 critical | 웹서버 다운 | role-1 |

---

## 7. 백엔드 아키텍처

### 7.1 평가기(Evaluator) 패턴

```
backend/app/services/evaluators/
├── __init__.py              ← EvaluatorRegistry 클래스
├── base.py                  ← BaseEvaluator 추상 클래스
└── healthcheck.py           ← HealthCheckEvaluator
```

#### BaseEvaluator (추상 클래스)

```python
class EvaluationResult:
    triggered: bool
    matched_count: int
    details: list[dict]          # 매칭된 항목들의 요약
    template_context: dict       # 메시지 템플릿 변수

class BaseEvaluator(ABC):
    @abstractmethod
    async def evaluate(self, source_config: dict) -> EvaluationResult:
        """소스 조건을 평가하여 결과를 반환한다."""

    @abstractmethod
    def get_source_type(self) -> str:
        """이 평가기가 담당하는 source_type을 반환한다."""
```

#### EvaluatorRegistry

```python
class EvaluatorRegistry:
    _evaluators: dict[str, BaseEvaluator] = {}

    @classmethod
    def register(cls, evaluator: BaseEvaluator):
        cls._evaluators[evaluator.get_source_type()] = evaluator

    @classmethod
    def get(cls, source_type: str) -> BaseEvaluator | None:
        return cls._evaluators.get(source_type)
```

#### HealthCheckEvaluator

- OpenSearch `heartbeat` 인덱스를 `collapse(monitor.id)` + `sort(@timestamp desc)`로 조회
- `monitor_filter`로 `monitor.name` 와일드카드 필터
- `status_down`: `monitor.status == "down"` 인 모니터 감지
- `latency_high`: `monitor.duration.us > threshold * 1000` 인 모니터 감지
- 결과의 `template_context`에 `monitor_name`, `monitor_count`, `status`, `url` 등 포함

### 7.2 스케줄러 흐름

```
DetectionScheduler.run_active_detections()
  → NotificationService.list_rules() (활성 규칙 조회)
  → 각 규칙에 대해:
      1. interval_min 체크 (실행 주기 도래 여부)
      2. EvaluatorRegistry.get(rule.source_type)
      3. evaluator.evaluate(rule.source_config)
      4. result.triggered == True 이면:
         a. 메시지 템플릿 렌더링
         b. cs_alerts 문서 생성
         c. WebSocket + Webhook 전달
      5. rule.last_run_at 업데이트
```

---

## 8. 성공 기준

### 8.1 완료 조건

- [ ] `source_type` + `source_config` 기반 규칙 CRUD가 정상 동작
- [ ] 헬스체크 평가기가 모니터 DOWN 및 레이턴시 초과를 정확히 감지
- [ ] 프론트엔드에서 소스 타입 선택 → 조건 빌더 → 저장 플로우가 완성
- [ ] 규칙 프리뷰(테스트) 기능이 정상 동작
- [ ] 스케줄러가 새 평가기를 통해 규칙을 주기적으로 실행
- [ ] WebSocket 토스트 + Webhook 전달이 정상 동작
- [ ] 알림 내역에 소스 타입이 표시됨
- [ ] 백엔드 테스트 통과 (평가기 단위 테스트, 서비스 통합 테스트)

### 8.2 측정 지표

- 헬스체크 평가기 단일 실행 소요 시간 < 5초
- 전체 규칙 평가 1사이클 소요 시간 < 30초
- 새 소스 타입 추가 시 필요한 코드: Evaluator 1개 + ConditionBuilder 1개

---

## 9. 일정 및 우선순위

### 9.1 우선순위
- [x] P1 - 높음

### 9.2 예상 일정
- 기획 완료: 2026-03-24
- 개발 완료: 2026-03-26
- 테스트 완료: 2026-03-27

---

## 10. 참고자료

- `docs/HEALTH_RESEARCH.md`: 헬스체크 모니터링 시스템 분석 보고서
- `docs/DETECTION_RESEARCH.md`: 디텍션 룰 시스템 분석 보고서
- `backend/app/services/notification.py`: 현재 알림 서비스 (전면 수정 대상)
- `backend/app/api/v1/endpoints/monitoring.py`: Heartbeat 조회 로직 참조
- `backend/app/core/scheduler.py`: 현재 스케줄러 구조

---

## 11. 질문 및 미결정 사항

1. 기존 `cs_alert_rules`에 저장된 DSL 기반 규칙을 어떻게 처리할 것인가? → 완전 교체 결정 (기존 규칙 폐기)
2. BOM 평가기 구현 시점? → BOM 백엔드 구현 완료 후
3. 인덱스 매핑 변경 시 무중단 마이그레이션 필요한가? → 개발 환경이므로 인덱스 재생성으로 처리

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-03-24 | 1.0 | 초안 작성 | 박지은 |
