# 알림센터 전면 재설계 — 최종 기획서

**작성일:** 2026-03-24
**확정일:** 2026-03-24
**작성자:** 박지은
**버전:** 2.0 (1단계 초안 + 2단계 검토 통합)
**상태:** 확정

---

## 1. 개요

### 1.1 목적

알림센터를 **위협감지 전용 DSL 쿼리 실행기**에서 **프로젝트 전체 서비스 이벤트 알림 허브**로 전환한다. 사용자가 소스 타입(헬스체크, BOM, 라이선스 등)을 선택하고 구조화된 조건을 설정하면, 스케줄러가 주기적으로 평가하여 알림을 발생시킨다.

### 1.2 배경

- 기존 알림센터는 OpenSearch 인덱스에 원시 DSL 쿼리를 실행하는 구조로, 위협 로그 감지에만 특화되어 있다.
- 디텍션 정책(Detector) 시스템이 이미 위협감지 역할을 수행하므로, 알림센터의 DSL 기반 규칙은 중복이다.
- 헬스체크 모니터 DOWN, SSL 인증서 만료, BOM 만료, 라이선스 만료 등 프로젝트 내부 서비스 이벤트에 대한 알림 체계가 없다.

### 1.3 범위

**포함:**
- 알림 규칙 스키마를 `source_type` + `source_config` 기반으로 재설계
- 소스별 평가기(Evaluator) 패턴 도입 (확장 가능한 플러그인 구조)
- 1차 구현: `healthcheck` 소스 타입 (상태 DOWN, 레이턴시 초과, SSL 인증서 만료)
- 프론트엔드: DSL 에디터 제거, 소스 타입 선택 + 조건 빌더 UI
- 기존 WebSocket/Webhook 전달 체계 유지
- 알림 내역(cs_alerts) 구조 유지 (소스 메타데이터 추가)
- `source_config`에 대한 소스 타입별 Pydantic 검증 모델 적용
- 중복 알림 방지(dedup) 전략 명시

**제외:**
- BOM 평가기 (BOM 백엔드 미구현 상태이므로 향후 확장)
- 라이선스 평가기 (향후 확장)
- 기존 DSL 기반 규칙 마이그레이션 (완전 교체이므로 기존 규칙 폐기)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)

1. **소스 타입 기반 알림 규칙 CRUD**: `source_type`과 `source_config`를 통해 서비스별 조건을 구조화하여 관리
2. **헬스체크 평가기**: OpenSearch `heartbeat` 인덱스를 조회하여 모니터 상태(DOWN), 레이턴시 초과, SSL 인증서 만료 임박을 감지
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
- `source_config` 입력 검증: 소스 타입별 Pydantic 모델로 구조 검증
- `monitor_filter` 와일드카드 패턴 길이 제한 (최대 100자)

#### 확장성
- 새 소스 타입 추가 시 Evaluator 클래스 1개 + 프론트엔드 ConditionBuilder 1개만 구현하면 됨
- 소스 타입 레지스트리를 통한 동적 등록

---

## 3. 사용자 시나리오

### 3.1 시나리오 1: 헬스체크 DOWN 알림 규칙 생성

**사전 조건:** Heartbeat 에이전트 실행 중, 사용자 role-1 로그인

**실행 단계:**
1. 사이드메뉴 "관리 설정 > 알림 센터 > 알림 규칙 목록" 클릭
2. "규칙 생성" 버튼 클릭
3. 기본 정보 입력: 이름 "웹서버 다운 알림", 심각도 "critical"
4. 소스 타입 드롭다운에서 "헬스체크" 선택
5. 조건 빌더가 헬스체크용으로 전환됨:
   - 조건: "상태 DOWN" 선택
   - 모니터 필터: "web-*" 입력
6. 실행 주기: 1분
7. 수신자: role-1 토글 ON, Webhook URL 입력
8. "테스트" 버튼으로 현재 조건 프리뷰 확인
9. "저장" 클릭

**기대 결과:** 규칙 저장 → 1분 주기 스케줄러가 DOWN 모니터 감지 시 WebSocket + Webhook 전달

### 3.2 시나리오 2: 헬스체크 레이턴시 초과 알림

1. 소스 타입 "헬스체크" 선택
2. 조건: "레이턴시 초과", 임계값: 5000ms
3. 모니터 필터: "*" (전체)
4. 저장

### 3.3 시나리오 3: SSL 인증서 만료 임박 알림

