# Detector 생성 폼 기획서

**작성일:** 2026-03-18
**버전:** 1.0
**상태:** 초안

---

## 1. 개요

### 1.1 목적
Detector 생성 시 로그 타입을 선택하고, 해당 로그 타입에 속하는 탐지 규칙을 필터/선택하여 연결하는 워크플로우를 제공한다.

### 1.2 범위
**포함:**
- Detector 생성 폼 UI 재설계
- 로그 타입 그룹 드롭다운 (복수 선택)
- 규칙 필터링 (검색, 심각도, Source)
- 규칙 테이블 (활성화 토글, 규칙명, 심각도, 로그타입, Source, 설명)

**제외:**
- 백엔드 API 변경 (기존 API 활용)
- 스케줄러/탐지 엔진 로직

---

## 2. 로그 타입 분류 체계

### 2.1 그룹 및 항목

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

---

## 3. UI 구조

### 3.1 Detector 생성 폼 레이아웃

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
│ [🔍 검색] [심각도 ▼] [Source ▼ (Standard/Custom)]│
│ ┌───┬──────────────┬────────┬────────┬──────┬───┐│
│ │ ⚡│ 규칙명        │ 심각도 │ 로그타입│Source│설명││
│ ├───┼──────────────┼────────┼────────┼──────┼───┤│
│ │ 🔘│ DNS Query... │ Medium │ DNS    │Sigma │...││
│ │ 🔘│ Network...   │ High   │Network │Custom│...││
│ └───┴──────────────┴────────┴────────┴──────┴───┘│
│                                                  │
│ ── 스케줄 ──                                     │
│ [실행 주기(분)]                                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.2 규칙 테이블 컬럼

| 컬럼 | 설명 | 너비 |
|------|------|------|
| 활성화 토글 | 해당 규칙을 Detector에 연결할지 on/off | 고정 50px |
| 규칙명 | 규칙 이름 (ellipsis) | flex |
| 심각도 | SeverityChip 표시 | 80px |
| 로그 타입 | log_source_category or product | 100px |
| Source | Standard(Sigma) / Custom | 80px |
| 설명 | 규칙 설명 (ellipsis) | flex |

### 3.3 필터 동작

- **로그 타입 선택** → 해당 로그 타입의 규칙만 테이블에 표시
- **검색** → 규칙명/설명에서 텍스트 검색
- **심각도 드롭다운** → critical/high/medium/low/info 필터
- **Source 드롭다운** → Standard(type=sigma) / Custom(type=custom) 필터

### 3.4 규칙 ↔ 로그 타입 매핑

규칙의 `log_source_category`, `log_source_product`, `log_source_service` 필드를 기반으로 로그 타입 매핑:

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

## 4. 데이터 흐름

### 4.1 저장 시 생성되는 Detector 데이터

```json
{
  "name": "사용자 입력",
  "description": "사용자 입력",
  "detector_type": "선택된 로그타입 중 첫번째 or 'multi'",
  "target_indices": ["logs-*"],
  "linked_rule_ids": ["토글 ON된 규칙 ID 목록"],
  "schedule_interval_min": 5,
  "severity": "연결된 규칙 중 최고 심각도 자동 설정",
  "is_active": true
}
```

---

## 5. 구현 계획

### Phase 1: 로그 타입 상수 및 매핑 유틸
- 로그 타입 그룹/항목 상수 정의
- 규칙 → 로그 타입 매핑 함수

### Phase 2: DetectorForm 재설계
- 기본 정보 (이름, 설명)
- 로그 타입 멀티셀렉트 드롭다운
- 규칙 테이블 + 필터
- 스케줄 설정

### Phase 3: 연동
- DetectionRuleTab에서 체크된 규칙 → DetectorForm 프리셋 유지
- 저장 시 linked_rule_ids 구성

---

## 6. 디텍션 룰 실행 워크플로우

> **목적:** 현재 저장만 되어 있는 Sigma 디텍션 룰이 실제로 OpenSearch 로그에 대해 **탐지를 수행**할 수 있도록 전체 파이프라인을 설계한다.

### 6.1 현재 상태 분석 — 왜 Sigma 룰이 동작하지 않는가

