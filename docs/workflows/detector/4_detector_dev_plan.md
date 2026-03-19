# Detector 기능 개발 계획서

**작성일:** 2026-03-18
**작성자:** AI
**기반 문서:** `3_detector_spec_final.md`
**상태:** 초안

---

## 📋 개발 개요

### 목표
Sigma 디텍션 룰을 pySigma로 OpenSearch DSL JSON으로 변환하여 저장하고, 탐지 엔진이 변환된 쿼리로 실제 로그를 검색하여 Finding을 생성하는 E2E 파이프라인을 구축한다.

### 개발 범위
- pySigma 기반 Sigma → OpenSearch DSL 변환 파이프라인
- Import 시 Pre-conversion 적용
- 단건/벌크 재변환 API (벌크는 비동기 job)
- 변환 통계 API
- 탐지 엔진 개선 (opensearch_query 우선, 시간 범위 필터, 변환 실패 스킵)
- Detector 스키마 확장 (timestamp_field, max_search_window_min)
- 스케줄러 동시 실행 제한 (세마포어)
- UI 연동 (변환 상태 표시, DSL 미리보기, 경고 아이콘)

### 예상 개발 기간
- Phase 1a (기술 검증): 3~5일
- Phase 1b (운영성 강화): 3~5일
- Phase 2 (탐지 엔진 개선): 5~7일
- Phase 3 (UI 연동): 5~7일
- **합계: 약 3~4주**

---

## 1. 아키텍처 설계

### 1.1 레이어 구조

```
Endpoint (API Router)           -- HTTP 요청/응답, 인증
    ↓
Service (Business Logic)        -- 변환, 탐지, 통계 로직
    ↓
Repository (Data Access)        -- OpenSearch CRUD
    ↓
OpenSearch (cs_detection_rules, cs_detectors, ...)
```

> **참고:** 이 프로젝트는 SQLAlchemy ORM이 아닌 opensearch-py 클라이언트로 직접 OpenSearch에 접근한다. Model 레이어 없이 Pydantic Schema + Repository 패턴을 사용한다.

### 1.2 신규/변경 컴포넌트

#### 1.2.1 신규 파일

| 파일 | 역할 |
|------|------|
| `app/core/sigma_pipeline.py` | pySigma 변환 엔진 래퍼 (파이프라인 구성, 변환 실행, 에러 처리) |
| `scripts/reconvert_rules.py` | 기존 룰 벌크 재변환 CLI 스크립트 |

#### 1.2.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/import_sigma.py` | Import 시 pySigma 변환 + opensearch_query 저장 |
| `app/schemas/sigma_rule.py` | SigmaRuleResponse에 변환 관련 필드 5개 추가 |
| `app/schemas/detection_policy.py` | DetectorCreate/Update에 timestamp_field, max_search_window_min 추가 |
| `app/repositories/sigma_rule.py` | 변환 상태별 조회, 벌크 업데이트, 통계 메서드 추가 |
| `app/repositories/detection_policy.py` | 실행 리포트 저장 메서드 추가 |
| `app/services/sigma_rule.py` | 단건/벌크 재변환, 통계 비즈니스 로직 |
| `app/services/detection_policy.py` | opensearch_query 우선 실행, 시간 필터, 스킵 로직, 실행 리포트 |
| `app/api/v1/endpoints/sigma_rule.py` | 재변환/통계 엔드포인트 3개 추가 |
| `app/core/scheduler.py` | 세마포어 기반 동시 실행 제한 |
| `scripts/opensearch_setup/1_index_cruxsiem.json` | cs_detection_rules, cs_detectors 매핑 확장 |
| `requirements.txt` | pySigma 관련 패키지 추가 |

---

## 2. 데이터베이스 설계 (OpenSearch)

### 2.1 cs_detection_rules 인덱스 매핑 확장

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
    "type": "text",
    "fields": {
      "keyword": { "type": "keyword", "ignore_above": 512 }
    }
  },
  "query_pipeline_id": {
    "type": "keyword"
  },
  "query_converted_at": {
    "type": "date"
  }
}
```

**필드 상세:**

| 필드명 | 타입 | Null | 기본값 | 설명 |
|--------|------|------|--------|------|
| opensearch_query | object (enabled:false) | YES | null | pySigma 변환 결과 DSL JSON |
| query_conversion_status | keyword | YES | null | `pending` / `success` / `failed` / `skipped` |
| query_conversion_error | text | YES | null | 변환 실패 시 에러 메시지 (민감 경로 필터링) |
| query_pipeline_id | keyword | YES | null | 사용된 파이프라인 식별자 |
| query_converted_at | date | YES | null | 마지막 변환 시각 (ISO 8601) |

### 2.2 cs_detectors 인덱스 매핑 확장

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

| 필드명 | 타입 | Null | 기본값 | 설명 |
|--------|------|------|--------|------|
| timestamp_field | keyword | YES | @timestamp | Detector별 타임스탬프 필드 |
| max_search_window_min | integer | YES | 1440 | 최대 검색 윈도우 (분), 범위: 5~10080 |

### 2.3 cs_rule_reconvert_jobs 인덱스 (신규)

```json
{
  "mappings": {
    "properties": {
      "job_id": { "type": "keyword" },
      "status": { "type": "keyword" },
      "requested_count": { "type": "integer" },
      "processed_count": { "type": "integer" },
      "success_count": { "type": "integer" },
      "failed_count": { "type": "integer" },
      "error_samples": { "type": "object", "enabled": false },
      "filter_criteria": { "type": "object", "enabled": false },
      "started_at": { "type": "date" },
      "completed_at": { "type": "date" },
      "created_by": { "type": "keyword" }
    }
  },
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  }
}
```

### 2.4 인덱스 관계

```
cs_detection_rules (3,113+ 문서)
    ├── opensearch_query → 탐지 엔진이 사용
    └── query_conversion_status → UI 표시, 통계

cs_detectors (Detector)
    ├── linked_rule_ids → cs_detection_rules._id 참조
    ├── timestamp_field → 검색 쿼리 시간 필터에 사용
    └── max_search_window_min → 검색 범위 상한

