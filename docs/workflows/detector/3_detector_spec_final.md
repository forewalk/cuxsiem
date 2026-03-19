# Detector 기능 기획서 (최종)

**작성일:** 2026-03-18
**최종 승인일:** 2026-03-18
**작성자:** 박지은
**검토자:** Claude AI
**버전:** 2.0
**상태:** ✅ 확정

---

## 📌 변경 이력 요약

### 초안 대비 주요 변경사항
1. Sigma → OpenSearch DSL 변환 파이프라인 설계 추가 (pySigma 기반, dsl_lucene 출력)
2. 변환 실패 룰 처리 정책 확정: 경고 표시 + 연결 허용, 실행 시 자동 스킵
3. Phase 1을 1a(기술 검증)와 1b(운영성 강화)로 분리
4. Detector별 `max_search_window_min` 필드 추가 (기본 1440분, 범위 5~10080)
5. 벌크 재변환 API를 비동기 백그라운드 작업으로 설계
6. SentinelOne은 Phase 1에서 Custom 룰 PoC, Phase 4에서 전용 파이프라인 전환
7. 재변환/통계 API 엔드포인트 3개 신규 정의
8. `cs_detection_rules` 스키마에 5개 필드, `cs_detectors` 스키마에 2개 필드 추가 확정

### Claude 검토 반영 사항
- 반영한 제안:
  - pySigma 호환성 사전 검증을 Phase 1a 필수 선행 태스크로 포함
  - `query_converted_at` 필드 추가 (재변환 시점 추적)
  - 스케줄러 동시 실행 제한 (세마포어 기반)
  - OpenSearch 쿼리 timeout 설정
  - 변환 통계 API (`GET /sigma-rules/conversion-stats`) 추가
  - 장기 비활성 Detector 재활성화 시 최대 검색 윈도우 제한
  - 변환 실패 룰 포함 Detector의 부분 실행 및 실행 리포트 통계
  - trigger_condition 입력 검증 강화 (길이 제한, 허용 변수 화이트리스트)
  - 재변환 API를 관리자 전용으로 제한
- 반영하지 않은 제안 및 이유:
  - 멀티테넌트 파이프라인 프로파일 분리: 현재 단일 테넌트 운영이므로 Phase 4 이후 검토
  - pySigma 변환 캐시: 초기 구현 복잡도 대비 실익이 낮으므로 Phase 4에서 선택적 구현
  - 변환 결과 diff 뷰: 우선순위 낮음, Phase 4 이후 선택적 구현

---

## 1. 개요

### 1.1 목적
Detector 생성 시 로그 타입을 선택하고, 해당 로그 타입에 속하는 탐지 규칙을 필터/선택하여 연결하는 워크플로우를 제공한다. 동시에, 현재 저장만 되어 있는 Sigma 디텍션 룰이 실제로 OpenSearch 로그에 대해 탐지를 수행할 수 있도록 전체 변환/실행 파이프라인을 구축한다.

### 1.2 배경
현재 시스템에서 Sigma 룰은 YAML에서 파싱되어 `detection_config`에 Sigma 고유 문법으로 저장되지만, 탐지 엔진은 이를 OpenSearch DSL로 간주하여 실행하므로 쿼리 실패 또는 빈 결과를 반환한다. Custom 룰만 실제 동작하는 상황이므로, Sigma 룰의 실행을 가능하게 하는 변환 파이프라인이 필수적이다.

### 1.3 범위

**포함:**
- Detector 생성 폼 UI 재설계 (로그 타입 선택, 규칙 필터링/선택)
- Sigma → OpenSearch DSL 변환 파이프라인 (pySigma 기반)
- 변환 시점: Import 시 Pre-conversion
- 탐지 엔진 개선 (opensearch_query 우선 실행, 시간 범위 필터, 변환 실패 스킵)
- 재변환 API (단건/벌크)
- 변환 상태 통계 API
- Detector별 타임스탬프 필드 및 최대 검색 윈도우 설정

**제외:**
- 멀티테넌트 파이프라인 프로파일 분리
- WebSocket 실시간 알림 (Phase 4)
- 탐지 대시보드 및 MITRE 히트맵 (Phase 4)
- SentinelOne 전용 pySigma 파이프라인 (Phase 4)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)
1. **Sigma → OpenSearch DSL 변환**: Import 시 pySigma를 사용하여 Sigma 룰을 OpenSearch DSL JSON(`dsl_lucene`)으로 변환하여 `opensearch_query` 필드에 저장
2. **변환 상태 관리**: 각 룰의 변환 상태(`pending`, `success`, `failed`, `skipped`)와 실패 사유를 저장
3. **탐지 엔진 개선**: `opensearch_query` 우선 사용, fallback으로 `detection_config`, Sigma 문법 감지 시 스킵
4. **시간 범위 필터**: `last_run_at` ~ `now` 구간으로 검색 범위 제한, `max_search_window_min`으로 상한 캡핑
5. **변환 실패 룰 처리**: 경고 표시 후 연결 허용, Detector 실행 시 자동 스킵, 실행 결과에 스킵 사유 포함
6. **단건 재변환 API**: 관리자가 특정 룰에 대해 재변환을 트리거
7. **벌크 재변환 API**: 비동기 백그라운드 작업으로 전체/필터링된 룰 재변환, job 상태 추적
8. **변환 통계 API**: 전체/성공/실패/미변환 건수 반환
9. **Detector 생성 폼**: 로그 타입 멀티셀렉트, 규칙 서버사이드 필터링/검색/페이지네이션, 활성화 토글