#### 문제 1: Sigma 문법 ≠ OpenSearch DSL

Sigma 룰의 `detection` 블록은 **Sigma 고유 문법**으로 작성된다:

```yaml
detection:
  selection:
    CommandLine|contains: 'echo '
    CommandLine|contains|expand: '%userdomain%'
  condition: selection
```

이것이 `detection_config`에 그대로 저장된다:

```json
{
  "selection": {
    "CommandLine|contains": "echo ",
    "CommandLine|contains|expand": "%userdomain%"
  },
  "condition": "selection"
}
```

탐지 엔진(`_run_rule_against_indices`)은 이 JSON을 **OpenSearch DSL로 간주하고 `client.search(body=...)`에 직접 전달**한다.
OpenSearch는 `selection`, `condition`, `|contains` 같은 Sigma 키워드를 이해하지 못하므로 **쿼리 실패 또는 빈 결과**를 반환한다.

#### 문제 2: 로그 소스 → 인덱스 매핑 부재

Sigma 룰은 `logsource`로 대상을 지정하지만, 실제 OpenSearch 인덱스 패턴(예: `logs-windows-*`)으로의 매핑이 없다.

#### 문제 3: 필드명 불일치

| Sigma 필드명 | 실제 로그 필드명 (ECS) |
|-------------|----------------------|
| `CommandLine` | `process.command_line` |
| `ParentImage` | `process.parent.executable` |
| `TargetFilename` | `file.path` |
| `SourceIP` | `source.ip` |
| `User` | `user.name` |

현재 `field_mappings`가 Detector 단위로 존재하지만, **UI 편집기가 미구현**이고 매핑 데이터도 비어있다.

#### 현재 동작 가능한 것 vs 불가능한 것

| 항목 | Custom 룰 | Sigma 룰 |
|------|----------|----------|
| detection_config 형식 | OpenSearch DSL (직접 작성) | Sigma 문법 (변환 필요) |
| 탐지 엔진 실행 | **동작** | **실패** |
| 필드명 | 사용자가 실제 필드명 직접 입력 | Sigma 표준 필드명 (매핑 필요) |

---

### 6.2 핵심 과제: Sigma → OpenSearch DSL 변환

#### 방안 A: pySigma 라이브러리 활용 (권장)

**필요 패키지:**

```
pySigma                       # Sigma 코어 변환 엔진
pySigma-backend-opensearch    # OpenSearch DSL 출력 백엔드
pySigma-pipeline-ecs-windows  # ECS Windows 필드 매핑 파이프라인 (선택)
pySigma-pipeline-sysmon       # Sysmon 필드 매핑 파이프라인 (선택)
```

**변환 예시:**

```python
from sigma.rule import SigmaRule
from sigma.backends.opensearch import OpensearchLuceneBackend
from sigma.pipelines.ecs_windows import ecs_windows_pipeline

rule = SigmaRule.from_yaml("""
title: Suspicious Process Creation
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains: 'powershell -enc'
    condition: selection
level: high
""")

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

#### 방안 B: 자체 변환기 구현

| 구현 항목 | 예상 공수 | 복잡도 |
|----------|---------|--------|
| 기본 선택자 (exact, contains, startswith, endswith) | 2일 | 낮음 |
| condition 파서 (and, or, not, 1 of, all of) | 3일 | 중간 |
| 정규식, base64, CIDR 수식어 | 2일 | 중간 |
| 집계 조건 (count, min, max, avg, sum) | 3일 | 높음 |
| near 연산자 (시간 기반 상관관계) | 5일 | 매우 높음 |
| **합계** | **~15일** | — |

**결론: 방안 A(pySigma) 권장.** Sigma 커뮤니티가 지속적으로 업데이트하며, 3,700+ 룰의 수식어를 모두 커버.

---

### 6.3 변환 시점 설계

#### Import 시 변환 (Pre-conversion) — 권장

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

**cs_detection_rules 스키마 확장:**

```json
{
  "detection_config": { ... },           // 원본 Sigma detection 블록 (보존)
  "opensearch_query": { ... },           // 변환된 OpenSearch DSL (실행용)
  "query_conversion_status": "keyword",  // "success" | "failed" | "unsupported" | null
  "query_conversion_error": "text",      // 변환 실패 시 에러 메시지
  "query_pipeline_id": "keyword"         // 사용된 파이프라인 ID (재변환 추적용)
}
```

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
        }
    except Exception as e:
        return {
            "opensearch_query": None,
            "query_conversion_status": "failed",
            "query_conversion_error": str(e),
        }
```

