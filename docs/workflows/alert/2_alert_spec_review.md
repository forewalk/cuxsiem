# 알림센터 전면 재설계 기획서 검토 결과

**검토일:** 2026-03-24
**검토자:** AI
**원본 기획서:** `1_alert_spec.md`
**상태:** 검토 완료

---

## 검토 요약

### 전체 평가

기획서는 전체 아키텍처 전환 방향, 데이터 모델, API 스펙, UI 설계를 구체적으로 정의하고 있다. 평가기(Evaluator) 패턴 도입으로 확장성을 확보하면서도 1차 구현 범위(헬스체크)를 명확히 한정한 점이 적절하다.

### 주요 발견사항

- 잘 작성된 부분: source_config 스키마 설계, 평가기 레지스트리 패턴, API 프리뷰 엔드포인트 설계, UI 와이어프레임
- 개선 필요 부분: 중복 알림 방지(dedup) 전략 미언급, 인증서 만료 조건 누락, 메시지 템플릿 변수 목록 미정의
- 누락된 부분: cert_expiring 조건(SSL 인증서 만료 임박), 규칙 비활성화 시 동작 상세

---

## 1. 요구사항 완전성 검토

### 1.1 기능 요구사항 분석

**명확성:** 6개 필수 기능이 모두 구체적으로 정의되어 있다. 소스 타입 기반 CRUD, 헬스체크 평가기, 조건 빌더 UI, 스케줄러 연동, 알림 전달, 내역 조회 각각의 역할이 분명하다.

**완전성:** 헬스체크의 `status_down`과 `latency_high` 두 조건이 정의되었으나, 기존 HeartbeatTab에서 이미 표시하고 있는 **SSL 인증서 만료 임박** 감지가 누락되었다. `heartbeat` 인덱스에 `tls.certificate_not_valid_after` 필드가 존재하므로 `cert_expiring` 조건을 추가하는 것이 자연스럽다.

**추가 필요 기능:**
- `cert_expiring` 조건: 인증서 만료 N일 전 알림 (`days_before` 필드 필요)

### 1.2 비기능 요구사항 분석

**성능 요구사항:** 30초/5초 기준이 적절하다. Heartbeat 인덱스 크기가 작으므로 실제로는 1초 이내에 완료될 것이다.

**보안 요구사항:** 기존 JWT + 역할 기반 수신 체계를 유지하므로 충분하다.

**확장성 고려:** Evaluator + ConditionBuilder 패턴이 잘 설계되어 있다. 향후 소스 타입 추가가 용이하다.

---

## 2. 기술적 실현 가능성 평가

### 2.1 현재 시스템과의 호환성

**기존 아키텍처:** FastAPI + OpenSearch 환경에서 완전히 구현 가능하다. 기존 Repository → Service → Endpoint 구조에 Evaluator 레이어를 추가하는 것은 기존 패턴과 일관된다.

**데이터베이스:** `cs_alert_rules` 인덱스의 매핑 변경이 필요하다. 개발 환경이므로 인덱스 재생성으로 처리 가능하다. 기존 `init_notification.py` 스크립트를 수정하면 된다.

**API 구조:** RESTful 원칙을 준수하며, 기존 `/api/v1/notifications/` 접두사를 유지한다.

### 2.2 필요한 외부 의존성

- 필수: 없음 (기존 `opensearch-py`, `httpx` 등으로 충분)
- 선택: 없음

### 2.3 예상되는 기술적 도전과제

1. **기존 스케줄러와의 통합**: `DetectionScheduler`가 현재 `NotificationService`와 `DetectionPolicyService`를 모두 호출한다. 새 평가기 로직으로 전환 시 기존 `run_active_detections()` 메서드를 전면 수정해야 한다.
2. **중복 알림 방지**: 기존 dedup 전략(분 단위 키)을 새 소스 타입에도 적용할지, 소스별 dedup 전략을 다르게 가져갈지 결정이 필요하다. 헬스체크의 경우 "같은 모니터가 계속 DOWN이면 매번 알림을 보낼 것인가?"가 핵심이다.