#### 선택 기능 (Should Have)
1. **DSL 미리보기**: DetectionRuleDetail에 `opensearch_query` 표시
2. **변환 상태 표시**: 룰 목록에서 변환 실패 규칙에 경고 아이콘 표시
3. **target_indices 자동 추천**: logsource 매핑 기반
4. **Custom 룰 DSL 검증**: Monaco Editor에서 작성한 DSL의 서버사이드 유효성 검사
5. **SentinelOne Custom 룰 PoC**: Phase 1 병행, 3~5개 Custom 탐지 룰 작성

#### 향후 고려사항 (Nice to Have)
1. 로그소스 매핑 관리 UI (관리자가 logsource → index 매핑 편집)
2. 필드 매핑 관리 UI (전역 필드 매핑 편집)
3. 파이프라인 프로파일 (ECS, Sysmon, SentinelOne 프리셋)
4. 탐지 대시보드 (통계, 시간대별 추이, MITRE 히트맵)
5. WebSocket 실시간 알림
6. 변환 결과 diff 뷰 (재변환 시 이전/신규 DSL 비교)

### 2.2 비기능 요구사항

#### 성능
- 스케줄러 동시 실행 제한: 세마포어 기반 (예: `asyncio.Semaphore(50)`)
- OpenSearch 쿼리 timeout 설정 (예: 30초)
- Import 시 변환은 배치 처리이므로 API 응답에 영향 없음
- 벌크 재변환은 비동기 백그라운드 작업으로 수행

#### 보안
- 재변환 API (`/reconvert`)는 관리자 전용 (`get_current_admin_user`)
- trigger_condition 길이 제한 (500자), 허용 변수명 화이트리스트
- `query_conversion_error`에 내부 경로 등 민감 정보 노출 방지
- `sample_events`의 민감 필드 마스킹 고려

#### 가용성
- 변환 실패 룰 포함 Detector는 부분 실행 가능 (오류로 중단하지 않음)
- 실행 리포트에 성공/실패/스킵 통계 기록
- OpenSearch 클러스터 장애 시 스케줄러 재시도 로직

#### 확장성
- 파이프라인 프로파일을 환경별로 관리하는 구조 (Phase 4)
- 변환 상태 enum 기반 관리로 향후 상태 추가 용이

---

## 3. 사용자 시나리오 (확정)

### 3.1 주요 사용자
- **보안 분석가**: Detector를 생성하고 탐지 규칙을 연결하여 위협을 모니터링
- **보안 관리자**: 룰 재변환, 파이프라인 설정, 변환 상태 관리

### 3.2 사용 시나리오

#### 시나리오 1: Sigma 룰 Import 및 변환
**사전 조건:**
- pySigma 및 관련 패키지 설치 완료
- 기본 파이프라인 프로파일 설정 완료

**실행 단계:**
1. 관리자가 `import_sigma.py` 스크립트 실행
2. YAML 파일 파싱 → `parse_sigma_yaml()` 호출
3. pySigma를 통해 Sigma → OpenSearch DSL 변환
4. `cs_detection_rules`에 `detection_config`(원본) + `opensearch_query`(변환 결과) + `query_conversion_status` 저장

**기대 결과:**
- 변환 성공 룰: `query_conversion_status = "success"`, `opensearch_query`에 유효한 DSL JSON 저장
- 변환 실패 룰: `query_conversion_status = "failed"`, `query_conversion_error`에 에러 메시지 저장

**예외 상황 및 처리:**
- pySigma 미설치: graceful degradation, `query_conversion_status = "pending"`으로 저장
- 변환 실패: 에러 로깅 후 계속 진행, 최종 통계에 실패 건수 표시

#### 시나리오 2: Detector 생성 및 규칙 연결
**사전 조건:**
- Sigma 룰 Import 완료, 일부 변환 성공/실패 상태

**실행 단계:**
1. 사용자가 Detector 이름/설명 입력
2. 로그 타입 선택 (복수 선택 가능)
3. 필터링된 규칙 목록에서 활성화 토글로 규칙 선택
4. 변환 실패 룰 선택 시 경고 메시지 표시 ("이 규칙은 변환 실패 상태입니다. 탐지 시 자동으로 스킵됩니다.")
5. 스케줄 설정 후 저장

**기대 결과:**
- Detector에 `linked_rule_ids`로 선택된 규칙 ID 저장
- 변환 실패 룰도 연결 가능

**예외 상황 및 처리:**
- 모든 연결된 룰이 변환 실패 상태인 경우: 경고 표시 ("연결된 모든 규칙이 변환 실패 상태입니다. 탐지가 실행되지 않습니다.")

#### 시나리오 3: Detector 탐지 실행
**사전 조건:**
- 활성 Detector, 연결된 규칙 중 변환 성공 룰 존재

