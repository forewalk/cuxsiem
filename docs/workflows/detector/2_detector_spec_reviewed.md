# Detector 기능 기획서 검토 결과

**검토일:** 2026-03-18
**검토자:** AI
**원본 기획서:** `1_detector_spec.md`
**상태:** 검토 완료

---

## 검토 요약

### 전체 평가
기획서는 **두 개의 큰 축**으로 구성되어 있다: (1) Detector 생성 폼 UI 재설계(섹션 1~5)와 (2) Sigma 룰 실행 파이프라인 설계(섹션 6~11). UI 부분은 이미 구현 완료된 상태이며, 핵심은 Sigma 룰의 실제 실행을 가능하게 하는 후반부이다. 문제 진단(Sigma 문법 ≠ OpenSearch DSL)이 정확하고, pySigma 기반 변환 방안이 합리적이다. 다만 몇 가지 기술적 세부사항과 운영 시나리오에 대한 보완이 필요하다.

### 주요 발견사항
- 잘 작성된 부분: 문제 분석이 정확하고 구체적, pySigma 변환 예시와 수식어 매핑표가 실용적, E2E 파이프라인 흐름도가 명확
- 개선 필요 부분: pySigma 버전/호환성 검증 부재, 대량 룰 변환 실패 시 대응 전략 미흡, SentinelOne 로그에 대한 Sigma 룰 적용 가능성 미분석
- 누락된 부분: 변환 API 엔드포인트 설계, 벌크 재변환 시 성능/다운타임 고려, Detector별 타임스탬프 필드 스키마

---

## 1. 요구사항 완전성 검토

### 1.1 기능 요구사항 분석

**명확성:**
- Sigma → OpenSearch DSL 변환 파이프라인의 전체 흐름이 코드 레벨까지 구체적으로 기술됨
- Import 시 변환(Pre-conversion) 결정과 그 근거가 명확

**완전성:**
- 변환, 매핑, 실행, 결과 처리까지 E2E 흐름이 빠짐없이 기술됨
- 단, 다음 기능 요구사항이 추가로 필요:

**추가 필요 기능:**
1. **수동 재변환 API**: 관리자가 특정 룰 또는 전체 룰에 대해 재변환을 트리거하는 API 엔드포인트
2. **변환 실패 대시보드**: query_conversion_status=failed 룰 목록을 확인하는 관리자 뷰
3. **pySigma 버전 관리**: 어떤 pySigma 버전으로 변환했는지 추적 (query_pipeline_id만으로 부족)
4. **Custom 룰 생성 시 DSL 검증**: Monaco Editor에서 작성한 DSL이 유효한 OpenSearch 쿼리인지 서버사이드 검증

### 1.2 비기능 요구사항 분석

**성능 요구사항:**
- 현재 상태: 스케줄러가 최대 1000개 Detector를 asyncio.gather로 동시 실행 — 대규모 환경에서 OpenSearch 과부하 가능
- 제안: 동시 실행 제한(세마포어), 예: `asyncio.Semaphore(50)` 적용. 규칙별 검색 쿼리의 timeout 설정 필요

**보안 요구사항:**
- 현재 상태: trigger_condition에서 AST 기반 평가를 사용하지만, 악의적 입력에 대한 추가 제한 필요
- 제안: trigger_condition 길이 제한(예: 500자), 허용 변수명 화이트리스트

**확장성 고려:**
- 현재 상태: 파이프라인 프로파일을 환경별로 관리하는 구조가 제안됨
- 제안: 멀티테넌트 환경을 고려하여 파이프라인 프로파일을 테넌트별로 분리할 수 있는 구조

---

## 2. 기술적 실현 가능성 평가

### 2.1 현재 시스템과의 호환성

**기존 아키텍처:**
- FastAPI + OpenSearch + opensearch-py 환경에서 pySigma 통합은 자연스러움
- 기존 레이어 구조(Repository → Service → Endpoint)와 완전 호환 — `SigmaRuleService`에 변환 메서드를 추가하면 됨

