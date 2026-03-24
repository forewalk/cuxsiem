# 알림센터 전면 재설계 — 개발 계획서

**작성일:** 2026-03-24
**작성자:** AI
**기반 문서:** `3_alert_final_spec.md`
**상태:** 초안

---

## 개발 개요

### 목표
알림센터를 DSL 쿼리 기반에서 소스 타입 + 평가기(Evaluator) 기반으로 전환한다. 1차 구현으로 헬스체크(status_down, latency_high, cert_expiring) 소스를 완성한다.

### 변경 범위
알림 관련 코드만 수정. `scheduler.py`, `monitoring.py` 등 외부 코드 변경 없음.

### 예상 소요 시간
약 6~8시간 (백엔드 4h + 프론트엔드 3h + 테스트 1h)

---

## 1. 아키텍처 설계

### 1.1 변경 후 레이어 구조

```
Endpoint (notification.py)
    ↓
Service (notification.py)  ──→  Evaluator (evaluators/)
    ↓                              ↓
Repository (notification.py)    OpenSearch "heartbeat" 직접 조회
    ↓
OpenSearch "cs_alert_rules" / "cs_alerts"
```

### 1.2 신규 파일

```
backend/app/services/evaluators/
├── __init__.py              ← EvaluatorRegistry + 자동 등록
├── base.py                  ← BaseEvaluator, EvaluationResult
└── healthcheck.py           ← HealthCheckEvaluator
```

### 1.3 수정 파일 (백엔드)

| 파일 | 줄 수 | 변경 유형 |
|------|-------|-----------|
| `app/schemas/notification.py` | 115 | 전면 수정 — source_type/source_config 스키마 |
| `app/services/notification.py` | 536 | 전면 수정 — DSL 제거, Evaluator 호출 |
| `app/repositories/notification.py` | 422 | 부분 수정 — 필드명 반영 |
| `app/api/v1/endpoints/notification.py` | 260 | 부분 수정 — 엔드포인트 추가/제거 |
| `scripts/init_notification.py` | 190 | 수정 — 인덱스 매핑 업데이트 |

### 1.4 수정 파일 (프론트엔드)

| 파일 | 줄 수 | 변경 유형 |
|------|-------|-----------|
| `src/types/index.ts` | ~85줄 영역 | 부분 수정 — NotificationRule 타입 변경 |
| `src/services/notificationService.ts` | 117 | 부분 수정 — API 메서드 추가/제거 |
| `NotificationRuleDetail.tsx` | 445 | 전면 수정 — DSL 에디터 → 조건 빌더 |
| `NotificationRuleReadonly.tsx` | 257 | 부분 수정 — source_type/config 표시 |
| `NotificationRuleListTab.tsx` | 643 | 부분 수정 — test-query 제거, preview 연동 |
| `NotificationHistoryTab.tsx` | 366 | 부분 수정 — 소스 컬럼 추가 |
| `src/locales/{ko,en,ja,cn}.json` | 4파일 | 추가 — 새 i18n 키 |

### 1.5 건드리지 않는 파일

| 파일 | 이유 |
|------|------|
| `app/core/scheduler.py` | `run_detection_for_rule()` 시그니처 유지 |
| `app/api/v1/endpoints/monitoring.py` | 별개 도메인 |
| `components/NotificationBell.tsx` | 기존 WebSocket 수신 구조 유지 |
| `hooks/useGlobalAlertNotification.ts` | 기존 WebSocket 훅 유지 |
| `GlobalAlertSnackbar.tsx` | 기존 토스트 UI 유지 |
| `WebhookHeadersEditor.tsx` | 재사용 (변경 없음) |
| `AlertsControlBar.tsx` | 재사용 (변경 없음) |
| `AlertTableStyles.ts` | 재사용 (변경 없음) |
| `AlertTableFilterMenu.tsx` | 재사용 (변경 없음) |

---

## 2. OpenSearch 인덱스 설계

### 2.1 cs_alert_rules 매핑 변경

**추가 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `source_type` | keyword | `healthcheck` / `bom` / `license` |
| `source_config` | object (dynamic) | 소스별 구조화된 조건 |

**제거 필드:**

| 필드 | 사유 |
|------|------|
| `target_index` | source_type으로 자동 결정 |
| `condition_config` | source_config로 대체 |
| `trigger_condition` | 평가기 내부 로직으로 대체 |
| `condition_type` | 사용하지 않음 |
| `channels` | 사용하지 않음 (receiver로 통합) |

### 2.2 cs_alerts 매핑 변경