**실행 단계:**
1. 스케줄러가 `schedule_interval_min` 경과한 Detector 선택
2. `linked_rule_ids`로 활성 규칙 조회
3. 각 규칙의 `opensearch_query` 가져오기 (없으면 `detection_config` fallback, Sigma 문법이면 스킵)
4. 시간 범위 필터 적용: `last_run_at` ~ `now`, `max_search_window_min`으로 상한 캡핑
5. `target_indices`에 대해 OpenSearch 검색 실행
6. `trigger_condition` 평가 → 매칭 시 Finding 생성

**기대 결과:**
- 변환 성공 룰만 실행, 실패 룰은 스킵
- 실행 결과에 "실행: N건, 스킵: M건 (변환 실패)" 통계 포함
- 매칭된 로그에 대해 Finding 생성

**예외 상황 및 처리:**
- `last_run_at`이 매우 오래전: `max_search_window_min` (기본 24시간)으로 캡핑
- OpenSearch 쿼리 timeout: 해당 룰 스킵, 에러 로깅

#### 시나리오 4: 파이프라인 변경 후 벌크 재변환
**사전 조건:**
- 관리자가 필드 매핑 변경 또는 pySigma 업데이트

**실행 단계:**
1. 관리자가 `POST /api/v1/sigma-rules/reconvert` 호출
2. 서버가 비동기 백그라운드 job 생성, `{ job_id, status: "started", requested_count }` 반환
3. 백그라운드에서 전체 Sigma 룰 재변환 진행
4. 관리자가 job 상태 조회로 진행률 확인

**기대 결과:**
- `job_id`로 진행률, 성공/실패 건수, 에러 샘플 확인 가능
- 완료 후 모든 룰의 `opensearch_query`, `query_conversion_status`, `query_converted_at` 갱신

**예외 상황 및 처리:**
- 부분 실패: 실패한 룰 목록과 에러 사유 기록, 성공한 룰은 정상 갱신

---

## 4. 데이터 요구사항 (확정)

### 4.1 데이터 모델

#### cs_detection_rules 스키마 확장

| 데이터 항목 | 타입 | 필수 여부 | 기본값 | 설명 |
|------------|------|----------|--------|------|
| opensearch_query | object (enabled: false) | 아니오 | null | 변환된 OpenSearch DSL JSON |
| query_conversion_status | keyword | 아니오 | null | `pending`, `success`, `failed`, `skipped` |
| query_conversion_error | text | 아니오 | null | 변환 실패 시 에러 메시지 |
| query_pipeline_id | keyword | 아니오 | null | 사용된 파이프라인 ID |
| query_converted_at | date | 아니오 | null | 변환 시각 |

#### cs_detectors 스키마 확장

| 데이터 항목 | 타입 | 필수 여부 | 기본값 | 설명 |
|------------|------|----------|--------|------|
| timestamp_field | keyword | 아니오 | @timestamp | Detector별 타임스탬프 필드 |
| max_search_window_min | integer | 아니오 | 1440 | 최대 검색 윈도우 (분), 범위: 5~10080 |

#### Pydantic 스키마 확장

```python
# schemas/sigma_rule.py 확장
class SigmaRuleResponse(BaseModel):
    # ... 기존 필드 ...
    opensearch_query: Optional[Dict[str, Any]] = None
    query_conversion_status: Optional[str] = None  # pending | success | failed | skipped
    query_conversion_error: Optional[str] = None
    query_pipeline_id: Optional[str] = None
    query_converted_at: Optional[datetime] = None

# schemas/detection_policy.py 확장
class DetectorCreate(BaseModel):
    # ... 기존 필드 ...
    timestamp_field: str = "@timestamp"
    max_search_window_min: int = Field(default=1440, ge=5, le=10080)
```

### 4.2 데이터 작업
- CREATE: Import 시 변환 결과 저장, Detector 생성 시 timestamp_field/max_search_window_min 저장
- READ: 변환 상태 조회, 통계 API, 탐지 실행 시 opensearch_query 조회
- UPDATE: 재변환 시 opensearch_query/status/error/converted_at 갱신
- DELETE: 기존 soft delete 패턴 유지

---

## 5. API 명세 (확정)

### 5.1 엔드포인트 목록

#### API 1: 단건 재변환
- **Method:** POST
- **Path:** `/api/v1/sigma-rules/{id}/reconvert`
- **인증:** Required (관리자 전용)
- **설명:** 특정 Sigma 룰을 최신 파이프라인으로 재변환

**성공 응답 (200):**
```json
{
  "id": "rule_id",
  "query_conversion_status": "success",
  "opensearch_query": { "query": { "bool": { "must": [...] } } },
  "query_converted_at": "2026-03-18T19:00:00Z"
}
```

**에러 응답:**
- 401: Unauthorized
- 403: Forbidden (관리자 아님)
- 404: Not Found (룰 없음)
- 500: Internal Server Error (변환 실패)

---

#### API 2: 벌크 재변환
- **Method:** POST
- **Path:** `/api/v1/sigma-rules/reconvert`
- **인증:** Required (관리자 전용)
- **설명:** 전체 또는 필터링된 Sigma 룰에 대해 비동기 백그라운드 재변환 작업 생성

**요청:**
```json
{
  "filter": {
    "status": "failed",
    "pipeline_id": "ecs_windows"
  }
}
```

**성공 응답 (202):**
```json
{
  "job_id": "reconvert_job_20260318",
  "status": "started",
  "requested_count": 3700
}
```

**에러 응답:**
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict (이미 실행 중인 재변환 작업 존재)