cs_detection_events (Finding)
    ├── detector_id → cs_detectors._id 참조
    └── rule_id → cs_detection_rules._id 참조

cs_rule_reconvert_jobs (재변환 작업 추적)
    └── job_id → 비동기 재변환 작업 식별
```

---

## 3. API 설계

### 3.1 신규 엔드포인트

#### API 1: 단건 재변환
```
POST /api/v1/sigma-rules/{rule_id}/reconvert
Authorization: Bearer <admin_token>

Response (200 OK):
{
  "id": "abc123",
  "query_conversion_status": "success",
  "opensearch_query": {
    "query": {
      "bool": {
        "must": [
          { "wildcard": { "process.command_line": "*powershell -enc*" } }
        ]
      }
    }
  },
  "query_pipeline_id": "ecs_windows",
  "query_converted_at": "2026-03-18T19:00:00Z",
  "query_conversion_error": null
}

Error Responses:
- 401: Unauthorized
- 403: Forbidden (관리자 아님)
- 404: Not Found
- 422: Unprocessable (변환 실패 상세 포함)
```

#### API 2: 벌크 재변환
```
POST /api/v1/sigma-rules/reconvert
Authorization: Bearer <admin_token>

Request Body:
{
  "filter": {
    "status": "failed",
    "pipeline_id": "ecs_windows"
  }
}

Response (202 Accepted):
{
  "job_id": "reconvert_20260318_193000",
  "status": "started",
  "requested_count": 300
}

Error Responses:
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict (이미 실행 중인 재변환 작업)
```

#### API 3: 변환 통계
```
GET /api/v1/sigma-rules/conversion-stats
Authorization: Bearer <token>