**데이터베이스 (OpenSearch):**
- 스키마 확장 필요: `opensearch_query`, `query_conversion_status`, `query_conversion_error`, `query_pipeline_id` 4개 필드 추가
- 마이그레이션: 기존 cs_detection_rules 인덱스에 새 필드를 추가하는 것은 OpenSearch에서 무중단으로 가능 (동적 매핑 또는 인덱스 재생성)
- `opensearch_query` 필드는 `detection_config`과 동일하게 `"type": "object", "enabled": false`로 설정 (검색 불필요, 저장만)

**API 구조:**
- 기존 `/api/v1/sigma-rules` 엔드포인트에 변환 관련 API 추가 가능:
  - `POST /api/v1/sigma-rules/reconvert` — 벌크 재변환
  - `POST /api/v1/sigma-rules/{id}/reconvert` — 단건 재변환
  - `GET /api/v1/sigma-rules/conversion-stats` — 변환 상태 통계

### 2.2 필요한 외부 의존성

- **필수:**
  - `pySigma` (>= 0.10) — Sigma 코어 변환 엔진
  - `pySigma-backend-opensearch` — OpenSearch DSL 출력
- **선택:**
  - `pySigma-pipeline-ecs-windows` — ECS Windows 필드 매핑
  - `pySigma-pipeline-sysmon` — Sysmon 필드 매핑
- **검증 필요:** pySigma와 Python 3.11 호환성, pySigma-backend-opensearch의 OpenSearch 2.x 지원 여부

### 2.3 예상되는 기술적 도전과제

1. **pySigma 변환 커버리지**: 3,700+ Sigma 룰 중 일부는 변환 실패가 예상됨 (near 연산자, 복잡한 aggregation 조건 등). 실패율을 사전에 측정하여 수용 가능한 수준인지 확인 필요
2. **SentinelOne 로그에 Sigma 룰 적용**: 현재 수집 중인 로그는 SentinelOne 포맷이므로, Sigma 룰(대부분 Windows/Linux 네이티브 로그 대상)과 필드 구조가 다름. SentinelOne 전용 파이프라인 구현이 별도로 필요
3. **시간 범위 필터와 Aggregation 쿼리의 충돌**: pySigma가 생성하는 DSL에 aggregation이 포함된 경우, 단순히 time_filter를 must 조건에 추가하는 방식이 동작하지 않을 수 있음

---

## 3. 보안 및 성능 고려사항

### 3.1 보안 취약점 분석

**인증/인가:**
- 재변환 API(`/reconvert`)는 관리자 전용(`get_current_admin_user`)으로 제한해야 함
- import_sigma.py 스크립트는 서버 내부에서만 실행되므로 인증 불필요

**데이터 보호:**
- `opensearch_query`에는 민감 정보가 포함되지 않음 (쿼리 로직만)
- 변환 에러 메시지(`query_conversion_error`)에 내부 경로 등이 노출되지 않도록 필터링

**입력 검증:**
- pySigma에 전달되는 YAML은 이미 `validate_sigma_yaml`로 검증됨
- Custom 룰의 detection_config(사용자 입력 DSL)은 `test_query` API를 통해 실행 전 검증 가능

**권장 보안 조치:**
1. pySigma 변환 과정에서 생성되는 DSL에 대해 `_source` 필드 제한 (민감 필드 제외)
2. `sample_events`에 포함되는 로그 데이터의 민감 필드 마스킹 고려

### 3.2 성능 최적화 제안

**OpenSearch:**
- 시간 범위 필터 추가로 검색 범위가 대폭 줄어들어 성능 개선 예상
- 인덱스 전략: `@timestamp` 필드에 대한 인덱스는 OpenSearch 기본 설정으로 이미 존재

**API 성능:**
- Import 시 변환은 배치 처리이므로 성능 우려 낮음
- 벌크 재변환 시 비동기 백그라운드 작업으로 처리 권장 (3,700+ 룰 × pySigma 변환 = 수 분 소요 예상)

**예상 병목 지점:**
- 스케줄러의 동시 실행 Detector 수가 많을 때 OpenSearch 쿼리 동시 요청 폭증
- 해결: 세마포어 기반 동시 실행 제한 + 쿼리 timeout 설정