---

#### API 3: 변환 통계
- **Method:** GET
- **Path:** `/api/v1/sigma-rules/conversion-stats`
- **인증:** Required
- **설명:** Sigma 룰 변환 상태 통계 반환

**성공 응답 (200):**
```json
{
  "total": 3700,
  "success": 3200,
  "failed": 300,
  "pending": 150,
  "skipped": 50
}
```

---

## 6. 로그 타입 분류 체계

### 6.1 그룹 및 항목

| 그룹 | 로그 타입 |
|------|-----------|
| Access Management | AD/LDAP, Apache Access, Okta |
| Applications | Github, Google Workspace, Microsoft 365 |
| Cloud Services | AWS Cloudtrail, AWS S3, Microsoft Azure |
| Network Activity | DNS, Network, VPC Flow |
| Security | WAF |
| System Activity | Linux System Logs, Microsoft Windows |

- 복수 선택 가능
- 선택된 로그 타입은 Chip으로 표시

### 6.2 규칙 ↔ 로그 타입 매핑

규칙의 `log_source_category`, `log_source_product`, `log_source_service` 필드 기반:

| 로그 타입 | 매핑 기준 (product / category / service) |
|-----------|------------------------------------------|
| AD/LDAP | product: windows, category: authentication |
| Apache Access | product: apache |
| Okta | product: okta |
| Github | product: github |
| Google Workspace | product: google_workspace |
| Microsoft 365 | product: m365 |
| AWS Cloudtrail | product: cloudtrail |
| AWS S3 | product: s3 |
| Microsoft Azure | product: azure |
| DNS | category: dns |
| Network | category: network, proxy |
| VPC Flow | product: vpcflow |
| WAF | product: waf |
| Linux System Logs | product: linux |
| Microsoft Windows | product: windows |

---

## 7. UI 구조 (확정)

### 7.1 Detector 생성 폼 레이아웃

```
┌─────────────────────────────────────────────────┐
│ [헤더] Detector 생성            [취소] [저장]    │
├─────────────────────────────────────────────────┤
│                                                  │
│ ── 기본 정보 ──                                  │
│ [Detector 이름]       [설명 (multiline)]         │
│                                                  │
│ ── 로그 타입 선택 ──                             │
│ [Log Type ▼ (복수선택, 그룹 헤더 포함)]          │
│ 선택됨: [DNS ×] [Network ×] [Linux System ×]    │
│                                                  │
│ ── 탐지 규칙 선택 ──                             │
│ [Log Type ▼] [🔍 검색] [심각도 ▼] [Source ▼]    │
│ ┌───┬──────────────┬────────┬────────┬──────────┐│
│ │ ⚡│ 규칙명        │ 심각도 │ 로그타입│ Source   ││
│ ├───┼──────────────┼────────┼────────┼──────────┤│
│ │ 🔘│ DNS Query... │ Medium │ DNS    │ Sigma    ││
│ │ 🔘│ Network...   │ High   │Network │ Custom   ││
│ │ 🔘│ ⚠ Failed... │ Low    │Windows │ Sigma    ││
│ └───┴──────────────┴────────┴────────┴──────────┘│
│ 표시: 20 / 1037건       [< 이전] [1/52] [다음 >] │
│                                                  │
│ ── 스케줄 ──                                     │
│ [실행 주기(분)]  [타임스탬프 필드]                │
│ [최대 검색 윈도우(분)]                            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 7.2 규칙 테이블 컬럼

| 컬럼 | 설명 | 너비 |
|------|------|------|
| 활성화 토글 | MUI Switch, 해당 규칙을 Detector에 연결할지 on/off | 고정 50px |
| 규칙명 | 규칙 이름 (ellipsis), 클릭 시 룰 미리보기 패널 열림, 호버 시 밑줄 | flex |
| 심각도 | SeverityChip 표시 | 80px |
| 로그 타입 | log_source_category or product | 100px |
| Source | Standard(Sigma) / Custom | 80px |

### 7.3 필터 동작
- **로그 타입 선택** → 서버사이드 필터링으로 해당 로그 타입의 규칙만 표시
- **검색** → 서버사이드 텍스트 검색 (debounce 300ms)
- **심각도 드롭다운** → critical/high/medium/low/info 서버사이드 필터
- **Source 드롭다운** → Standard(type=sigma) / Custom(type=custom) 서버사이드 필터
- **페이지네이션** → 서버사이드 skip/limit 기반, 표시 건수 / 전체 건수 표시

### 7.4 변환 실패 룰 표시
- 변환 실패 룰은 규칙명 옆에 ⚠ 경고 아이콘 표시
- 툴팁: "이 규칙은 OpenSearch DSL 변환에 실패하여 탐지 시 자동 스킵됩니다."
- 활성화 토글은 동작하되 경고 메시지 표시

---

## 8. Sigma → OpenSearch DSL 변환 파이프라인 (확정)

### 8.1 핵심 과제

Sigma 룰의 `detection` 블록은 Sigma 고유 문법이므로 OpenSearch에서 직접 실행 불가. pySigma를 사용하여 Import 시점에 Pre-conversion 수행.

### 8.2 변환 방식

**필요 패키지:**
```
pySigma                       # Sigma 코어 변환 엔진
pySigma-backend-opensearch    # OpenSearch DSL 출력 백엔드
pySigma-pipeline-ecs-windows  # ECS Windows 필드 매핑 파이프라인 (선택)
pySigma-pipeline-sysmon       # Sysmon 필드 매핑 파이프라인 (선택)
```

**출력 포맷:** `dsl_lucene` (OpenSearch DSL JSON)

**변환 예시:**
```python
from sigma.rule import SigmaRule
from sigma.backends.opensearch import OpensearchLuceneBackend
from sigma.pipelines.ecs_windows import ecs_windows_pipeline