Response (200 OK):
{
  "total": 3113,
  "success": 2800,
  "failed": 213,
  "pending": 50,
  "skipped": 50,
  "not_converted": 0
}
```

### 3.2 변경 엔드포인트

#### GET /api/v1/sigma-rules — SigmaRuleListItem에 query_conversion_status 필드 추가

#### GET /api/v1/sigma-rules/{rule_id} — SigmaRuleResponse에 5개 변환 필드 추가

---

## 4. 구현 상세

### 4.1 sigma_pipeline.py (신규)

```python
"""pySigma 변환 엔진 래퍼"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class SigmaConversionResult:
    def __init__(self, opensearch_query, status, error, pipeline_id, converted_at):
        self.opensearch_query = opensearch_query
        self.status = status
        self.error = error
        self.pipeline_id = pipeline_id
        self.converted_at = converted_at

class SigmaPipelineManager:
    _instance = None
    _backend = None
    _pipeline = None
    _pipeline_id = "default"

    @classmethod
    def get_instance(cls) -> "SigmaPipelineManager":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            from sigma.backends.opensearch import OpensearchLuceneBackend
            from sigma.processing.pipeline import ProcessingPipeline
            from sigma.processing.transformations import FieldMappingTransformation

            self._pipeline = ProcessingPipeline(
                name="CruxSIEM Default",
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
                        "ServiceName": "service.name",
                        "RegistryKey": "registry.key",
                        "RegistryValue": "registry.value",
                    })
                ]
            )
            self._backend = OpensearchLuceneBackend(self._pipeline)
            logger.info("pySigma 파이프라인 초기화 완료")
        except ImportError:
            logger.warning("pySigma 미설치 — 변환 기능 비활성")
            self._backend = None

    def is_available(self) -> bool:
        return self._backend is not None

    def convert_rule(self, raw_yaml: str) -> SigmaConversionResult:
        now = datetime.now(timezone.utc).isoformat()
        if not self.is_available():
            return SigmaConversionResult(None, "pending", "pySigma not installed", self._pipeline_id, now)
        try:
            from sigma.rule import SigmaRule
            rule = SigmaRule.from_yaml(raw_yaml)
            dsl_list = self._backend.convert_rule(rule, output_format="dsl_lucene")
            if not dsl_list:
                return SigmaConversionResult(None, "failed", "Empty conversion result", self._pipeline_id, now)
            return SigmaConversionResult(dsl_list[0], "success", None, self._pipeline_id, now)
        except Exception as e:
            error_msg = str(e)
            if "/" in error_msg or "\\" in error_msg:
                error_msg = error_msg.split("/")[-1].split("\\")[-1]
            return SigmaConversionResult(None, "failed", error_msg[:500], self._pipeline_id, now)
```

### 4.2 Schema 변경

#### schemas/sigma_rule.py 추가

```python
# SigmaRuleListItem에 추가
query_conversion_status: Optional[str] = None

# SigmaRuleResponse에 추가
opensearch_query: Optional[Dict[str, Any]] = None
query_conversion_status: Optional[str] = None
query_conversion_error: Optional[str] = None
query_pipeline_id: Optional[str] = None
query_converted_at: Optional[str] = None

# 신규 스키마
class ConversionStatsResponse(BaseModel):
    total: int = 0
    success: int = 0
    failed: int = 0
    pending: int = 0
    skipped: int = 0
    not_converted: int = 0

class ReconvertJobResponse(BaseModel):
    job_id: str
    status: str
    requested_count: int

class ReconvertResultResponse(BaseModel):
    id: str
    query_conversion_status: str
    opensearch_query: Optional[Dict[str, Any]] = None
    query_pipeline_id: Optional[str] = None
    query_converted_at: Optional[str] = None
    query_conversion_error: Optional[str] = None

class BulkReconvertRequest(BaseModel):
    filter: Optional[Dict[str, str]] = None
```

#### schemas/detection_policy.py 추가

```python
# DetectorCreate에 추가
timestamp_field: str = "@timestamp"
max_search_window_min: int = Field(default=1440, ge=5, le=10080)

# DetectorUpdate에 추가
timestamp_field: Optional[str] = None
max_search_window_min: Optional[int] = Field(default=None, ge=5, le=10080)

# DetectorResponse에 추가
timestamp_field: Optional[str] = "@timestamp"
max_search_window_min: Optional[int] = 1440
```

### 4.3 Repository 추가 메서드

#### repositories/sigma_rule.py

```python
async def update_conversion_result(self, rule_id: str, conversion_data: dict) -> bool:
    """단건 변환 결과 업데이트"""

async def bulk_update_conversion(self, updates: list[dict]) -> dict:
    """벌크 변환 결과 업데이트 (OpenSearch _bulk API)"""

async def get_conversion_stats(self) -> dict:
    """변환 상태별 집계 (aggregation query)"""

async def list_rules_by_conversion_status(self, status: str, skip: int = 0, limit: int = 100) -> dict:
    """변환 상태별 룰 목록 조회"""

async def get_all_sigma_rules_for_reconvert(self, filter_criteria: Optional[dict] = None) -> list:
    """재변환 대상 룰 전체 조회 (scroll API)"""

async def create_reconvert_job(self, job_data: dict) -> str:
    """재변환 job 생성"""

async def update_reconvert_job(self, job_id: str, update_data: dict) -> bool:
    """재변환 job 상태 업데이트"""

async def get_active_reconvert_job(self) -> Optional[dict]:
    """진행 중인 재변환 job 조회"""
```

### 4.4 Service 추가 메서드

#### services/sigma_rule.py

```python
async def reconvert_single(self, rule_id: str) -> dict:
    """단건 재변환: 룰 조회 → raw_yaml로 재변환 → 결과 저장 → 응답"""

async def start_bulk_reconvert(self, filter_criteria: Optional[dict], user_id: str) -> dict:
    """벌크 재변환 job 시작 (백그라운드 실행)"""

async def _execute_bulk_reconvert(self, job_id: str, filter_criteria: Optional[dict]):
    """실제 벌크 재변환 실행 (백그라운드 태스크)"""

async def get_conversion_stats(self) -> dict:
    """변환 통계 조회"""
```

#### services/detection_policy.py 변경

```python
async def _run_rule_against_indices(self, detector, rule, target_indices, field_mappings):
    """
    변경:
    1. opensearch_query 우선 사용
    2. detection_config fallback 시 Sigma 문법 감지 → 스킵
    3. timestamp_field 동적 적용
    4. max_search_window_min 캡핑
    5. 쿼리 timeout 설정 ("30s")
    6. 실행 결과에 status (executed/skipped) 반환
    """

async def run_detection_for_detector(self, detector: dict) -> dict:
    """
    변경:
    1. 실행 리포트 생성 { executed, skipped, failed, findings }
    2. 변환 실패 룰 스킵 시 사유 기록
    """
```

### 4.5 Endpoint 추가

#### endpoints/sigma_rule.py

```python
@router.post("/{rule_id}/reconvert", response_model=ReconvertResultResponse)
async def reconvert_sigma_rule(rule_id: str, current_user=Depends(get_current_admin_user)):
    """단건 재변환 (관리자 전용)"""

@router.post("/reconvert", response_model=ReconvertJobResponse, status_code=202)
async def bulk_reconvert_sigma_rules(
    request: BulkReconvertRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_admin_user),
):
    """벌크 재변환 (관리자 전용, 비동기)"""

@router.get("/conversion-stats", response_model=ConversionStatsResponse)
async def get_conversion_stats():
    """변환 상태 통계"""
```

> **주의:** `/conversion-stats`와 `/reconvert`는 `/{rule_id}` 보다 위에 정의해야 FastAPI 라우팅 충돌 방지.

### 4.6 Scheduler 변경

```python
import asyncio

class DetectionScheduler:
    _semaphore = asyncio.Semaphore(50)

    async def run_active_detection_policies(self):
        async def _run_with_limit(detector):
            async with self._semaphore:
                return await service.run_detection_for_detector(detector)

        tasks = [_run_with_limit(d) for d in active_detectors]
        results = await asyncio.gather(*tasks, return_exceptions=True)
```

---

## 5. 마이그레이션 계획

### 5.1 OpenSearch 인덱스 매핑 업데이트

OpenSearch는 동적 매핑을 지원하므로 기존 인덱스에 새 필드를 추가하면 자동 매핑된다.
다만 `opensearch_query`의 `enabled: false` 설정은 명시적 매핑 업데이트가 필요하다.

```bash
# 1. cs_detection_rules 매핑 업데이트
curl -X PUT "https://localhost:9200/cs_detection_rules/_mapping" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "opensearch_query": { "type": "object", "enabled": false },
      "query_conversion_status": { "type": "keyword" },
      "query_conversion_error": { "type": "text" },
      "query_pipeline_id": { "type": "keyword" },
      "query_converted_at": { "type": "date" }
    }
  }'

# 2. cs_detectors 매핑 업데이트
curl -X PUT "https://localhost:9200/cs_detectors/_mapping" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "timestamp_field": { "type": "keyword" },
      "max_search_window_min": { "type": "integer" }
    }
  }'

# 3. cs_rule_reconvert_jobs 인덱스 신규 생성 (2.3절 스키마 참조)
```

### 5.2 기존 데이터 마이그레이션

```bash
# Phase 1a 완료 후 실행
cd backend
python scripts/reconvert_rules.py --all --dry-run     # 사전 검증
python scripts/reconvert_rules.py --all               # 실제 실행
```

### 5.3 롤백 계획

```bash
# 변환 데이터 롤백: opensearch_query 등 새 필드 일괄 제거
curl -X POST "https://localhost:9200/cs_detection_rules/_update_by_query" \
  -H "Content-Type: application/json" \
  -d '{
    "script": {
      "source": "ctx._source.remove(\"opensearch_query\"); ctx._source.remove(\"query_conversion_status\"); ctx._source.remove(\"query_conversion_error\"); ctx._source.remove(\"query_pipeline_id\"); ctx._source.remove(\"query_converted_at\")"
    }
  }'
```

---

## 6. 의존성 관리

### 6.1 추가 패키지

`requirements.txt`에 추가:

```
pySigma>=1.2.0
pySigma-backend-opensearch>=2.0.0
pySigma-pipeline-windows>=2.0.0
pySigma-pipeline-sysmon>=2.0.0
```

### 6.2 오프라인(폐쇄망) 배포 고려사항

> **이 서비스는 최종적으로 인터넷이 없는 온프레미스 폐쇄망 환경에서 운영된다.**

**배포 흐름:** 인터넷 있는 빌드 서버에서 Docker 이미지 빌드 → `.tar` export → 폐쇄망 전달 → `docker load`

- `requirements.txt`에 pySigma를 추가하면 **Docker 빌드 시점에 자동으로 이미지에 포함**되므로, 운영 서버에서 별도 `pip install`이 불필요하다.
- pySigma 파이프라인 플러그인(`ecs-windows`, `sysmon`)도 동일하게 Docker 이미지에 포함된다.
- Sigma 룰 YAML 파일은 이미 `backend/resources/rules/` (3,113개)에 번들링되어 있으므로 외부 다운로드가 불필요하다.
- 향후 Sigma 룰 업데이트가 필요할 경우, 인터넷 환경에서 최신 룰 YAML을 다운로드하여 `resources/rules/`에 복사 후 재빌드하거나, USB 등으로 YAML 파일만 전달하여 `import_sigma.py`를 재실행한다.
- pySigma 버전 업데이트도 Docker 이미지 재빌드로 처리한다.

### 6.3 버전 호환성 검증 항목

| 패키지 | 검증 항목 |
|--------|---------|
| pySigma | Python 3.11 호환, SigmaRule.from_yaml() 동작 |
| pySigma-backend-opensearch | convert_rule(output_format="dsl_lucene") 동작 |
| pySigma-pipeline-ecs-windows | FieldMappingTransformation 동작 |

---

## 7. 테스트 계획

### 7.1 테스트 파일 구조

```
backend/tests/
├── test_services/
│   ├── test_sigma_rule.py          ← 기존 + 재변환/통계 테스트 추가
│   └── test_detection_policy.py    ← 기존 + 탐지 엔진 개선 테스트 추가
├── test_repositories/
│   ├── test_sigma_rule.py          ← 신규 (변환 상태 조회, 벌크 업데이트)
│   └── test_detection_policy.py    ← 신규
├── test_api/
│   ├── test_sigma_rule.py          ← 신규 (재변환/통계 엔드포인트)
│   └── test_detection_policy.py    ← 신규
└── test_core/
    └── test_sigma_pipeline.py      ← 신규 (pySigma 변환 단위 테스트)
```

### 7.2 단위 테스트 케이스

#### test_core/test_sigma_pipeline.py

| 테스트 케이스 | 검증 내용 |
|-------------|---------|
| test_convert_basic_sigma_rule | 기본 Sigma 룰 (exact match) → DSL 변환 |
| test_convert_contains_modifier | `\|contains` 수식어 → wildcard 변환 |
| test_convert_startswith_modifier | `\|startswith` 수식어 → prefix wildcard |
| test_convert_endswith_modifier | `\|endswith` 수식어 → suffix wildcard |
| test_convert_regex_modifier | `\|re` 수식어 → regexp 변환 |
| test_convert_and_or_condition | and/or condition → bool must/should |
| test_convert_not_condition | not condition → bool must_not |
| test_convert_field_mapping | Sigma 필드명 → ECS 필드명 매핑 |
| test_convert_failure_handling | 변환 실패 시 status == "failed" |
| test_convert_empty_detection | 빈 detection 블록 처리 |
| test_pysigma_not_installed | pySigma 미설치 시 status == "pending" |
| test_error_message_sanitization | 에러 메시지에서 내부 경로 필터링 |

#### test_services/test_sigma_rule.py (추가)

| 테스트 케이스 | 검증 내용 |
|-------------|---------|
| test_reconvert_single_success | 단건 재변환 성공 → 상태/쿼리 갱신 |
| test_reconvert_single_not_found | 존재하지 않는 룰 → 404 |
| test_reconvert_single_custom_rule | Custom 룰 재변환 시도 처리 |
| test_get_conversion_stats | 통계 조회 결과 정확성 |
| test_start_bulk_reconvert | 벌크 재변환 job 생성 |
| test_bulk_reconvert_conflict | 이미 실행 중인 job → 409 |

#### test_services/test_detection_policy.py (추가)

| 테스트 케이스 | 검증 내용 |
|-------------|---------|
| test_run_with_opensearch_query | opensearch_query 있는 룰 실행 성공 |
| test_fallback_to_detection_config | opensearch_query 없을 때 fallback |
| test_skip_unconverted_sigma | Sigma 문법 감지 시 스킵 + 사유 |
| test_time_range_filter | last_run_at → 시간 범위 필터 적용 |
| test_max_search_window_capping | max_search_window_min 캡핑 동작 |
| test_query_timeout | search body에 timeout 포함 |
| test_execution_report | 실행 결과에 executed/skipped/failed 통계 |
| test_partial_execution | 변환 실패 룰 포함 시 부분 실행 |
| test_custom_timestamp_field | detector.timestamp_field 적용 |

### 7.3 통합 테스트 케이스

| 테스트 케이스 | 검증 내용 |
|-------------|---------|
| test_import_and_convert_e2e | YAML Import → pySigma 변환 → opensearch_query 저장 |
| test_reconvert_api_e2e | API 호출 → 재변환 → 결과 조회 |
| test_detection_with_converted_rule | 변환된 DSL → Detector 실행 → Finding 생성 |
| test_no_duplicate_findings | 동일 Detector 2회 실행 → 2번째 Finding 미생성 |
| test_custom_rule_compatibility | 기존 Custom 룰 동작 무영향 |

### 7.4 테스트 커버리지 목표
- 신규 코드: 80% 이상
- sigma_pipeline.py: 90% 이상 (핵심 변환 로직)

---

## 8. 보안 고려사항

### 8.1 인증/인가

| API | 인증 | 인가 |
|-----|------|------|
| GET /sigma-rules/conversion-stats | Required | 일반 사용자 허용 |
| POST /sigma-rules/{id}/reconvert | Required | **관리자 전용** |
| POST /sigma-rules/reconvert | Required | **관리자 전용** |

### 8.2 입력 검증
- `max_search_window_min`: Pydantic `Field(ge=5, le=10080)` 범위 검증
- `trigger_condition`: 길이 제한 500자, 허용 변수명 화이트리스트 (`hit_count`, `matched_count`, `event_count`)
- `BulkReconvertRequest.filter`: 허용 키 화이트리스트 (`status`, `pipeline_id`)

### 8.3 에러 처리
- `query_conversion_error`: 내부 파일 경로 포함 시 마지막 세그먼트만 저장, 최대 500자
- OpenSearch 쿼리 실행 에러: 에러 타입만 기록, 쿼리 본문은 debug 레벨 로깅

---

## 9. 성능 최적화

### 9.1 OpenSearch

| 항목 | 전략 |
|------|------|
| 시간 범위 필터 | `@timestamp` range 쿼리로 검색 범위 대폭 축소 |
| 쿼리 timeout | `"timeout": "30s"` 설정으로 무한 대기 방지 |
| 벌크 업데이트 | `_bulk` API로 재변환 결과 일괄 저장 (500건 단위) |
| 집계 쿼리 | conversion-stats는 `terms` aggregation 사용 |
| 검색 결과 제한 | `"size": 10` (Finding 생성용 샘플만) |

### 9.2 스케줄러

| 항목 | 전략 |
|------|------|
| 동시 실행 제한 | `asyncio.Semaphore(50)` |
| 변환 실패 스킵 | 실행 전 status 확인으로 불필요한 쿼리 방지 |
| 비동기 재변환 | `BackgroundTasks` + job 추적으로 API 타임아웃 방지 |

---

## 10. 프론트엔드 변경 계획

### 10.1 타입 정의 변경

```typescript
// types/index.ts
interface SigmaRuleListItem {
  // 기존 + 추가
  query_conversion_status?: string | null;
}

interface SigmaRuleDetail {
  // 기존 + 추가
  opensearch_query?: object | null;
  query_conversion_status?: string | null;
  query_conversion_error?: string | null;
  query_pipeline_id?: string | null;
  query_converted_at?: string | null;
}

interface Detector {
  // 기존 + 추가
  timestamp_field?: string;
  max_search_window_min?: number;
}

interface ConversionStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  skipped: number;
  not_converted: number;
}
```

### 10.2 서비스 레이어

```typescript
// services/sigmaRuleService.ts 추가
reconvertRule(ruleId: string): Promise<ReconvertResult>;
bulkReconvert(filter?: object): Promise<ReconvertJob>;
getConversionStats(): Promise<ConversionStats>;
```

### 10.3 UI 컴포넌트 변경

| 컴포넌트 | 변경 내용 |
|---------|----------|
| `DetectionRuleList.tsx` | 변환 상태 아이콘 (✅/⚠/⏳) |
| `DetectionRuleDetail.tsx` | opensearch_query JSON 뷰어, 변환 상태/에러, 재변환 버튼 |
| `DetectorForm.tsx` | timestamp_field/max_search_window_min 입력, 변환 실패 경고 |
| `DetectionRuleTab.tsx` | 변환 통계 요약 (선택) |

### 10.4 i18n 추가 키

ko/en/ja/cn 4개 파일에 다음 키 추가:

```json
{
  "conversionSuccess": "변환 성공",
  "conversionFailed": "변환 실패",
  "conversionPending": "변환 대기",
  "reconvert": "재변환",
  "bulkReconvert": "전체 재변환",
  "conversionStats": "변환 통계",
  "timestampField": "타임스탬프 필드",
  "maxSearchWindow": "최대 검색 윈도우(분)",
  "ruleSkippedWarning": "이 규칙은 변환 실패 상태입니다. 탐지 시 자동 스킵됩니다.",
  "opensearchQuery": "OpenSearch 쿼리",
  "queryPreview": "쿼리 미리보기"
}
```

---

## 11. 구현 순서

### Phase 1a: 기술 검증 (3~5일)

**TDD 사이클: 테스트 → 구현 → 리팩토링**

- [x] 1. pySigma 호환성 사전 검증
  - `pip install pySigma pySigma-backend-opensearch pySigma-pipeline-windows`
  - Python 3.11 환경에서 import 확인
  - 샘플 3~5개 Sigma 룰 변환 테스트 (REPL에서 수동 확인)
  - 변환 실패율/에러 유형 파악
- [x] 2. `requirements.txt`에 pySigma 패키지 추가
- [x] 3. `test_core/test_sigma_pipeline.py` 테스트 작성 (Red)
- [x] 4. `app/core/sigma_pipeline.py` 구현 (Green)

**--- 중간 테스트 1a-A: 변환 엔진 단위 테스트 ---**

```bash
pytest tests/test_core/test_sigma_pipeline.py -v
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_convert_basic_sigma_rule | exact match 룰 → DSL 변환 | status == "success", opensearch_query에 term 쿼리 포함 |
| test_convert_contains_modifier | `\|contains` → wildcard | `"wildcard"` 키 포함, 값에 `*...*` 패턴 |
| test_convert_startswith_modifier | `\|startswith` → prefix wildcard | 값이 `value*` 패턴 |
| test_convert_endswith_modifier | `\|endswith` → suffix wildcard | 값이 `*value` 패턴 |
| test_convert_regex_modifier | `\|re` → regexp | `"regexp"` 키 포함 |
| test_convert_and_or_condition | and/or → bool must/should | `"bool"` 구조에 `"must"` 또는 `"should"` 포함 |
| test_convert_not_condition | not → must_not | `"must_not"` 포함 |
| test_convert_field_mapping | Sigma 필드 → ECS 필드 | `CommandLine` → `process.command_line` 치환 확인 |
| test_convert_failure_handling | 잘못된 YAML → 실패 | status == "failed", error 메시지 존재 |
| test_convert_empty_detection | 빈 detection 블록 | status == "failed" |
| test_pysigma_not_installed | pySigma 없는 환경 | status == "pending" |
| test_error_message_sanitization | 에러 내 경로 필터링 | `/home/user/...` 같은 경로 제거됨 |

- [x] 5. `test_services/test_sigma_rule.py`에 변환 관련 테스트 추가 (Red)
- [x] 6. `app/schemas/sigma_rule.py` 확장 (변환 필드, 신규 스키마)
- [x] 7. `scripts/import_sigma.py` 수정 (pySigma 변환 통합)

**--- 중간 테스트 1a-B: Import 변환 통합 테스트 ---**

```bash
pytest tests/test_services/test_sigma_rule.py -v -k "convert"
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_parse_and_convert_sigma_yaml | parse_sigma_yaml → 변환 결과 포함 | 반환 dict에 opensearch_query, query_conversion_status 존재 |
| test_import_stores_conversion_fields | Import 후 저장 데이터 확인 | OpenSearch 문서에 5개 변환 필드 모두 저장 |
| test_import_conversion_failure_graceful | 변환 실패해도 Import 계속 | status=="failed"인 문서 저장, Import 중단 안 됨 |
| test_import_custom_rule_no_conversion | Custom 룰은 변환 스킵 | query_conversion_status == null 또는 "skipped" |

```bash
# 수동 검증: 실제 Sigma YAML로 dry-run
python scripts/import_sigma.py --path resources/rules/windows/ --dry-run | head -50
```

- [x] 8. 전체 Phase 1a 테스트 실행 및 검증 (Green → Refactor) — 59/59 PASSED

```bash
pytest tests/test_core/ tests/test_services/test_sigma_rule.py -v --tb=short
```

**완료 기준:** 샘플 Sigma 룰이 pySigma를 통해 OpenSearch DSL로 변환되어 저장됨

---

### Phase 1b: 운영성 강화 (3~5일)

- [x] 9. OpenSearch 인덱스 매핑 업데이트 (`1_index_cruxsiem.json` 수정)
- [x] 10. `test_repositories/test_sigma_rule.py` 작성 (Red)
- [x] 11. `app/repositories/sigma_rule.py` 확장 (Green)

**--- 중간 테스트 1b-A: Repository 레이어 테스트 ---**

```bash
pytest tests/test_repositories/test_sigma_rule.py -v
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_update_conversion_result | 단건 변환 결과 저장 | OpenSearch 문서에 opensearch_query 갱신 확인 |
| test_bulk_update_conversion | 벌크 변환 결과 저장 | _bulk API 호출, 다수 문서 동시 갱신 |
| test_get_conversion_stats | aggregation 통계 | total/success/failed/pending 카운트 정확 |
| test_list_rules_by_conversion_status | 상태별 필터 조회 | status="failed" 쿼리 시 해당 룰만 반환 |
| test_create_reconvert_job | job 문서 생성 | cs_rule_reconvert_jobs에 문서 생성 확인 |
| test_update_reconvert_job | job 진행률 갱신 | processed_count, success_count 갱신 |
| test_get_active_reconvert_job | 진행 중 job 조회 | status="started" job 반환, 없으면 None |

- [x] 12. `test_services/test_sigma_rule.py`에 재변환/통계 테스트 추가 (Red)
- [x] 13. `app/services/sigma_rule.py` 확장 (Green)

**--- 중간 테스트 1b-B: Service 레이어 테스트 ---**

```bash
pytest tests/test_services/test_sigma_rule.py -v -k "reconvert or stats"
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_reconvert_single_success | 단건 재변환 성공 | opensearch_query 갱신, status=="success" |
| test_reconvert_single_not_found | 없는 룰 재변환 | HTTPException 404 |
| test_reconvert_single_custom_rule | Custom 룰 재변환 | 스킵 또는 적절한 에러 |
| test_get_conversion_stats | 통계 조회 | 합계 검증: total == success + failed + pending + skipped |
| test_start_bulk_reconvert | job 생성 | job_id 반환, status=="started" |
| test_bulk_reconvert_conflict | 중복 실행 방지 | 이미 실행 중일 때 409 |

- [x] 14. `test_api/test_sigma_rule.py` 작성 (Red)
- [x] 15. `app/api/v1/endpoints/sigma_rule.py` 확장 (Green)

**--- 중간 테스트 1b-C: API 엔드포인트 테스트 ---**

```bash
pytest tests/test_api/test_sigma_rule.py -v
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_reconvert_single_api_200 | POST /{id}/reconvert 성공 | 200, ReconvertResultResponse 구조 |
| test_reconvert_single_api_401 | 미인증 호출 | 401 |
| test_reconvert_single_api_403 | 일반 사용자 호출 | 403 |
| test_reconvert_single_api_404 | 없는 룰 | 404 |
| test_bulk_reconvert_api_202 | POST /reconvert 성공 | 202, job_id 반환 |
| test_bulk_reconvert_api_409 | 중복 실행 | 409 |
| test_conversion_stats_api_200 | GET /conversion-stats | 200, ConversionStatsResponse 구조 |
| test_list_rules_includes_status | GET /sigma-rules 응답 | 각 item에 query_conversion_status 필드 존재 |
| test_get_rule_includes_query | GET /sigma-rules/{id} 응답 | opensearch_query 등 5개 변환 필드 포함 |

- [x] 16. `scripts/reconvert_rules.py` 작성
- [ ] 17. 기존 3,106개 룰 벌크 재변환 실행, 성공률 분석 (OpenSearch 연결 필요)

**--- 중간 테스트 1b-D: 벌크 재변환 실측 검증 ---**

```bash
cd backend
python scripts/reconvert_rules.py --all --dry-run 2>&1 | tail -20
```

| 검증 항목 | 통과 기준 |
|---------|----------|
| 전체 룰 수 | 3,113개 처리 완료 |
| 변환 성공률 | 80% 이상 (목표) |
| 변환 실패 유형 분류 | near 연산자, 미지원 수식어 등 유형 파악 |
| 처리 시간 | 3,113개 기준 5분 이내 |
| 에러 메시지 품질 | 경로 노출 없음, 500자 이내 |

```bash
# Phase 1b 전체 테스트
pytest tests/test_repositories/test_sigma_rule.py tests/test_services/test_sigma_rule.py tests/test_api/test_sigma_rule.py -v --tb=short
```

---

### Phase 2: 탐지 엔진 개선 (5~7일)

- [x] 18. `app/schemas/detection_policy.py` 확장
- [x] 19. `test_services/test_detection_policy.py`에 탐지 엔진 테스트 추가 (Red)
- [x] 20. `app/services/detection_policy.py` 수정 (Green)

**--- 중간 테스트 2-A: 탐지 엔진 핵심 로직 테스트 ---**

```bash
pytest tests/test_services/test_detection_policy.py -v -k "run_rule or run_detection"
# — 39/39 PASSED (기존 28 + V2 11개)
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_run_with_opensearch_query | opensearch_query 있는 룰 실행 | OpenSearch search 호출 시 opensearch_query 사용 |
| test_fallback_to_detection_config | opensearch_query 없을 때 | detection_config로 fallback 실행 |
| test_skip_unconverted_sigma | Sigma 문법 감지 | status=="skipped", reason=="unconverted_sigma" |
| test_skip_failed_conversion | query_conversion_status=="failed" | 해당 룰 스킵, 로그 기록 |
| test_time_range_filter_applied | 시간 범위 필터 | search body에 `range.@timestamp.gte` == last_run_at |
| test_time_range_filter_no_last_run | last_run_at 없을 때 | `gte` == `now-{max_window}m` |
| test_max_search_window_capping | max_window=60, last_run_at=3일 전 | gte가 now-60m으로 캡핑 |
| test_custom_timestamp_field | timestamp_field="event.timestamp" | range 쿼리에 해당 필드 사용 |
| test_query_timeout_in_body | timeout 설정 | search body에 `"timeout": "30s"` 포함 |
| test_partial_execution_report | 성공2 + 실패1 + 스킵1 | 리포트: executed=2, failed=1, skipped=1 |
| test_all_rules_skipped_report | 모든 룰 변환 실패 | 리포트: executed=0, skipped=N, findings=0 |

- [x] 21. `app/core/scheduler.py` 수정 (Semaphore)

**--- 중간 테스트 2-B: 스케줄러 동시 실행 테스트 ---**

```bash
pytest tests/test_services/test_detection_policy.py -v -k "semaphore or concurrent"
# — 3/3 PASSED
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_semaphore_limits_concurrency | 100개 Detector 동시 실행 | 동시 활성 태스크 50개 이하 |
| test_semaphore_all_complete | 세마포어 적용 후 전체 완료 | 모든 Detector 실행 결과 반환 |
| test_detector_error_no_cascade | 1개 Detector 에러 | 다른 Detector 실행에 영향 없음 |

- [x] 22. `test_api/test_detection_policy.py` 작성 (Red)

**--- 중간 테스트 2-C: Detector API 테스트 ---**

```bash
pytest tests/test_api/test_detection_policy.py -v
# — 4/4 PASSED
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_create_detector_with_new_fields | timestamp_field, max_search_window_min 포함 생성 | 201, 응답에 두 필드 포함 |
| test_create_detector_invalid_window | max_search_window_min=3 (범위 밖) | 422 Validation Error |
| test_update_detector_timestamp_field | timestamp_field 수정 | 200, 변경 반영 |
| test_get_detector_includes_new_fields | 조회 시 신규 필드 | 응답에 기본값 포함 (1440, @timestamp) |

- [x] 23. 통합 테스트 (변환된 DSL 실행 검증)

**--- 중간 테스트 2-D: E2E 탐지 실행 검증 ---**

```bash
pytest tests/test_services/test_detection_policy.py -v -k "e2e or integration"
# — 4/4 PASSED
```

| 테스트 | 검증 내용 | 통과 기준 |
|--------|---------|----------|
| test_e2e_converted_rule_creates_finding | 변환된 DSL → 매칭 로그 → Finding | Finding 문서 생성, matched_count > 0 |
| test_e2e_no_duplicate_findings | 동일 Detector 2회 실행 | 2번째 실행에서 중복 Finding 미생성 |
| test_e2e_custom_rule_still_works | 기존 Custom 룰 동작 | Custom detection_config로 정상 탐지 |
| test_e2e_mixed_rules_partial | 성공+실패 룰 혼합 Detector | 성공 룰만 실행, 실패 룰 스킵, 리포트 정확 |

```bash
# Phase 2 전체 테스트
pytest tests/test_services/test_detection_policy.py tests/test_api/test_detection_policy.py -v --tb=short
# — 50/50 PASSED
```

**--- SentinelOne Custom 룰 PoC (수동 검증) ---**

| 검증 항목 | 방법 | 통과 기준 |
|---------|------|----------|
| Custom 룰 3~5개 작성 | SentinelOne 로그 필드 기반 DSL 직접 작성 | Detector에 연결 가능 |
| Custom 룰 탐지 성공 | Detector 실행 후 Finding 확인 | 최소 1개 이상 Finding 생성 |
| Custom 룰 시간 필터 | 동일 Detector 2회 실행 | 2번째 실행에서 중복 없음 |

---

### Phase 3: UI 연동 (5~7일)

- [x] 24. 프론트엔드 타입 정의 업데이트 (`types/index.ts`)
- [x] 25. `sigmaRuleService.ts` 확장

**--- 중간 테스트 3-A: 서비스 레이어 동작 확인 ---**

```bash
npm run dev  # 개발 서버 실행 후 브라우저 DevTools Network 탭에서 확인
```

| 검증 항목 | 방법 | 통과 기준 |
|---------|------|----------|
| conversion-stats API 호출 | `getConversionStats()` 호출 | 200 응답, 통계 데이터 수신 |
| 룰 목록 응답에 status 포함 | `listRules()` 응답 확인 | 각 item에 query_conversion_status 존재 |
| 룰 상세 응답에 쿼리 포함 | `getRule(id)` 응답 확인 | opensearch_query 등 5개 필드 존재 |

- [x] 26. `DetectionRuleList.tsx` 수정 (변환 상태 아이콘)

**--- 중간 테스트 3-B: 룰 목록 UI 확인 ---**

| 검증 항목 | 방법 | 통과 기준 |
|---------|------|----------|
| 변환 성공 아이콘 | success 룰 확인 | ✅ 아이콘 표시 |
| 변환 실패 아이콘 | failed 룰 확인 | ⚠ 아이콘 + 툴팁 "변환 실패" |
| 변환 대기 아이콘 | pending 룰 확인 | ⏳ 아이콘 표시 |
| 미변환 룰 | status null | 아이콘 없음 또는 회색 |

- [x] 27. `DetectionRuleDetail.tsx` 수정 (DSL 뷰어, 재변환 버튼)

**--- 중간 테스트 3-C: 룰 상세 UI 확인 ---**

| 검증 항목 | 방법 | 통과 기준 |
|---------|------|----------|
| DSL JSON 뷰어 표시 | 변환 성공 룰 상세 클릭 | opensearch_query JSON이 정렬되어 표시 |
| 변환 실패 에러 표시 | 변환 실패 룰 상세 클릭 | 에러 메시지 표시, 빨간색 계열 |
| 변환 시각 표시 | 상세 패널 확인 | query_converted_at 날짜 포맷 표시 |
| 재변환 버튼 동작 | 관리자로 재변환 클릭 | API 호출 후 상태 갱신 |

- [x] 28. `DetectorForm.tsx` 수정 (신규 필드, 경고 메시지)

**--- 중간 테스트 3-D: Detector 폼 UI 확인 ---**

| 검증 항목 | 방법 | 통과 기준 |
|---------|------|----------|
| timestamp_field 입력 | 폼에서 필드 확인 | 기본값 "@timestamp" 표시, 수정 가능 |
| max_search_window_min 입력 | 폼에서 필드 확인 | 기본값 1440 표시, 5~10080 범위 검증 |
| 변환 실패 룰 경고 | 실패 룰 토글 ON | "탐지 시 자동 스킵됩니다" 경고 메시지 |
| 전체 실패 룰만 선택 경고 | 실패 룰만 선택 | "모든 규칙이 변환 실패 상태" 경고 |
| 저장 시 신규 필드 포함 | 저장 후 API 요청 확인 | request body에 timestamp_field, max_search_window_min 포함 |

- [x] 29. i18n 키 추가 (ko, en, ja, cn)
- [ ] 30. 프론트엔드 테스트 작성 (수동 검증으로 대체)

**--- 중간 테스트 3-E: 프론트엔드 자동 테스트 ---**

```bash
cd frontend && npm test -- --run
```

| 테스트 파일 | 테스트 케이스 | 통과 기준 |
|-----------|-------------|----------|
| `tests/unit/components/DetectionRuleList.test.tsx` | 변환 상태 아이콘 렌더링 | status별 올바른 아이콘 |
| `tests/unit/components/DetectionRuleDetail.test.tsx` | DSL 뷰어 렌더링 | opensearch_query JSON 표시 |
| `tests/unit/components/DetectorForm.test.tsx` | 신규 필드 렌더링 | timestamp_field, max_window 입력 존재 |
| `tests/unit/components/DetectorForm.test.tsx` | 변환 실패 경고 표시 | 실패 룰 선택 시 경고 텍스트 |
| `tests/unit/services/sigmaRuleService.test.ts` | 재변환 API 호출 | 올바른 URL, 메서드, 응답 파싱 |

---

### Phase 4: 통합 검증 (2~3일)

- [ ] 31. 전체 백엔드 테스트 실행

```bash
cd backend && pytest -v --tb=short
```

| 통과 기준 | 내용 |
|---------|------|
| 전체 통과 | 기존 + 신규 테스트 모두 PASSED |
| 커버리지 | 신규 코드 80% 이상 |
| sigma_pipeline.py | 90% 이상 |

- [ ] 32. 전체 프론트엔드 테스트 실행

```bash
cd frontend && npm test -- --run --coverage
```

- [ ] 33. 린트 및 타입 체크

```bash
cd backend && flake8 app/ && mypy app/
cd frontend && npx tsc --noEmit
```

- [ ] 34. E2E 시나리오 수동 검증

| 시나리오 | 단계 | 통과 기준 |
|---------|------|----------|
| Import → 변환 | `python scripts/import_sigma.py` 실행 | opensearch_query 필드 저장 확인 |
| 변환 통계 | 브라우저에서 통계 확인 | success/failed 수가 Import 결과와 일치 |
| Detector 생성 | UI에서 Detector 생성 | 변환 실패 룰 경고 표시, 저장 성공 |
| 탐지 실행 | 스케줄러 대기 또는 수동 트리거 | Finding 생성, 스킵 룰 로그 확인 |
| 중복 방지 | 동일 Detector 재실행 | 새 Finding 미생성 |
| 재변환 | 관리자 단건 재변환 실행 | opensearch_query 갱신, 상세 UI 반영 |

- [ ] 35. 성능 테스트

| 테스트 | 방법 | 통과 기준 |
|--------|------|----------|
| Detector 동시 실행 | 50+ Detector 활성화 후 스케줄러 실행 | 세마포어로 제한, 전체 완료, 에러 없음 |
| 벌크 재변환 | 3,113개 룰 재변환 | 5분 이내, 부분 실패 허용 |
| 쿼리 timeout | 무거운 쿼리 의도적 실행 | 30초 timeout 동작, 다른 룰 실행 무영향 |

- [ ] 36. 문서 업데이트

---

## 12. 롤백 계획

### 12.1 코드 롤백
- Git에서 이전 커밋으로 복귀
- pySigma 제거 시 `sigma_pipeline.py`가 `is_available() == False` 반환 (graceful)
- 탐지 엔진은 기존 `detection_config` fallback으로 동작 (Custom 룰 무영향)

### 12.2 데이터 롤백
```bash
# opensearch_query 등 새 필드 일괄 제거
curl -X POST "localhost:9200/cs_detection_rules/_update_by_query" \
  -d '{"script":{"source":"ctx._source.remove(\"opensearch_query\"); ctx._source.remove(\"query_conversion_status\")"}}'

# 신규 인덱스 삭제
curl -X DELETE "localhost:9200/cs_rule_reconvert_jobs"
```

### 12.3 매핑 롤백
- OpenSearch에서 매핑 필드 삭제는 불가하나, 새 필드가 있어도 기존 코드에 영향 없음

---

## 13. 다음 단계

✅ 5단계: 개발 계획 승인 (`/approve-dev-plan detector`)

---

**문서 상태:** 초안 (검토 대기)
**승인 후:** 개발 시작 가능