---

## 4. 사용자 시나리오 검증

### 4.1 시나리오 완전성

**누락된 시나리오:**
1. **파이프라인 변경 후 재변환 시나리오**: 관리자가 필드 매핑을 변경한 후 기존 모든 룰에 대해 재변환을 실행하는 흐름
2. **Sigma 룰 업데이트 시 재변환**: 기존 Sigma 룰의 raw_yaml이 업데이트될 때 opensearch_query도 자동 재생성
3. **변환 실패 룰 포함 Detector 생성**: 사용자가 변환 실패 룰을 Detector에 연결하려 할 때의 UX (경고만? 차단?)

**추가 필요 예외 상황:**
1. pySigma 패키지 미설치 환경에서의 Import 동작 (graceful degradation)
2. OpenSearch 클러스터 장애 시 스케줄러 동작 (재시도 로직)

### 4.2 엣지 케이스

1. **동일 Sigma 룰이 다른 파이프라인에서 다른 DSL을 생성하는 경우**: 어떤 파이프라인의 결과를 저장할 것인가?
2. **Custom 룰의 detection_config에 Sigma 문법 키(`selection`, `condition`)가 포함된 경우**: 현재 탐지 엔진 수정안에서는 Sigma 문법으로 감지하여 스킵하는데, Custom 룰에서 이 키를 사용할 가능성
3. **target_indices에 존재하지 않는 인덱스가 포함된 경우**: OpenSearch는 404를 반환하므로 에러 처리 필요
4. **last_run_at이 매우 오래전인 Detector**: 오랫동안 비활성이었다가 다시 활성화되면 과거 전체 로그를 검색할 수 있음 → 최대 검색 윈도우 제한 필요 (예: max 24시간)

---

## 5. 데이터 모델 검토

### 5.1 OpenSearch 스키마 확장 제안

**cs_detection_rules 추가 필드:**

```json
{
  "opensearch_query": {
    "type": "object",
    "enabled": false
  },
  "query_conversion_status": {
    "type": "keyword"
  },
  "query_conversion_error": {
    "type": "text"
  },
  "query_pipeline_id": {
    "type": "keyword"
  },
  "query_converted_at": {
    "type": "date"
  }
}
```

**제안 추가 필드:**
- `query_converted_at`: 변환 시각 추적 (재변환 필요 여부 판단)

**cs_detectors 추가 필드 (향후):**

```json
{
  "timestamp_field": {
    "type": "keyword"
  },
  "max_search_window_min": {
    "type": "integer"
  }
}
```

- `timestamp_field`: Detector별 타임스탬프 필드 (기본 `@timestamp`)
- `max_search_window_min`: 최대 검색 윈도우 (기본 1440 = 24시간)

### 5.2 Pydantic 스키마 제안

```python
# schemas/sigma_rule.py 확장
class SigmaRuleResponse(BaseModel):
    # ... 기존 필드 ...
    opensearch_query: Optional[Dict[str, Any]] = None
    query_conversion_status: Optional[str] = None
    query_conversion_error: Optional[str] = None
    query_pipeline_id: Optional[str] = None
    query_converted_at: Optional[datetime] = None

# schemas/detection_policy.py 확장 (향후)
class DetectorCreate(BaseModel):
    # ... 기존 필드 ...
    timestamp_field: str = "@timestamp"
    max_search_window_min: int = Field(default=1440, ge=5, le=10080)
```

---

## 6. 명확화가 필요한 사항

### 6.1 질문 사항

1. **질문 1: pySigma 변환 실패 룰의 Detector 연결 허용 여부**
   - 현재 기획서 내용: "변환 실패 규칙은 경고 표시" (6.6 Phase 2)
   - 명확화 필요 이유: 경고만 표시하고 연결을 허용할지, 아니면 연결 자체를 차단할지에 따라 UX와 로직이 달라짐
   - 제안 사항:
     - 옵션 A: 경고만 표시, 연결 허용 (사용자 책임, 탐지 시 자동 스킵)
     - 옵션 B: 연결 차단 (변환 성공 룰만 선택 가능)
     - 권장: **옵션 A** — 향후 파이프라인 업데이트로 변환이 가능해질 수 있으므로