1. 소스 타입 "헬스체크" 선택
2. 조건: "인증서 만료 임박", 잔여일: 30일
3. 모니터 필터: "https-*"
4. 저장

**기대 결과:** 인증서 만료까지 30일 이내인 모니터 감지 시 알림 발생

### 3.4 시나리오 4: 규칙 비활성화/재활성화

1. 규칙 목록에서 토글 스위치로 비활성화
2. 스케줄러가 해당 규칙을 건너뜀
3. 다시 토글로 활성화 → 다음 주기부터 재실행

### 3.5 예외 상황

| 상황 | 동작 |
|------|------|
| `heartbeat` 인덱스 미존재 | 평가기가 `triggered=False` 반환, 규칙 실행 기록만 업데이트 |
| 모니터 필터 매칭 0건 | `triggered=False`, 정상 종료 |
| Heartbeat 에이전트 중단 (데이터 미유입) | 마지막 데이터 기준으로 평가 (DOWN 상태 유지 시 알림 발생) |

---

## 4. 데이터 모델

### 4.1 알림 규칙 (NotificationRule)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string (UUID) | 자동생성 | 고유 식별자 |
| `name` | string | O | 규칙 이름 |
| `description` | string | X | 규칙 설명 |
| `source_type` | string | O | `healthcheck` / `bom` / `license` |
| `source_config` | object | O | 소스별 구조화된 조건 (4.2 참조) |
| `severity` | string | O | `info` / `low` / `medium` / `high` / `critical` |
| `interval_min` | integer (1~1440) | O | 평가 주기 (분) |
| `message_template` | string | O | 알림 메시지 템플릿 (`{{variable}}` 지원) |
| `receiver` | object | O | 수신자 설정 (4.5 참조) |
| `is_active` | boolean | O | 활성 상태 |
| `last_run_at` | datetime | 자동 | 마지막 실행 시각 |
| `last_triggered_at` | datetime | 자동 | 마지막 알림 발생 시각 |
| `total_alerts_count` | integer | 자동 | 누적 알림 횟수 |
| `created_at` | datetime | 자동 | 생성 시각 |
| `updated_at` | datetime | 자동 | 수정 시각 |
| `deleted_at` | datetime | 자동 | 소프트 삭제 시각 |
| `change_history` | array | 자동 | 변경 이력 |

**제거되는 필드 (기존 DSL 모델 대비):**
- `target_index` — 소스 타입에 의해 자동 결정
- `condition_config` — `source_config`로 대체
- `trigger_condition` — 평가기 내부 로직으로 대체

### 4.2 source_config — `healthcheck` 타입

```json
{
  "condition": "status_down",
  "monitor_filter": "*",
  "latency_threshold_ms": null,
  "days_before": null
}
```

| 필드 | 타입 | 조건 | 설명 |
|------|------|------|------|
| `condition` | string | 필수 | `status_down` / `latency_high` / `cert_expiring` |
| `monitor_filter` | string | 필수 | 모니터 이름 와일드카드 (`*` = 전체) |
| `latency_threshold_ms` | integer / null | `latency_high`일 때 필수 | 초과 시 알림 (밀리초) |
| `days_before` | integer / null | `cert_expiring`일 때 필수 | 만료 N일 전 알림 |

**Pydantic 검증 모델:**

```python
class HealthCheckSourceConfig(BaseModel):
    condition: Literal["status_down", "latency_high", "cert_expiring"]
    monitor_filter: str = Field(default="*", max_length=100)
    latency_threshold_ms: Optional[int] = Field(default=None, ge=1)
    days_before: Optional[int] = Field(default=None, ge=1, le=365)

    @model_validator(mode="after")
    def validate_condition_fields(self):
        if self.condition == "latency_high" and self.latency_threshold_ms is None:
            raise ValueError("latency_high 조건에는 latency_threshold_ms가 필수")
        if self.condition == "cert_expiring" and self.days_before is None:
            raise ValueError("cert_expiring 조건에는 days_before가 필수")
        return self
```

### 4.3 source_config — `bom` 타입 (향후)

```json
{
  "condition": "expiration_approaching",
  "days_before": 30
}
```

### 4.4 source_config — `license` 타입 (향후)

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

기존 `rule_target_index`, `event_index` 필드 → 소스 타입에 따라 자동 설정 (헬스체크 = `heartbeat`).

### 4.7 메시지 템플릿 변수