rule = SigmaRule.from_yaml(raw_yaml)
pipeline = ecs_windows_pipeline()
backend = OpensearchLuceneBackend(pipeline)
query_dsl = backend.convert_rule(rule, output_format="dsl_lucene")
# → {"query": {"bool": {"must": [{"wildcard": {"process.command_line": "*powershell -enc*"}}]}}}
```

**Sigma 수식어 → OpenSearch DSL 변환 매핑:**

| Sigma 수식어 | OpenSearch DSL |
|-------------|---------------|
| `field: value` | `{"term": {"field": "value"}}` |
| `field\|contains: value` | `{"wildcard": {"field": "*value*"}}` |
| `field\|startswith: value` | `{"wildcard": {"field": "value*"}}` |
| `field\|endswith: value` | `{"wildcard": {"field": "*value"}}` |
| `field\|re: pattern` | `{"regexp": {"field": "pattern"}}` |
| `field\|all: [a, b]` | `{"bool": {"must": [wildcard_a, wildcard_b]}}` |
| `field\|cidr: 10.0.0.0/8` | IP range 쿼리 변환 |
| `condition: sel1 or sel2` | `{"bool": {"should": [sel1, sel2]}}` |
| `condition: sel and not filter` | `{"bool": {"must": [sel], "must_not": [filter]}}` |
| `condition: sel \| count() > 5` | aggregation 쿼리 변환 |

### 8.3 변환 시점: Import 시 Pre-conversion

```
YAML 파일 → parse_sigma_yaml() → pySigma 변환 → OpenSearch DSL 저장
                                                    ↓
                             cs_detection_rules.opensearch_query (새 필드)
```

| 장점 | 단점 |
|------|------|
| 탐지 실행 시 변환 오버헤드 없음 | 파이프라인 변경 시 전체 재변환 필요 |
| 변환 실패를 Import 시점에 즉시 확인 | 저장 용량 약간 증가 |
| 기존 탐지 엔진 로직 최소 변경 | |

**import_sigma.py 변경:**
```python
def convert_sigma_to_opensearch(parsed_yaml, pipeline):
    try:
        rule = SigmaRule.from_yaml(yaml.dump(parsed_yaml))
        backend = OpensearchLuceneBackend(pipeline)
        dsl = backend.convert_rule(rule, output_format="dsl_lucene")
        return {
            "opensearch_query": dsl[0] if dsl else None,
            "query_conversion_status": "success",
            "query_conversion_error": None,
            "query_converted_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "opensearch_query": None,
            "query_conversion_status": "failed",
            "query_conversion_error": str(e),
            "query_converted_at": datetime.utcnow().isoformat(),
        }
```

### 8.4 로그 소스 → 인덱스 매핑

| logsource.product | logsource.category | OpenSearch 인덱스 패턴 |
|-------------------|-------------------|----------------------|
| windows | process_creation | `logs-windows-sysmon-*` |
| windows | network_connection | `logs-windows-sysmon-*` |
| windows | dns_query | `logs-windows-sysmon-*` |
| windows | — (security) | `logs-windows-security-*` |
| windows | — (powershell) | `logs-windows-powershell-*` |
| linux | process_creation | `logs-linux-auditd-*` |
| — | — (cloudtrail) | `logs-aws-cloudtrail-*` |
| — | — (sentinel_one) | `logs-sentinel_one.*` |
| azure | — (signin) | `logs-azure-signin-*` |
| — | dns | `logs-dns-*` |
| — | firewall | `logs-firewall-*` |

### 8.5 필드 매핑 파이프라인

```python
crux_field_mapping = ProcessingPipeline(
    name="CruxSIEM Field Mapping",
    transformations=[
        FieldMappingTransformation({
            "CommandLine": "process.command_line",
            "ParentCommandLine": "process.parent.command_line",
            "Image": "process.executable",
            "ParentImage": "process.parent.executable",
            "TargetFilename": "file.path",
            "SourceIp": "source.ip",
            "DestinationIp": "destination.ip",
            "DestinationPort": "destination.port",
            "User": "user.name",
            "EventType": "event.action",
            "LogonType": "winlog.event_data.LogonType",
            "ServiceName": "service.name",
            "RegistryKey": "registry.key",
            "RegistryValue": "registry.value",
        })
    ]
)
```

---

## 9. 탐지 엔진 수정안 (확정)

```python
async def _run_rule_against_indices(self, detector, rule, target_indices, field_mappings):
    # 1. 실행할 쿼리 결정 (opensearch_query 우선, fallback detection_config)
    query = rule.get("opensearch_query")
    if not query:
        query = rule.get("detection_config", {})
        if not query:
            return {"status": "skipped", "reason": "no_query"}
        if "condition" in query or "selection" in query:
            logger.warning(f"룰 {rule['id']}: Sigma 문법 미변환 상태, 스킵")
            return {"status": "skipped", "reason": "unconverted_sigma"}

    # 2. 런타임 필드 매핑 오버라이드
    if field_mappings:
        query = self._apply_field_mappings(query, field_mappings)

    # 3. 시간 범위 필터 (중복 탐지 방지 + 최대 윈도우 캡핑)
    last_run_at = detector.get("last_run_at")
    max_window = detector.get("max_search_window_min", 1440)
    ts_field = detector.get("timestamp_field", "@timestamp")

    if last_run_at:
        window_start = max(last_run_at, f"now-{max_window}m")
    else:
        window_start = f"now-{max_window}m"

    time_filter = {"range": {ts_field: {"gte": window_start, "lte": "now"}}}

    if "query" in query:
        search_body = {
            "query": {"bool": {"must": [query["query"], time_filter]}},
            "size": 10,
            "sort": [{ts_field: {"order": "desc"}}],
            "timeout": "30s"
        }
    else:
        search_body = {
            "query": {"bool": {"must": [query, time_filter]}},
            "size": 10,
            "sort": [{ts_field: {"order": "desc"}}],
            "timeout": "30s"
        }

    # 4. OpenSearch 검색 실행
    index_pattern = ",".join(target_indices) if target_indices else "logs-*"
    result = await self._execute_search(index_pattern, search_body)

    # 5. 결과 처리
    return {"status": "executed", "hits": result}