---

### 6.4 로그 소스 → 인덱스 매핑

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

**관리 방법:**
1. `cs_logsource_mappings` 인덱스 — 관리자가 UI에서 편집 (향후)
2. `backend/config/logsource_mappings.yaml` — 배포 시 환경에 맞게 수정
3. 환경변수 또는 `.env` — 간단한 오버라이드

---

### 6.5 필드 매핑 파이프라인

#### pySigma Processing Pipeline

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

#### 수집 파이프라인별 전략

| 수집 방식 | 필드 형식 | pySigma 파이프라인 |
|----------|---------|-------------------|
| Winlogbeat (ECS) | `process.command_line` | `ecs_windows_pipeline()` |
| Sysmon via Vector | `sysmon.CommandLine` 또는 ECS | 커스텀 파이프라인 |
| SentinelOne EDR | `ThreatInfo.*`, `AgentInfo.*` | 커스텀 파이프라인 |
| CloudTrail | `eventName`, `sourceIPAddress` | 커스텀 파이프라인 |

---

### 6.6 End-to-End 실행 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                Phase 1: 규칙 등록 (Import / Create)               │
│                                                                  │
│  [Sigma 룰 Import]                                                │
│  YAML → parse_sigma_yaml() → pySigma 변환 → cs_detection_rules   │
│    ├── detection_config: 원본 Sigma detection (보존)               │
│    ├── opensearch_query: 변환된 OpenSearch DSL (실행용)            │
│    └── query_conversion_status: success/failed                    │
│                                                                  │
│  [Custom 룰] Monaco Editor → detection_config = opensearch_query  │
├─────────────────────────────────────────────────────────────────┤
│                Phase 2: Detector 구성                              │
│                                                                  │
│  1. Detector 이름/설명 입력                                        │
│  2. 로그 타입 선택 → target_indices 자동 추천                      │
│  3. 규칙 선택 (변환 실패 규칙은 경고 표시)                         │
│  4. 필드 매핑 편집 (선택사항)                                      │
│  5. 실행 주기, 트리거 조건, 메시지 템플릿 설정                     │
├─────────────────────────────────────────────────────────────────┤
│                Phase 3: 탐지 실행 (스케줄러)                        │
│                                                                  │
│  DetectionScheduler (매 1분 폴링)                                  │
│    → 활성 Detector 조회 → schedule_interval_min 경과 확인          │
│    → run_detection_for_detector:                                   │
│       1. linked_rule_ids → 활성 규칙 조회                          │
│       2. opensearch_query 가져오기 (fallback: detection_config)     │
│       3. field_mappings 추가 적용                                  │
│       4. 시간 범위 필터: @timestamp { gte: last_run_at, lte: now } │
│       5. target_indices에 대해 OpenSearch 검색                     │
│       6. trigger_condition 평가 → 매칭 시 Finding 생성             │
├─────────────────────────────────────────────────────────────────┤
│                Phase 4: 결과 처리 및 알림                          │
│                                                                  │
│  Finding → cs_detection_events 저장                                │
│  → Detector last_triggered_at, total_findings_count 갱신           │
│  → WebSocket 실시간 알림 (향후)                                    │
│  → Webhook / 알림센터 연동 (향후)                                  │
│                                                                  │
│  사용자: Finding 확인 → new → acknowledged → resolved              │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.7 시간 범위 필터 (중복 탐지 방지)

현재 탐지 엔진은 시간 범위 필터 없이 전체 로그를 검색하므로 동일 로그에 대해 반복 탐지가 발생한다.

```python
# 시간 윈도우 기반 검색 추가
time_filter = {
    "range": {
        "@timestamp": {
            "gte": last_run_at or "now-5m",
            "lte": "now"
        }
    }
}
# 기존 쿼리에 AND 조건으로 추가
search_body = {
    "query": {
        "bool": {
            "must": [query["query"], time_filter]
        }
    }
}
```