| 변수 | 설명 | 적용 조건 | 예시 |
|------|------|-----------|------|
| `{{monitor_name}}` | 감지된 모니터 이름 | 전체 | `web-01` |
| `{{monitor_count}}` | 감지된 모니터 수 | 전체 | `3` |
| `{{status}}` | 모니터 상태 | `status_down` | `down` |
| `{{url}}` | 모니터 URL | 전체 | `https://web-01.example.com` |
| `{{latency_ms}}` | 응답 시간 (ms) | `latency_high` | `5234` |
| `{{cert_subject}}` | 인증서 CN | `cert_expiring` | `*.example.com` |
| `{{cert_days_left}}` | 인증서 잔여일 | `cert_expiring` | `15` |
| `{{cert_expires}}` | 인증서 만료일 | `cert_expiring` | `2026-04-08` |
| `{{rule_name}}` | 규칙 이름 | 전체 | `웹서버 다운 알림` |
| `{{severity}}` | 심각도 | 전체 | `critical` |

### 4.8 OpenSearch 인덱스 변경

| 인덱스 | 용도 | 변경 사항 |
|--------|------|-----------|
| `cs_alert_rules` | 알림 규칙 저장 | `source_type`(keyword), `source_config`(object) 추가. `target_index`, `condition_config`, `trigger_condition` 제거 |
| `cs_alerts` | 알림 내역 저장 | `source_type`(keyword), `source_detail`(object) 추가 |

> **참고:** 현재 init 스크립트(`init_notification.py`)는 `cs_notification_rules`를 생성하지만, 런타임 코드(`NotificationRepository`)는 `cs_alert_rules`를 사용한다. 이번 재설계에서 init 스크립트를 `cs_alert_rules`로 통일한다.

### 4.9 중복 알림 방지(Dedup) 전략

기존 분 단위 dedup 유지: `{rule_id}_{YYYY-MM-DDTHH:MM:00}`

- 동일 규칙은 1분에 최대 1건만 알림 생성
- 같은 모니터가 계속 DOWN이어도, 각 평가 주기마다 1건씩 생성됨
- 향후 소스별 커스텀 dedup이 필요하면 Evaluator에 위임 가능

---

## 5. API 요구사항

### 5.1 유지되는 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/notifications/rules` | 규칙 목록 (필터/페이지네이션) |
| `GET` | `/api/v1/notifications/rules/{rule_id}` | 규칙 상세 |
| `DELETE` | `/api/v1/notifications/rules/{rule_id}` | 규칙 삭제 (소프트 삭제) |
| `GET` | `/api/v1/notifications/` | 알림 내역 목록 |
| `POST` | `/api/v1/notifications/webhook/test` | Webhook 연결 테스트 |
| `GET` | `/api/v1/notifications/rules/export` | 규칙 내보내기 |
| `POST` | `/api/v1/notifications/rules/import` | 규칙 가져오기 |

### 5.2 변경되는 엔드포인트

#### POST `/api/v1/notifications/rules` — 규칙 생성

```json
{
  "name": "웹서버 다운 알림",
  "description": "웹서버 모니터가 DOWN일 때 알림",
  "source_type": "healthcheck",
  "source_config": {
    "condition": "status_down",
    "monitor_filter": "web-*"
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
| `POST` | `/rules/test-query` | DSL 쿼리 테스트 → 소스별 프리뷰로 대체 |
| `POST` | `/rules/test-trigger` | 트리거 조건 테스트 → 소스별 프리뷰로 대체 |

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

#### GET `/api/v1/notifications/source-types` — 소스 타입 목록

**응답:**
```json
[
  {
    "id": "healthcheck",
    "name": "헬스체크",
    "description": "HTTP/TCP 모니터 상태 및 SSL 인증서 만료 감지",
    "conditions": [
      { "id": "status_down", "name": "상태 DOWN", "fields": ["monitor_filter"] },
      { "id": "latency_high", "name": "레이턴시 초과", "fields": ["monitor_filter", "latency_threshold_ms"] },
      { "id": "cert_expiring", "name": "인증서 만료 임박", "fields": ["monitor_filter", "days_before"] }
    ]
  }
]
```

---

## 6. UI/UX 요구사항

### 6.1 화면 구성

기존 알림센터의 Master-Detail 레이아웃 유지. 규칙 생성/수정 폼 전면 재설계.

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

아이콘 + 이름 + 설명을 포함한 MUI Select 메뉴:

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

소스 타입 선택 후 조건 빌더가 동적으로 전환된다.

**상태 DOWN:**
```
조건: [상태 DOWN ▼]
모니터 필터: [web-* ] (와일드카드, * = 전체)
```

**레이턴시 초과:**
```
조건: [레이턴시 초과 ▼]
모니터 필터: [* ]
임계값: [5000] ms
```

**인증서 만료 임박:**
```
조건: [인증서 만료 임박 ▼]
모니터 필터: [https-* ]
잔여일: [30] 일
```

### 6.4 알림 내역 테이블 변경

"소스" 컬럼 추가:

| 날짜 | 소스 | 심각도 | 규칙 이름 | 수신 역할 |
|------|------|--------|-----------|-----------|
| 2026-03-24 09:41 | 헬스체크 | critical | 웹서버 다운 | role-1 |

---

## 7. 백엔드 아키텍처

### 7.1 평가기(Evaluator) 패턴

```
backend/app/services/evaluators/
├── __init__.py              ← EvaluatorRegistry
├── base.py                  ← BaseEvaluator + EvaluationResult
└── healthcheck.py           ← HealthCheckEvaluator
```

#### EvaluationResult

```python
@dataclass
class EvaluationResult:
    triggered: bool
    matched_count: int
    details: list[dict]          # 매칭된 항목들의 요약
    template_context: dict       # 메시지 템플릿 변수 (첫 번째 매칭 기준)