2. **질문 2: SentinelOne 로그에 대한 접근 방식**
   - 현재 기획서 내용: SentinelOne은 현재 데이터 소스로 존재하지만, Sigma 룰 적용에 대한 구체적 계획이 없음
   - 명확화 필요 이유: 현재 유일하게 수집 중인 로그이므로, 이것에 대해 동작하는 룰이 없으면 시스템 가치 증명이 어려움
   - 제안 사항:
     - 옵션 A: SentinelOne 전용 Custom 룰을 수동으로 작성 (빠른 가치 증명)
     - 옵션 B: SentinelOne 전용 pySigma 파이프라인 개발 (체계적이지만 공수 큼)
     - 옵션 C: Phase 1에서는 Custom 룰로 PoC, Phase 4에서 파이프라인으로 전환
     - 권장: **옵션 C**

3. **질문 3: 최대 검색 윈도우 제한**
   - 현재 기획서 내용: `last_run_at or "now-5m"`으로 fallback
   - 명확화 필요 이유: 장기간 비활성 후 재활성화 시 과거 전체 로그 검색으로 OpenSearch 과부하 가능
   - 제안 사항:
     - 옵션 A: 고정값 제한 (예: 최대 24시간)
     - 옵션 B: Detector별 설정 가능 (`max_search_window_min` 필드)
     - 권장: **옵션 B** — 유연성 확보

4. **질문 4: 벌크 재변환 실행 방식**
   - 현재 기획서 내용: "벌크 재변환 UI" (Phase 4)
   - 명확화 필요 이유: 3,700+ 룰 재변환은 수 분 이상 소요될 수 있어 동기/비동기 처리 결정 필요
   - 제안 사항:
     - 옵션 A: 동기 처리 (API 호출 시 완료까지 대기)
     - 옵션 B: 비동기 백그라운드 작업 (cs_rule_import_jobs와 유사한 작업 추적)
     - 권장: **옵션 B** — 기존 import job 패턴을 재활용

5. **질문 5: 구현 범위의 Phase 1 우선순위**
   - 현재 기획서 내용: Phase 1에 6개 태스크가 나열되어 있음
   - 명확화 필요 이유: Phase 1의 "가장 빠르게 가치를 증명할 수 있는" 최소 범위를 정의하면 개발 리스크를 줄일 수 있음
   - 제안 사항:
     - 옵션 A: Phase 1 전체를 한 번에 구현 (1~2주)
     - 옵션 B: Phase 1을 1a(pySigma 설치 + 변환 + 저장)와 1b(재변환 + 인덱스 확장)로 분리
     - 권장: **옵션 B** — 1a만으로도 `import_sigma.py` 실행 시 변환된 DSL 확인 가능

### 6.2 의사결정 필요 사항

1. **결정 사항: pySigma output_format 선택**
   - 옵션 A: `dsl_lucene` — OpenSearch DSL JSON 쿼리 생성 (현재 기획서 선택)
   - 옵션 B: `lucene` — Lucene 쿼리 문자열 생성 (더 가벼움, 하지만 aggregation 미지원)
   - 권장: **옵션 A** — aggregation 조건이 포함된 Sigma 룰도 지원 가능

---

## 7. 프로젝트 규칙 준수 검토

### 7.1 ASSISTANT.md 규칙 적합성

**레이어 아키텍처:**
- Endpoint → Service → Repository → OpenSearch 구조 완전 준수
- 변환 로직은 Service 레이어(`SigmaRuleService`)에 배치 적합

**OpenSearch 인덱스 규칙:**
- `cs_` 접두사: `cs_detection_rules` (기존), `cs_logsource_mappings` (신규) — 준수
- 필드명 snake_case: `opensearch_query`, `query_conversion_status` — 준수
- Soft delete: 기존 패턴 유지

**API 규칙:**
- `/api/v1` prefix 사용: 준수
- RESTful 네이밍: `/sigma-rules/reconvert` — 준수