```

---

## 10. End-to-End 실행 파이프라인 (확정)

```
┌─────────────────────────────────────────────────────────────────┐
│                Phase 1: 규칙 등록 (Import / Create)               │
│                                                                  │
│  [Sigma 룰 Import]                                                │
│  YAML → parse_sigma_yaml() → pySigma 변환 → cs_detection_rules   │
│    ├── detection_config: 원본 Sigma detection (보존)               │
│    ├── opensearch_query: 변환된 OpenSearch DSL (실행용)            │
│    ├── query_conversion_status: success/failed/pending            │
│    └── query_converted_at: 변환 시각                              │
│                                                                  │
│  [Custom 룰] Monaco Editor → detection_config = opensearch_query  │
├─────────────────────────────────────────────────────────────────┤
│                Phase 2: Detector 구성                              │
│                                                                  │
│  1. Detector 이름/설명 입력                                        │
│  2. 로그 타입 선택 → target_indices 자동 추천                      │
│  3. 규칙 선택 (변환 실패 규칙: 경고 표시, 연결 허용)              │
│  4. 필드 매핑 편집 (선택사항)                                      │
│  5. 실행 주기, 트리거 조건, 메시지 템플릿 설정                     │
│  6. timestamp_field, max_search_window_min 설정                   │
├─────────────────────────────────────────────────────────────────┤
│                Phase 3: 탐지 실행 (스케줄러)                        │
│                                                                  │
│  DetectionScheduler (매 1분 폴링, Semaphore(50) 동시 제한)         │
│    → 활성 Detector 조회 → schedule_interval_min 경과 확인          │
│    → run_detection_for_detector:                                   │
│       1. linked_rule_ids → 활성 규칙 조회                          │
│       2. opensearch_query 가져오기 (fallback: detection_config)     │
│       3. 변환 실패/미변환 룰 → 자동 스킵, 사유 기록               │
│       4. field_mappings 추가 적용                                  │
│       5. 시간 범위 필터: ts_field { gte: max(last_run_at, now-max_window), lte: now } │
│       6. target_indices에 대해 OpenSearch 검색 (timeout: 30s)      │
│       7. trigger_condition 평가 → 매칭 시 Finding 생성             │
│       8. 실행 결과: 성공/실패/스킵 통계 기록                       │
├─────────────────────────────────────────────────────────────────┤
│                Phase 4: 결과 처리 및 알림                          │
│                                                                  │
│  Finding → cs_detection_events 저장                                │
│  → Detector last_triggered_at, total_findings_count 갱신           │
│  → 실행 리포트: { executed: N, skipped: M, failed: K, findings: F }│
│  → WebSocket 실시간 알림 (향후)                                    │
│  → Webhook / 알림센터 연동 (향후)                                  │
│                                                                  │
│  사용자: Finding 확인 → new → acknowledged → resolved              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 데이터 파이프라인 현황 및 계획

### 11.1 현재 데이터 소스

| 소스 | 인덱스 | 수집 경로 |
|------|--------|----------|
| SentinelOne Threats | `logs-sentinel_one.threats` | Kafka → Vector → OS |
| SentinelOne Agents | `logs-sentinel_one.agents` | Kafka → Vector → OS |
| SentinelOne EDR | `logs-sentinel_one.edr` | Kafka → Vector → OS |
| Heartbeat | `heartbeat` | Heartbeat Agent → OS |

### 11.2 SentinelOne 접근 전략 (확정)
- **Phase 1**: SentinelOne 로그 기반 Custom 룰 3~5개 작성으로 Detector 동작 PoC
- **Phase 4**: SentinelOne 전용 pySigma 파이프라인 개발 검토

### 11.3 추가 확보 필요 (우선순위)