---

## 3. 보안 및 성능 고려사항

### 3.1 보안 취약점 분석

**인증/인가:** 기존 `get_current_active_user` 의존성을 유지하므로 문제없다.

**입력 검증:** `source_config`가 `Dict[str, Any]`로 정의되어 있다. 소스 타입별로 Pydantic 모델을 정의하여 검증하는 것을 권장한다 (예: `HealthCheckSourceConfig(BaseModel)`).

**권장 보안 조치:**
1. `source_config` 필드에 소스 타입별 Pydantic 검증 모델 적용
2. `monitor_filter`의 와일드카드 패턴 길이 제한 (DoS 방지)

### 3.2 성능 최적화 제안

**데이터베이스:** `heartbeat` 인덱스 조회 시 `collapse` + `_source` 필터링으로 이미 최적화되어 있다 (기존 monitoring.py 패턴 재사용).

**예상 병목 지점:** 없음. 헬스체크 모니터 수는 일반적으로 수십~수백 개로 부담이 없다.

---

## 4. 사용자 시나리오 검증

### 4.1 시나리오 완전성

**누락된 시나리오:**
1. SSL 인증서 만료 임박 알림 규칙 생성 시나리오
2. 규칙 비활성화/재활성화 시나리오

**추가 필요 예외 상황:**
1. `heartbeat` 인덱스가 비어있거나 존재하지 않을 때의 동작
2. 모니터 필터에 매칭되는 모니터가 0개일 때의 동작

### 4.2 엣지 케이스

1. Heartbeat 에이전트가 중단되어 `heartbeat` 인덱스에 새 데이터가 없는 경우 → 마지막 데이터 기준으로 평가할지, 무시할지
2. 동일 모니터가 DOWN → UP → DOWN을 반복할 때 알림 빈도 제어

---

## 5. 데이터 모델 검토

### 5.1 Pydantic 스키마 제안

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class HealthCheckSourceConfig(BaseModel):
    condition: str = Field(description="status_down | latency_high | cert_expiring")
    monitor_filter: str = Field(default="*", description="모니터 이름 와일드카드")
    latency_threshold_ms: Optional[int] = Field(default=None, ge=1)
    days_before: Optional[int] = Field(default=None, ge=1, description="cert_expiring 조건 시 잔여일")

class NotificationRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: str = Field(description="healthcheck | bom | license")
    source_config: Dict[str, Any]
    severity: str = "info"
    interval_min: int = Field(ge=1, le=1440)
    message_template: str = Field(default="알림이 발생했습니다.")
    receiver: Dict[str, Any] = Field(default_factory=lambda: {"type": "role", "values": ["role-1"]})
    is_active: bool = True