### 7.2 추가 고려사항
- 테스트 필수 규칙 (TDD): Phase 2에 테스트가 포함되어 있으나, Phase 1 변환 로직에 대한 단위 테스트도 동시 작성 필요
- i18n: 변환 상태 표시 UI에 필요한 텍스트 키 사전 정의 필요

---

## 8. 개선 제안 사항

### 8.1 우선순위 높음 (반드시 반영 필요)

1. **pySigma 호환성 사전 검증**: Phase 1 착수 전 `pip install pySigma pySigma-backend-opensearch` 후 샘플 3~5개 룰에 대해 변환 테스트 실행. 실패율과 에러 유형 파악
2. **시간 범위 필터의 aggregation 쿼리 호환성**: pySigma가 생성하는 DSL 중 aggregation이 포함된 경우의 처리 로직을 설계 단계에서 확정
3. **최대 검색 윈도우 제한**: 장기간 비활성 Detector의 재활성화 시 과부하 방지를 위한 제한값 결정

### 8.2 우선순위 중간 (권장)

1. **변환 통계 API 추가**: `GET /sigma-rules/conversion-stats` — 전체/성공/실패/미변환 카운트 반환
2. **query_converted_at 필드 추가**: 변환 시각을 기록하여 "이 DSL은 언제 생성되었는가" 추적
3. **SentinelOne PoC Custom 룰 세트**: Phase 1과 병행하여 SentinelOne EDR 로그에 대한 Custom 룰 3~5개 작성

### 8.3 우선순위 낮음 (선택)

1. **pySigma 변환 캐시**: 동일 detection_config에 대한 중복 변환 방지
2. **변환 결과 diff 뷰**: 재변환 시 이전 DSL과 새 DSL의 차이를 비교하는 UI

---

## 9. 검토 체크리스트

### 완전성
- [x] 모든 필수 요구사항 명시됨
- [x] 비기능 요구사항 포함됨 (성능, 보안은 보완 필요)
- [x] 예외 상황 고려됨 (일부 엣지 케이스 추가 필요)
- [x] 성공 기준 명확함

### 명확성
- [x] 요구사항이 모호하지 않음
- [x] 용어 정의가 명확함
- [ ] 일부 의사결정 사항 미확정 (질문 1~5 답변 필요)

### 실현 가능성
- [x] 기술적으로 구현 가능함
- [x] 현재 아키텍처와 호환됨
- [ ] pySigma 호환성 사전 검증 필요

### 보안 및 성능
- [x] 보안 고려사항 포함됨
- [x] 성능 요구사항 정의됨 (동시 실행 제한 보완 필요)
- [x] 확장성 고려됨

---

## 10. 검토 질문에 대한 답변

> **작성 가이드:** 아래 질문들에 대한 답변을 작성하세요. 선택한 옵션과 그 이유를 명확히 기록하면, 최종 기획서 작성 시 참고됩니다.

### 질문 1: 변환 실패 룰의 Detector 연결 허용 여부

- 옵션 A: 경고만 표시, 연결 허용 (탐지 시 자동 스킵)
- 옵션 B: 연결 차단 (변환 성공 룰만 선택 가능)
- 권장: 옵션 A

**선택한 옵션:** 옵션 A

**선택 이유:**
변환 실패 룰을 즉시 차단하면 사용자는 룰 자산을 미리 연결해 두고 이후 파이프라인 개선이나 재변환으로 활성화하는 운영 흐름을 사용할 수 없다. 또한 변환 실패 여부는 pySigma 버전, 파이프라인 매핑, 백엔드 지원 범위에 따라 달라질 수 있으므로 현재 시점의 실패를 영구적인 사용 불가로 해석하는 것은 과도하다. 다만 운영 혼선을 막기 위해 UI에서 변환 실패, 실행 시 자동 스킵, 에러 상세 보기를 명확히 표시하고, Detector 실행 결과에도 스킵된 룰 수와 사유를 남겨야 한다.

---

### 질문 2: SentinelOne 로그 접근 방식