| 우선순위 | 로그 소스 | Sigma 룰 수 (추정) | 수집 방법 예시 |
|---------|----------|------------------|-------------|
| **1** | Windows Event Log (Sysmon) | ~2,000+ | Winlogbeat / NXLog → Kafka → Vector → OS |
| **2** | Windows Security Log | ~500+ | Winlogbeat → Kafka → Vector → OS |
| **3** | Linux Auditd / Syslog | ~200+ | Filebeat / Vector → Kafka → OS |
| **4** | AWS CloudTrail | ~100+ | S3 → Lambda/Filebeat → Kafka → OS |
| **5** | Azure AD / Sign-in | ~80+ | Azure Event Hub → Filebeat → Kafka → OS |
| **6** | DNS / Firewall / Proxy | ~100+ | Syslog / Packetbeat → Vector → OS |

---

## 12. 설정 관리 구조 (향후)

```
cs_detection_settings
├── pipeline_profiles:
│   ├── default: { field_mappings: {...}, logsource_mappings: {...} }
│   ├── ecs_windows: { ... }
│   ├── sysmon: { ... }
│   └── sentinel_one: { ... }
├── active_pipeline: "default"
├── timestamp_field: "@timestamp"
├── default_target_index: "logs-*"
└── max_sample_events: 5
```

---

## 13. 구현 로드맵 (확정)

### Phase 1a: 기술 검증 (3~5일)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| pySigma 호환성 검증 | Python 3.11 + pySigma + opensearch backend 설치, 샘플 3~5개 룰 변환 테스트 | — |
| pySigma 설치 | `pip install pySigma pySigma-backend-opensearch` | `requirements.txt` |
| 기본 파이프라인 | ECS 필드 매핑 + 기본 변환 함수 | `app/core/sigma_pipeline.py` (신규) |
| import_sigma.py 수정 | Import 시 pySigma 변환 + opensearch_query 저장 | `scripts/import_sigma.py` |
| 스키마 확장 | opensearch_query, query_conversion_status, query_conversion_error, query_pipeline_id, query_converted_at 추가 | `schemas/sigma_rule.py` |

**1a 완료 기준:** "샘플 Sigma 룰이 pySigma를 통해 OpenSearch DSL로 변환되어 `opensearch_query`에 저장됨"

### Phase 1b: 운영성 강화 (3~5일)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| 인덱스 매핑 확장 | cs_detection_rules에 새 필드 매핑 추가 | `opensearch_setup/` |
| 재변환 스크립트 | 기존 룰에 opensearch_query 일괄 생성 | `scripts/reconvert_rules.py` (신규) |
| 단건 재변환 API | `POST /sigma-rules/{id}/reconvert` | `endpoints/sigma_rule.py` |
| 벌크 재변환 API | `POST /sigma-rules/reconvert` (비동기 job) | `endpoints/sigma_rule.py` |
| 변환 통계 API | `GET /sigma-rules/conversion-stats` | `endpoints/sigma_rule.py` |
| SentinelOne Custom 룰 PoC | Custom 탐지 룰 3~5개 작성 | — |

### Phase 2: 탐지 엔진 개선 (1주)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| 탐지 엔진 수정 | opensearch_query 우선, fallback detection_config | `services/detection_policy.py` |
| 시간 범위 필터 | last_run_at ~ now 구간, max_search_window_min 캡핑 | `services/detection_policy.py` |
| 변환 실패 스킵 | query_conversion_status=failed 룰 스킵 + 실행 리포트 | `services/detection_policy.py` |
| 동시 실행 제한 | Semaphore(50) 기반 스케줄러 제한 | `core/scheduler.py` |
| Detector 스키마 확장 | timestamp_field, max_search_window_min 추가 | `schemas/detection_policy.py` |
| 테스트 | Sigma 변환 + 실행 통합 테스트 | `tests/` |

### Phase 3: UI 연동 (1~2주)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| DSL 미리보기 | DetectionRuleDetail에 opensearch_query 표시 | `DetectionRuleDetail.tsx` |
| 변환 상태 표시 | 변환 실패 규칙에 경고 아이콘 | `DetectionRuleList.tsx`, `DetectorForm.tsx` |
| target_indices 자동 추천 | logsource 매핑 기반 | `DetectorForm.tsx` |
| 필드 매핑 편집기 | field_mappings UI | `DetectorForm.tsx` |
| 쿼리 테스트 연결 | 변환된 DSL로 test-query API 호출 | `DetectorForm.tsx` |
| 변환 통계 대시보드 | conversion-stats API 기반 통계 표시 | `DetectionRuleTab.tsx` |

### Phase 4: 운영 고도화 (2~3주)

| 태스크 | 설명 |
|--------|------|
| 로그소스 매핑 관리 UI | 관리자가 logsource → index 매핑 편집 |
| 필드 매핑 관리 UI | 전역 필드 매핑 편집 |
| 파이프라인 프로파일 | 환경별(ECS, Sysmon, SentinelOne) 프리셋 |
| SentinelOne 전용 파이프라인 | pySigma 커스텀 파이프라인 개발 검토 |
| WebSocket 알림 연동 | Finding 생성 시 실시간 알림 |
| 알림센터 통합 | 기존 NotificationService와 통합 |
| 탐지 대시보드 | 통계, 시간대별 추이, MITRE 히트맵 |
| 벌크 재변환 UI | 파이프라인 변경 시 전체 규칙 재변환 관리 화면 |