**타임스탬프 필드:** 기본 `@timestamp`, Detector별 커스텀 설정 가능 (향후)

---

### 6.8 데이터 파이프라인 확인사항

#### 현재 데이터 소스

| 소스 | 인덱스 | 수집 경로 |
|------|--------|----------|
| SentinelOne Threats | `logs-sentinel_one.threats` | Kafka → Vector → OS |
| SentinelOne Agents | `logs-sentinel_one.agents` | Kafka → Vector → OS |
| SentinelOne EDR | `logs-sentinel_one.edr` | Kafka → Vector → OS |
| Heartbeat | `heartbeat` | Heartbeat Agent → OS |

#### 추가 확보 필요 (우선순위)

| 우선순위 | 로그 소스 | Sigma 룰 수 (추정) | 수집 방법 예시 |
|---------|----------|------------------|-------------|
| **1** | Windows Event Log (Sysmon) | ~2,000+ | Winlogbeat / NXLog → Kafka → Vector → OS |
| **2** | Windows Security Log | ~500+ | Winlogbeat → Kafka → Vector → OS |
| **3** | Linux Auditd / Syslog | ~200+ | Filebeat / Vector → Kafka → OS |
| **4** | AWS CloudTrail | ~100+ | S3 → Lambda/Filebeat → Kafka → OS |
| **5** | Azure AD / Sign-in | ~80+ | Azure Event Hub → Filebeat → Kafka → OS |
| **6** | DNS / Firewall / Proxy | ~100+ | Syslog / Packetbeat → Vector → OS |

---

## 7. 탐지 엔진 수정안

```python
async def _run_rule_against_indices(self, detector, rule, target_indices, field_mappings):
    # 1. 실행할 쿼리 결정 (opensearch_query 우선, fallback detection_config)
    query = rule.get("opensearch_query")
    if not query:
        query = rule.get("detection_config", {})
        if not query:
            return None
        # Sigma 문법 감지 → 미변환 룰 스킵
        if "condition" in query or "selection" in query:
            logger.warning(f"룰 {rule['id']}: Sigma 문법 미변환 상태, 스킵")
            return None

    # 2. 런타임 필드 매핑 오버라이드
    if field_mappings:
        query = self._apply_field_mappings(query, field_mappings)

    # 3. 시간 범위 필터 (중복 탐지 방지)
    last_run_at = detector.get("last_run_at")
    time_filter = {"range": {"@timestamp": {"gte": last_run_at or "now-5m", "lte": "now"}}}

    if "query" in query:
        search_body = {
            "query": {"bool": {"must": [query["query"], time_filter]}},
            "size": 10,
            "sort": [{"@timestamp": {"order": "desc"}}]
        }
    else:
        search_body = {
            "query": {"bool": {"must": [query, time_filter]}},
            "size": 10,
            "sort": [{"@timestamp": {"order": "desc"}}]
        }

    # 4. OpenSearch 검색 실행
    index_pattern = ",".join(target_indices) if target_indices else "logs-*"
    result = await self._execute_search(index_pattern, search_body)
    # 5. 결과 처리 (기존 로직 동일)
    ...
```

---

## 8. 설정 관리 구조 (향후)

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

## 9. 구현 로드맵

### Phase 1: 기반 구축 (1~2주)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| pySigma 설치 | `pip install pySigma pySigma-backend-opensearch` | `requirements.txt` |
| 기본 파이프라인 | ECS 필드 매핑 + logsource → index 매핑 | `app/core/sigma_pipeline.py` (신규) |
| import_sigma.py 수정 | Import 시 pySigma 변환 + opensearch_query 저장 | `scripts/import_sigma.py` |
| 스키마 확장 | opensearch_query, query_conversion_status 추가 | `schemas/sigma_rule.py` |
| 인덱스 매핑 확장 | cs_detection_rules에 새 필드 | `opensearch_setup/` |
| 재변환 스크립트 | 기존 룰에 opensearch_query 일괄 생성 | `scripts/reconvert_rules.py` (신규) |