- 옵션 A: SentinelOne 전용 Custom 룰 수동 작성
- 옵션 B: SentinelOne 전용 pySigma 파이프라인 개발
- 옵션 C: Phase 1은 Custom 룰 PoC, Phase 4에서 파이프라인 전환
- 권장: 옵션 C

**선택한 옵션:** 옵션 C

**선택 이유:**
현재 실제 수집 중인 로그가 SentinelOne 포맷이라면, 가장 빠른 가치 증명은 SentinelOne 로그 기준의 Custom 룰을 몇 개 작성해 Detector가 실제로 동작하는 모습을 먼저 만드는 것이다. 반면 SentinelOne 전용 pySigma 파이프라인은 필드 매핑, 로그 스키마 분석, Sigma 룰 호환 범위 검증이 필요해 초기 공수가 크다. 따라서 초기 단계에서는 Custom 룰로 탐지 성공 사례를 확보하고, 이후 로그 필드 표준화와 파이프라인 프로파일이 정리되면 Sigma 기반 자동 변환으로 확장하는 것이 리스크와 효과 측면에서 가장 합리적이다.

---

### 질문 3: 최대 검색 윈도우 제한

- 옵션 A: 고정값 제한 (예: 최대 24시간)
- 옵션 B: Detector별 설정 가능 (max_search_window_min 필드)
- 권장: 옵션 B

**선택한 옵션:** 옵션 B

**선택 이유:**
Detector마다 목적과 데이터량이 다르므로 고정값 하나로 모든 검색 윈도우를 제한하면 과도하게 보수적이거나 반대로 느슨해질 수 있다. 예를 들어 고빈도 EDR 이벤트 탐지는 5~30분 단위가 적절할 수 있지만, 저빈도 관리 행위나 배치성 이벤트는 더 긴 윈도우가 필요할 수 있다. 따라서 Detector별 설정이 맞고, 기본값은 1440분(24시간)으로 두되 최소/최대 범위를 스키마에서 제한해 운영 안정성을 확보하는 방식이 적절하다. 추가로 실제 실행 시에는 last_run_at 기준 범위와 max_search_window_min 중 더 작은 값으로 캡핑해야 한다.

---

### 질문 4: 벌크 재변환 실행 방식

- 옵션 A: 동기 처리 (완료까지 대기)
- 옵션 B: 비동기 백그라운드 작업 (작업 추적)
- 권장: 옵션 B

**선택한 옵션:** 옵션 B

**선택 이유:**
3,700개 이상의 룰 재변환은 API 요청-응답 한 번에 처리하기에는 시간이 길고 실패 복구도 어렵다. 비동기 작업으로 분리하면 진행률, 성공/실패 건수, 에러 샘플, 재시도 전략을 별도 job 상태로 관리할 수 있고, 서버 타임아웃이나 클라이언트 연결 종료와 무관하게 안정적으로 수행할 수 있다. 기존 import job 패턴이 있다면 동일한 job 추적 모델을 재사용하는 것이 구현 복잡도도 낮다. 운영 관점에서도 관리자에게 "재변환 시작", "진행 중", "완료/부분 실패"를 분명하게 보여줄 수 있다.

---

### 질문 5: Phase 1 범위

- 옵션 A: Phase 1 전체를 한 번에 (1~2주)
- 옵션 B: Phase 1a(변환+저장)와 1b(재변환+인덱스)로 분리
- 권장: 옵션 B

**선택한 옵션:** 옵션 B

**선택 이유:**
초기 단계에서 가장 중요한 것은 "Sigma YAML이 실제로 OpenSearch용 쿼리로 변환되어 저장된다"는 핵심 가설을 빠르게 검증하는 것이다. 이를 위해서는 우선 1a에서 pySigma 설치, 샘플 룰 변환, import 시 opensearch_query 저장, 변환 상태 저장까지만 구현해도 충분한 기술 검증이 가능하다. 재변환 API, 벌크 작업, 통계 뷰, 인덱스 확장 최적화 등은 그다음 단계로 분리하는 것이 일정 리스크를 줄이고 실패 원인도 더 명확히 분리할 수 있다. 즉, 1a는 기술 검증, 1b는 운영성 강화로 나누는 것이 적절하다.