---

## 14. 테스트 검증 전략 (확정)

### 단위 테스트

| 테스트 대상 | 검증 내용 |
|-----------|---------|
| pySigma 변환 | 주요 Sigma 수식어가 올바른 DSL로 변환되는지 |
| 필드 매핑 | Sigma 필드명 → 실제 필드명 정확히 치환되는지 |
| 시간 필터 | last_run_at 기반 시간 범위 + max_search_window_min 캡핑이 정확히 적용되는지 |
| 트리거 조건 | AST 평가기가 변환된 DSL 결과에 대해 동작하는지 |
| 변환 실패 스킵 | query_conversion_status=failed 룰이 정상적으로 스킵되는지 |

### 통합 테스트

| 시나리오 | 방법 |
|---------|------|
| Sigma 룰 Import → 변환 → 저장 | 샘플 YAML Import 후 opensearch_query 필드 확인 |
| 변환된 DSL 실행 | 테스트 로그 삽입 → Detector 실행 → Finding 생성 확인 |
| 중복 탐지 방지 | 동일 Detector 2회 연속 실행 → 2번째 Finding 미생성 확인 |
| Custom 룰 호환성 | 기존 Custom 룰 동작에 영향 없는지 확인 |
| 변환 실패 룰 포함 Detector | 변환 성공 룰만 실행, 실패 룰 스킵, 실행 리포트에 통계 포함 확인 |
| 벌크 재변환 | 전체 재변환 후 status/query 갱신 확인, 부분 실패 처리 확인 |
| max_search_window_min 캡핑 | 장기 비활성 Detector 재실행 시 검색 범위 제한 확인 |

---

## 15. 제약사항 및 고려사항 (확정)

### 15.1 기술적 제약사항
- pySigma와 Python 3.11 호환성 사전 검증 필요
- pySigma-backend-opensearch의 OpenSearch 2.x 지원 여부 확인 필요
- 3,700+ Sigma 룰 중 일부는 변환 실패 예상 (near 연산자, 복잡한 aggregation 등)
- pySigma가 생성하는 DSL 중 aggregation 포함 시 시간 범위 필터 추가 방식이 달라질 수 있음

### 15.2 비즈니스 제약사항
- 현재 유일하게 수집 중인 SentinelOne 로그에 대해 Sigma 룰 직접 적용 불가 (필드 구조 불일치)
- Phase 1에서는 Custom 룰 기반 PoC로 가치 증명

### 15.3 외부 의존성
- **필수:** `pySigma` (>= 0.10), `pySigma-backend-opensearch`
- **선택:** `pySigma-pipeline-ecs-windows`, `pySigma-pipeline-sysmon`

### 15.4 보안 요구사항
- 재변환 API는 관리자 전용 (`get_current_admin_user`)
- trigger_condition: 길이 제한 500자, 허용 변수명 화이트리스트
- `query_conversion_error`에 내부 경로 노출 방지
- `sample_events`의 민감 필드 마스킹 고려

---

## 16. 성공 기준 (확정)

### 16.1 완료 조건
- [ ] Phase 1a: pySigma로 샘플 Sigma 룰이 OpenSearch DSL로 변환되어 opensearch_query에 저장됨
- [ ] Phase 1b: 재변환 API 동작, 변환 통계 API 동작, SentinelOne Custom 룰 PoC 성공
- [ ] Phase 2: 변환된 DSL로 탐지 실행 성공, 시간 범위 필터 동작, 변환 실패 룰 스킵 동작
- [ ] Phase 3: UI에서 변환 상태 확인, DSL 미리보기, 변환 실패 경고 표시 동작

### 16.2 측정 지표
- Sigma 룰 변환 성공률 (목표: 80% 이상)
- Detector 실행 시 평균 응답 시간 (목표: < 5초/규칙)
- 변환 실패 룰 포함 Detector의 부분 실행 성공률 (목표: 100%)

### 16.3 테스트 기준
- [ ] 단위 테스트 커버리지 80% 이상
- [ ] 통합 테스트 통과
- [ ] pySigma 호환성 사전 검증 완료

---

## 17. 개발 착수 승인

### 17.1 승인 정보
- 승인자: 박지은
- 승인일: 2026-03-18
- 승인 조건: Phase 1a부터 순차 진행, 1a 완료 기준 충족 후 1b 착수

### 17.2 다음 단계
✅ 4단계: 개발 계획서 작성 (`/create-dev-plan detector`)

---

## 18. 부록

### 18.1 참고 자료
- pySigma 공식 문서: https://sigmahq-pysigma.readthedocs.io/
- Sigma 룰 저장소: https://github.com/SigmaHQ/sigma
- OpenSearch DSL 문서: https://opensearch.org/docs/latest/query-dsl/
- pySigma-backend-opensearch: https://github.com/SigmaHQ/pySigma-backend-opensearch

### 18.2 관련 문서
- `docs/DETECTION_RESEARCH.md` — 디텍션 시스템 리서치
- `docs/workflows/detector/1_detector_spec.md` — 원본 기획서
- `docs/workflows/detector/2_detector_spec_reviewed.md` — 검토 문서

---

**문서 상태:** 확정 및 잠금
**다음 단계:** 개발 계획 수립 (`/create-dev-plan detector`)