```

### 5.2 인덱스 매핑 변경

`cs_alert_rules`에 추가할 필드:
- `source_type`: keyword
- `source_config`: object (dynamic)
- `last_run_at`: date

`cs_alert_rules`에서 제거할 필드:
- `target_index`
- `condition_config`
- `trigger_condition`

---

## 6. 명확화가 필요한 사항

### 6.1 질문 사항

1. **cert_expiring 조건 포함 여부:**
   - 현재 기획서: `status_down`과 `latency_high`만 정의
   - 제안: `cert_expiring` 조건 추가 (인증서 만료 N일 전 알림). HeartbeatTab의 SSL 인증서 탭과 일관성 확보.

2. **중복 알림 방지 전략:**
   - 현재 기획서: dedup 전략 미언급
   - 제안: 기존 분 단위 dedup(`{rule_id}_{minute}`) 유지. 동일 규칙은 1분에 1번만 알림 발생.

---

## 7. 프로젝트 규칙 준수 검토

### 7.1 CLAUDE.md 규칙 적합성

**레이어 아키텍처:** Evaluator → Service → Endpoint 구조가 기존 패턴과 일관된다. Repository는 기존 것을 수정하여 재사용한다.

**데이터베이스 네이밍 컨벤션:** `cs_alert_rules`, `cs_alerts` 인덱스명이 `cs_` 접두사 규칙을 준수한다. 필드명도 snake_case를 유지한다.

**API 규칙:** `/api/v1/notifications/` 접두사를 유지하며 RESTful 네이밍을 준수한다.

---

## 8. 개선 제안 사항

### 8.1 우선순위 높음 (반드시 반영 필요)

1. `cert_expiring` 조건 추가 — 헬스체크 소스에 SSL 인증서 만료 임박 감지 조건 포함
2. `source_config`에 대한 소스 타입별 Pydantic 검증 모델 정의

### 8.2 우선순위 중간 (권장)

1. 메시지 템플릿에서 사용 가능한 변수 목록을 소스 타입별로 문서화
2. 기존 dedup 전략(분 단위)을 명시적으로 기획서에 포함

### 8.3 우선순위 낮음 (선택)

1. 규칙 실행 이력(성공/실패/스킵) 로깅
2. 알림 내역에서 소스별 필터링 UI

---

## 9. 검토 체크리스트

### 완전성
- [x] 모든 필수 요구사항 명시됨
- [x] 비기능 요구사항 포함됨
- [x] 예외 상황 고려됨 (부분적 — 인덱스 미존재 시 동작 추가 필요)
- [x] 성공 기준 명확함

### 명확성
- [x] 요구사항이 모호하지 않음
- [x] 용어 정의가 명확함
- [x] 사용자 시나리오가 구체적임

### 실현 가능성
- [x] 기술적으로 구현 가능함
- [x] 현재 아키텍처와 호환됨
- [x] 필요 리소스가 합리적임

### 보안 및 성능
- [x] 보안 고려사항 포함됨
- [x] 성능 요구사항 정의됨
- [x] 확장성 고려됨

---

## 10. 검토 질문에 대한 답변

### cert_expiring 조건 포함 여부

**선택한 옵션:** 포함

**선택 이유:** `heartbeat` 인덱스에 `tls.certificate_not_valid_after` 필드가 이미 존재하며, HeartbeatTab에서도 SSL 인증서 만료 정보를 표시하고 있다. 평가기 구현 시 추가 비용이 매우 낮다.

### 중복 알림 방지 전략

**선택한 옵션:** 기존 분 단위 dedup 유지

**선택 이유:** 기존 `{rule_id}_{YYYY-MM-DDTHH:MM:00}` dedup 키 전략이 간단하고 효과적이다. 향후 소스별 커스텀 dedup이 필요해지면 Evaluator에 dedup 로직을 위임할 수 있다.

---

## 11. 답변 기반 업데이트 사항

### source_config 확정

`healthcheck` 타입의 `condition` 필드에 `cert_expiring` 추가:
- `status_down`: 모니터 DOWN 감지
- `latency_high`: 레이턴시 초과 감지
- `cert_expiring`: SSL 인증서 만료 N일 전 감지 (`days_before` 필드 사용)

### 메시지 템플릿 변수 목록

| 변수 | 설명 | 예시 |
|------|------|------|
| `{{monitor_name}}` | 감지된 모니터 이름 | `web-01` |
| `{{monitor_count}}` | 감지된 모니터 수 | `3` |
| `{{status}}` | 모니터 상태 | `down` |
| `{{url}}` | 모니터 URL | `https://web-01.example.com` |
| `{{latency_ms}}` | 응답 시간 (ms) | `5234` |
| `{{cert_subject}}` | 인증서 CN | `*.example.com` |
| `{{cert_days_left}}` | 인증서 잔여일 | `15` |
| `{{cert_expires}}` | 인증서 만료일 | `2026-04-08` |

---

## 12. 다음 단계

### 12.1 권장 액션

1. 위 검토 결과를 반영하여 기획서 최종본 확정 (`/finalize-spec alert`)
2. 개발 계획 생성 (`/create-dev-plan alert`)
3. 개발 실행 (`/develop alert`)

**검토 완료 일시:** 2026-03-24
**다음 단계:** 기획서 확정 후 개발 계획 수립