**추가 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `source_type` | keyword | 알림 발생 소스 |
| `source_detail` | object (dynamic) | 감지 상세 (모니터명, 상태 등) |

---

## 3. API 설계

### 3.1 변경 없음

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/rules` | 규칙 목록 |
| `GET` | `/rules/{rule_id}` | 규칙 상세 |
| `DELETE` | `/rules/{rule_id}` | 규칙 삭제 |
| `GET` | `/` | 알림 내역 |
| `POST` | `/webhook/test` | Webhook 테스트 |
| `GET` | `/rules/export` | 규칙 내보내기 |
| `POST` | `/rules/import` | 규칙 가져오기 |

### 3.2 변경됨

| Method | Path | 변경 내용 |
|--------|------|-----------|
| `POST` | `/rules` | 요청 바디에 `source_type` + `source_config` (기존 `target_index` + `condition_config` + `trigger_condition` 제거) |
| `PUT` | `/rules/{rule_id}` | 동일 |

### 3.3 제거

| Method | Path |
|--------|------|
| `POST` | `/rules/test-query` |
| `POST` | `/rules/test-trigger` |

### 3.4 신규

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/rules/preview` | 규칙 프리뷰 (저장 전 조건 평가) |
| `GET` | `/source-types` | 사용 가능한 소스 타입 목록 |

---

## 4. 구현 상세

### 4.1 Evaluator — base.py

```python
@dataclass
class EvaluationResult:
    triggered: bool
    matched_count: int
    details: list[dict]
    template_context: dict

class BaseEvaluator(ABC):
    @abstractmethod
    async def evaluate(self, source_config: dict) -> EvaluationResult: ...
    @abstractmethod
    def get_source_type(self) -> str: ...
    @abstractmethod
    def get_display_name(self) -> str: ...
    @abstractmethod
    def get_description(self) -> str: ...
    @abstractmethod
    def get_conditions(self) -> list[dict]: ...
```

### 4.2 Evaluator — healthcheck.py

3개 조건 구현:

| 조건 | OpenSearch 쿼리 핵심 | 감지 로직 |
|------|----------------------|-----------|
| `status_down` | `collapse(monitor.id)` + `term(monitor.status: down)` | DOWN 상태 모니터 수집 |
| `latency_high` | `collapse(monitor.id)` + `range(monitor.duration.us > N*1000)` | 임계값 초과 모니터 수집 |
| `cert_expiring` | `collapse(monitor.id)` + `range(tls.certificate_not_valid_after < now+Nd)` | 만료 임박 인증서 수집 |

공통: `monitor_filter`로 `wildcard(monitor.name)` 필터. OpenSearch 클라이언트는 `get_opensearch()`로 직접 주입.

### 4.3 Schema 변경 — notification.py

```python
class HealthCheckSourceConfig(BaseModel):
    condition: Literal["status_down", "latency_high", "cert_expiring"]
    monitor_filter: str = Field(default="*", max_length=100)
    latency_threshold_ms: Optional[int] = Field(default=None, ge=1)
    days_before: Optional[int] = Field(default=None, ge=1, le=365)

class NotificationRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: str
    source_config: Dict[str, Any]
    severity: str = "info"
    interval_min: int = Field(ge=1, le=1440)
    message_template: str = "알림이 발생했습니다."
    receiver: Dict[str, Any] = Field(default_factory=...)
    is_active: bool = True
```

`validate_source_config()` 함수로 source_type별 Pydantic 모델 검증 (서비스 레이어에서 호출).

### 4.4 Service 변경 — notification.py

`run_detection_for_rule(rule)` 메서드 내부 변경:
- 기존: `os_client.search(index=rule.target_index, body=rule.condition_config)` + AST trigger 평가
- 변경 후: `EvaluatorRegistry.get(rule.source_type).evaluate(rule.source_config)`

유지: `_render_message_template()`, `_deliver_alert()`, `_build_webhook_payload()`, `_create_aggregation_alert()`
제거: `test_query()`, `test_trigger()`, `_evaluate_trigger_condition()`, `_eval_node()`, `DotDict`
신규: `preview_rule()`, `get_source_types()`

### 4.5 프론트엔드 — NotificationRuleDetail.tsx 재설계

DSL JSON 에디터 + trigger 조건 입력 → **소스 타입 선택 + 동적 조건 빌더** 로 교체.

섹션 구조:
1. 기본 정보 (이름, 심각도, 설명) — 유지
2. **이벤트 소스** (신규) — 소스 타입 Select + HealthCheckConditionBuilder
3. 실행 설정 (주기, 메시지 템플릿) — 유지
4. 수신자 + Webhook — 유지
5. 변경 이력 — 유지