```

#### BaseEvaluator

```python
class BaseEvaluator(ABC):
    @abstractmethod
    async def evaluate(self, source_config: dict) -> EvaluationResult:
        """소스 조건을 평가하여 결과를 반환한다."""

    @abstractmethod
    def get_source_type(self) -> str:
        """이 평가기가 담당하는 source_type을 반환한다."""

    @abstractmethod
    def get_conditions(self) -> list[dict]:
        """사용 가능한 조건 목록을 반환한다 (/source-types API용)."""
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

    @classmethod
    def list_source_types(cls) -> list[dict]:
        """등록된 모든 소스 타입 정보를 반환한다."""
        return [
            {
                "id": e.get_source_type(),
                "name": e.get_display_name(),
                "description": e.get_description(),
                "conditions": e.get_conditions(),
            }
            for e in cls._evaluators.values()
        ]
```

#### HealthCheckEvaluator

| 조건 | OpenSearch 쿼리 | 감지 로직 |
|------|-----------------|-----------|
| `status_down` | `collapse(monitor.id)` + `sort(@timestamp desc)` + `wildcard(monitor.name)` | `monitor.status == "down"` |
| `latency_high` | 동일 collapse + `range(monitor.duration.us > threshold * 1000)` | 임계값 초과 |
| `cert_expiring` | 동일 collapse + `range(tls.certificate_not_valid_after < now+Nd)` | 만료 N일 이내 |

### 7.2 스케줄러 흐름 (수정 후)

```
DetectionScheduler.run_active_detections()
  → NotificationService.list_rules() (활성 규칙 조회)
  → 각 규칙에 대해:
      1. interval_min vs last_run_at 비교 → 미도래 시 skip
      2. EvaluatorRegistry.get(rule.source_type)
      3. evaluator.evaluate(rule.source_config)
      4. result.triggered == True:
         a. 메시지 템플릿 렌더링 (result.template_context)
         b. dedup 키 생성 ({rule_id}_{time_window})
         c. cs_alerts 문서 생성 (source_type, source_detail 포함)
         d. WebSocket + Webhook 전달
      5. rule.last_run_at 업데이트
```

### 7.3 수정 대상 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `app/schemas/notification.py` | **전면 수정** | source_type/source_config 스키마, HealthCheckSourceConfig 추가 |
| `app/services/notification.py` | **전면 수정** | DSL 로직 제거, Evaluator 호출로 교체 |
| `app/services/evaluators/__init__.py` | **신규** | EvaluatorRegistry |
| `app/services/evaluators/base.py` | **신규** | BaseEvaluator, EvaluationResult |
| `app/services/evaluators/healthcheck.py` | **신규** | HealthCheckEvaluator |
| `app/repositories/notification.py` | **수정** | 인덱스명 통일, source_type 관련 필드 반영 |
| `app/api/v1/endpoints/notification.py` | **수정** | test-query/test-trigger 제거, preview/source-types 추가 |
| `app/core/scheduler.py` | **수정** | 새 서비스 메서드 호출로 전환 |
| `scripts/init_notification.py` | **수정** | 인덱스 매핑 업데이트, 인덱스명 `cs_alert_rules`로 통일 |

### 7.4 프론트엔드 수정 대상

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/types/index.ts` | **수정** | NotificationRule 타입에 source_type/source_config 추가, 기존 DSL 필드 제거 |
| `src/services/notificationService.ts` | **수정** | preview, source-types API 추가, test-query/test-trigger 제거 |
| `NotificationRuleForm` 컴포넌트 | **전면 수정** | DSL 에디터 제거, 소스 타입 선택 + 조건 빌더 UI |
| `NotificationRuleDetail` 컴포넌트 | **수정** | source_type/source_config 표시 |
| `NotificationHistoryTab` 컴포넌트 | **수정** | "소스" 컬럼 추가 |
| `src/locales/*.json` | **수정** | 4개 언어 파일에 새 i18n 키 추가 |