### Phase 2: 탐지 엔진 개선 (1주)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| 탐지 엔진 수정 | opensearch_query 우선, fallback detection_config | `services/detection_policy.py` |
| 시간 범위 필터 | last_run_at ~ now 구간만 검색 | `services/detection_policy.py` |
| 변환 실패 스킵 | query_conversion_status=failed 룰 스킵 + 로깅 | `services/detection_policy.py` |
| 테스트 | Sigma 변환 + 실행 통합 테스트 | `tests/` |

### Phase 3: UI 연동 (1~2주)

| 태스크 | 설명 | 파일 |
|--------|------|------|
| DSL 미리보기 | DetectionRuleDetail에 opensearch_query 표시 | `DetectionRuleDetail.tsx` |
| 변환 상태 표시 | 변환 실패 규칙에 경고 아이콘 | `DetectionRuleList.tsx` |
| target_indices 자동 추천 | logsource 매핑 기반 | `DetectorForm.tsx` |
| 필드 매핑 편집기 | field_mappings UI | `DetectorForm.tsx` |
| 쿼리 테스트 연결 | 변환된 DSL로 test-query API 호출 | `DetectorForm.tsx` |

### Phase 4: 운영 고도화 (2~3주)

| 태스크 | 설명 |
|--------|------|
| 로그소스 매핑 관리 UI | 관리자가 logsource → index 매핑 편집 |
| 필드 매핑 관리 UI | 전역 필드 매핑 편집 |
| 파이프라인 프로파일 | 환경별(ECS, Sysmon, SentinelOne) 프리셋 |
| WebSocket 알림 연동 | Finding 생성 시 실시간 알림 |
| 알림센터 통합 | 기존 NotificationService와 통합 |
| 탐지 대시보드 | 통계, 시간대별 추이, MITRE 히트맵 |
| 벌크 재변환 UI | 파이프라인 변경 시 전체 규칙 재변환 |

---

## 10. 테스트 검증 전략

### 단위 테스트

| 테스트 대상 | 검증 내용 |
|-----------|---------|
| pySigma 변환 | 주요 Sigma 수식어가 올바른 DSL로 변환되는지 |
| 필드 매핑 | Sigma 필드명 → 실제 필드명 정확히 치환되는지 |
| 시간 필터 | last_run_at 기반 시간 범위가 정확히 적용되는지 |
| 트리거 조건 | AST 평가기가 변환된 DSL 결과에 대해 동작하는지 |

### 통합 테스트

| 시나리오 | 방법 |
|---------|------|
| Sigma 룰 Import → 변환 → 저장 | 샘플 YAML Import 후 opensearch_query 필드 확인 |
| 변환된 DSL 실행 | 테스트 로그 삽입 → Detector 실행 → Finding 생성 확인 |
| 중복 탐지 방지 | 동일 Detector 2회 연속 실행 → 2번째 Finding 미생성 확인 |
| Custom 룰 호환성 | 기존 Custom 룰 동작에 영향 없는지 확인 |

### 로그 데이터 시뮬레이터

```python
# scripts/generate_test_logs.py
test_events = [
    {
        "@timestamp": datetime.utcnow().isoformat(),
        "process": {
            "command_line": "powershell -enc SQBFAFgA...",
            "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "parent": {"executable": "C:\\Windows\\explorer.exe"},
        },
        "user": {"name": "admin"},
        "event": {"action": "process_creation"},
    },
]
```

---

## 11. 요약

| 과제 | 해결 방안 | 상태 |
|------|---------|------|
| Sigma → OpenSearch DSL 변환 | pySigma + opensearch backend | 미구현 |
| 로그소스 → 인덱스 매핑 | cs_logsource_mappings / 설정 파일 | 미구현 |
| 필드명 매핑 | pySigma Processing Pipeline | 미구현 |
| 변환 시점 | Import 시 Pre-conversion | 미구현 |
| 시간 범위 필터 | last_run_at ~ now 윈도우 검색 | 미구현 |
| 추가 로그 소스 | Windows/Linux/Cloud 수집 파이프라인 | 미구축 |
| 필드 매핑 UI | DetectorForm에 매핑 편집기 | 미구현 |
| 탐지 대시보드 | 통계/추이/MITRE 히트맵 | 미구현 |