`HealthCheckConditionBuilder` 서브 컴포넌트:
- 조건 Select (상태 DOWN / 레이턴시 초과 / 인증서 만료)
- 모니터 필터 TextField
- 조건별 추가 필드 (임계값 ms / 잔여일)

---

## 5. 테스트 계획

### 5.1 백엔드 단위 테스트

| 테스트 파일 | 대상 | 주요 케이스 |
|-------------|------|-------------|
| `tests/test_services/test_evaluators.py` | HealthCheckEvaluator | status_down 감지, latency_high 감지, cert_expiring 감지, 빈 인덱스, 필터 매칭 0건 |
| `tests/test_services/test_notification.py` | NotificationService | source_config 검증, 규칙 CRUD, preview, 메시지 렌더링 |

### 5.2 백엔드 API 테스트

| 테스트 파일 | 대상 | 주요 케이스 |
|-------------|------|-------------|
| `tests/test_api/test_notification.py` | 엔드포인트 | 규칙 생성(유효/무효 source_config), preview, source-types 조회, export/import |

### 5.3 프론트엔드 단위 테스트

| 테스트 파일 | 대상 |
|-------------|------|
| `tests/unit/services/notificationService.test.ts` | API 메서드 호출 검증 |

---

## 6. 의존성 관리

추가 필요 패키지: **없음**. 기존 `opensearch-py`, `httpx`, `pydantic` 등으로 충분.

---

## 7. 구현 순서

### Phase 1: 백엔드 기반 구조 (1h)

- [ ] 1-1. `app/services/evaluators/base.py` — BaseEvaluator, EvaluationResult 정의
- [ ] 1-2. `app/services/evaluators/__init__.py` — EvaluatorRegistry 구현
- [ ] 1-3. `app/schemas/notification.py` — source_type/source_config 스키마 재설계
- [ ] 1-4. `scripts/init_notification.py` — 인덱스 매핑 업데이트 (cs_alert_rules/cs_alerts)

### Phase 2: 헬스체크 평가기 (1.5h)

- [ ] 2-1. `app/services/evaluators/healthcheck.py` — 3개 조건 구현
- [ ] 2-2. `tests/test_services/test_evaluators.py` — 평가기 단위 테스트

### Phase 3: 서비스 + 리포지토리 (1.5h)

- [ ] 3-1. `app/services/notification.py` — run_detection_for_rule Evaluator 전환, DSL 메서드 제거, preview/source-types 추가
- [ ] 3-2. `app/repositories/notification.py` — 필드 반영 (source_type, source_detail)
- [ ] 3-3. `tests/test_services/test_notification.py` — 서비스 테스트

### Phase 4: API 엔드포인트 (0.5h)

- [ ] 4-1. `app/api/v1/endpoints/notification.py` — test-query/trigger 제거, preview/source-types 추가
- [ ] 4-2. `tests/test_api/test_notification.py` — API 통합 테스트

### Phase 5: 프론트엔드 타입 + 서비스 (0.5h)

- [ ] 5-1. `src/types/index.ts` — NotificationRule 타입 변경
- [ ] 5-2. `src/services/notificationService.ts` — preview, sourceTypes API 추가, testQuery/testTrigger 제거

### Phase 6: 프론트엔드 UI (2h)

- [ ] 6-1. `NotificationRuleDetail.tsx` — DSL 에디터 제거, 소스 타입 + 조건 빌더 구현
- [ ] 6-2. `NotificationRuleReadonly.tsx` — source_type/config 표시
- [ ] 6-3. `NotificationRuleListTab.tsx` — test-query 제거, preview 연동
- [ ] 6-4. `NotificationHistoryTab.tsx` — 소스 컬럼 추가
- [ ] 6-5. `src/locales/{ko,en,ja,cn}.json` — 새 i18n 키 추가

### Phase 7: 통합 검증 (0.5h)

- [ ] 7-1. init 스크립트 실행하여 인덱스 재생성
- [ ] 7-2. 전체 테스트 실행 (`pytest`, `npm test`)
- [ ] 7-3. 린트 확인

---

## 8. 롤백 계획

개발 환경이므로 인덱스 재생성으로 처리. Git에서 `feature/detections` 브랜치 기준으로 언제든 롤백 가능.

---

## 9. 다음 단계

5단계: 개발 계획 승인 → 6단계: 개발 실행

---

**문서 상태:** 초안 (검토 대기)
**승인 후:** 개발 시작 가능