---

### 추가 결정 사항

#### pySigma output_format

- 옵션 A: dsl_lucene (OpenSearch DSL JSON)
- 옵션 B: lucene (Lucene 쿼리 문자열)
- 권장: 옵션 A

**결정:** 옵션 A: dsl_lucene (OpenSearch DSL JSON)

**이유:**
최종 실행 대상이 OpenSearch이며, 향후 aggregation 조건이나 구조화된 bool/filter 조합을 지원하려면 문자열 기반 Lucene보다 DSL JSON이 더 유연하고 안전하다. 또한 시간 범위 필터, 인덱스별 보정, 추가 must/filter 조건 삽입 같은 후처리를 코드에서 일관되게 수행하려면 JSON 구조가 훨씬 다루기 쉽다. Lucene 문자열은 단순 검색에는 가볍지만 기능 확장성과 후처리 안정성 측면에서 한계가 있다.

---

## 11. 답변 기반 업데이트 사항

### API 명세 확정

- `POST /api/v1/sigma-rules/{id}/reconvert` — 관리자 전용, 단건 재변환
- `POST /api/v1/sigma-rules/reconvert` — 관리자 전용, 비동기 백그라운드 job 생성 (응답: `{ job_id, status, requested_count }`)
- `GET /api/v1/sigma-rules/conversion-stats` — 전체/성공/실패/미변환 건수 반환
- 변환 실패 룰은 조회/선택 가능하되, Detector 실행 시 자동 스킵되며 실행 결과에 스킵 사유 포함

### 데이터 모델 확정

- **cs_detection_rules 확장 필드:**
  - `opensearch_query` (object, enabled: false)
  - `query_conversion_status` (keyword) — 값: `pending`, `success`, `failed`, `skipped`
  - `query_conversion_error` (text)
  - `query_pipeline_id` (keyword)
  - `query_converted_at` (date)
- **cs_detectors 확장 필드:**
  - `timestamp_field` (keyword, 기본 `@timestamp`)
  - `max_search_window_min` (integer, 기본 1440, 범위 5~10080)

### 비기능 요구사항 확정

- 검색 범위: `last_run_at` 기반 범위와 `max_search_window_min` 상한 중 작은 값으로 캡핑
- 스케줄러 동시 실행 제한: 세마포어 기반 (예: `asyncio.Semaphore(50)`)
- OpenSearch 쿼리 timeout 설정 적용
- 벌크 재변환: 비동기 작업, 진행률 추적, 부분 실패 재시도 지원
- 변환 실패 룰 포함 Detector: 부분 실행 가능, 실행 리포트에 성공/실패/스킵 통계 기록
- Phase 1은 1a(기술 검증: pySigma 변환+저장)와 1b(운영성: 재변환+인덱스 확장)로 분리, 1a 완료 기준은 "샘플 Sigma 룰이 pySigma를 통해 OpenSearch DSL로 변환되어 저장됨"
- SentinelOne: Phase 1에서 Custom 룰 기반 PoC로 가치 증명, Phase 4에서 전용 파이프라인 검토


---

## 12. 다음 단계

### 12.1 권장 액션
1. 위의 "10. 검토 질문에 대한 답변" 섹션을 모두 작성하세요
2. "11. 답변 기반 업데이트 사항"에 확정된 내용을 정리하세요
3. 답변 완료 후 `/finalize-spec detector` 명령을 실행하세요
   → 1번(원본) + 2번(검토+답변)을 합쳐 3번(최종 기획서) 생성

### 12.2 예상 추가 작업 시간
- 답변 작성: 15~30분
- pySigma 사전 검증 (권장): 1시간
- 최종 기획서 생성: 자동

---

**답변 작성 완료일:** 2026-03-18
**작성자:** 박지은
**검토 완료 일시:** 2026-03-18 19:30
**최종 기획서 생성일:** 2026-03-18
**다음 단계:** ✅ 완료 → `3_detector_spec_final.md` 생성됨