---

## 8. 성공 기준

- [ ] `source_type` + `source_config` 기반 규칙 CRUD 정상 동작
- [ ] 헬스체크 평가기가 `status_down`, `latency_high`, `cert_expiring` 3개 조건을 정확히 감지
- [ ] 프론트엔드에서 소스 타입 선택 → 조건 빌더 → 저장 플로우 완성
- [ ] 규칙 프리뷰(테스트) 기능 정상 동작
- [ ] 스케줄러가 새 평가기를 통해 규칙을 주기적으로 실행
- [ ] WebSocket 토스트 + Webhook 전달 정상 동작
- [ ] 알림 내역에 소스 타입이 표시됨
- [ ] 백엔드 테스트 통과 (평가기 단위 테스트, 서비스 통합 테스트)
- [ ] init 스크립트와 런타임 인덱스명 `cs_alert_rules`로 통일

---

## 9. 일정

| 단계 | 예정일 |
|------|--------|
| 기획 확정 | 2026-03-24 |
| 개발 완료 | 2026-03-26 |
| 테스트 완료 | 2026-03-27 |

---

## 10. 추후 개발 — 소스 타입 확장 로드맵

현재 `healthcheck`만 구현된 Evaluator 프레임워크에 아래 소스 타입들을 순차적으로 추가한다.

| 소스 타입 | 조건 예시 | 데이터 출처 |
|-----------|-----------|------------|
| **에이전트 상태** | 에이전트 오프라인, 감염된 에이전트 발견 | EDR 인덱스 (`endpoint.os`, `agent.is_active` 등) |
| **위협 감지** | 특정 시간 내 위협 N건 초과, Critical 위협 발생 | 대시보드 threat-status 쿼리 |
| **탐지 이벤트** | 특정 탐지 정책이 Findings를 생성했을 때 | `cs_detection_findings` 인덱스 |
| **로그 수집 이상** | 특정 인덱스의 로그 유입이 N분간 0건 (파이프라인 끊김) | 로그 인덱스 타임스탬프 기반 |
| **사용자 인증** | 로그인 실패 N회 연속, 계정 잠금 발생 | `cs_users` (`login_fail_count`, `locked_until`) |
| **세션 만료** | 유휴 세션이 만료되었을 때 | 스케줄러의 `expire_idle_sessions` |
| **BOM 만료** | 소프트웨어/AI 자산의 라이선스 만료일 접근 | BOM 데이터 (현재 목업, 백엔드 구현 시) |

> 각 소스 타입은 `BaseEvaluator`를 상속하여 `backend/app/services/evaluators/` 디렉토리에 추가하고, `EvaluatorRegistry`에 등록하면 별도 API/UI 수정 없이 자동으로 `/source-types`에 노출된다.

---

## 11. 참고자료

- `docs/HEALTH_RESEARCH.md` — 헬스체크 모니터링 시스템 분석 보고서
- `docs/DETECTION_RESEARCH.md` — 디텍션 룰 시스템 분석 보고서
- `backend/app/services/notification.py` — 현재 알림 서비스 (전면 수정 대상)
- `backend/app/api/v1/endpoints/monitoring.py` — Heartbeat 조회 로직 참조
- `backend/app/core/scheduler.py` — 현재 스케줄러 구조

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-03-24 | 1.0 | 초안 작성 | 박지은 |
| 2026-03-24 | 2.0 | 검토 반영 확정 — cert_expiring 조건 추가, Pydantic 검증 모델 정의, dedup 전략 명시, 메시지 템플릿 변수 문서화, 인덱스명 불일치 해결, 예외 상황 추가 | 박지은 |
