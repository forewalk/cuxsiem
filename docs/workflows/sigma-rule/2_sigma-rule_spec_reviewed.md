# Sigma Rule 적재 및 관리 기능 기획서 검토 결과

**검토일:** 2026-03-17
**검토자:** AI
**원본 기획서:** `1_sigma-rule_spec.md`
**상태:** 검토 완료

---

## 📋 검토 요약

### 전체 평가
기획서의 범위 설정(적재 및 조회까지만, 탐지 엔진 분리)이 적절하며, 하이브리드 저장 전략(YML 시드 + OpenSearch 런타임)은 온프레미스 환경에 맞는 현실적인 설계이다. 데이터 매핑 테이블이 구체적이고 Sigma 공식 스펙의 핵심 필드를 잘 커버하고 있다. 다만 기존 프론트엔드 목업과의 데이터 모델 정합성, API 경로 네이밍, 중복 적재 전략 등에서 명확화가 필요하다.

### 주요 발견사항
- ✅ 잘 작성된 부분: 범위 설정(포함/제외 명확), 데이터 매핑 테이블, 하이브리드 저장 전략, 시나리오 분리
- ⚠️ 개선 필요 부분: 프론트엔드 기존 타입과 데이터 모델 불일치, API 경로 네이밍, Import 중복 처리 전략 미정의
- ❌ 누락된 부분: 삭제 API 엔드포인트, 프론트엔드 서비스 레이어 설계, OpenSearch 인덱스 초기화 스크립트 위치, 기존 목업 데이터 전환 전략

---

## 1. 요구사항 완전성 검토

### 1.1 기능 요구사항 분석

**명확성:**
- Must Have 7개 항목이 구체적이며 각 항목의 범위가 명확함
- Import 스크립트의 실행 방식(CLI)과 API 엔드포인트가 구분되어 있어 좋음

**완전성:**
- 삭제(DELETE) API가 누락됨 — 기존 프로젝트 패턴(RESTful CRUD)에서 Soft Delete는 기본 요구사항
- 프론트엔드 서비스 레이어(`detectionRuleService.ts` 또는 `sigmaRuleService.ts`) 파일 생성이 기능 요구사항에 명시되지 않음
- 프론트엔드 타입 정의를 `types/index.ts`로 이동하는 작업이 누락됨 (현재 컴포넌트 내부에 인라인 정의)

**추가 필요 기능:**
- DELETE `/api/v1/sigma-rules/{id}` — Soft Delete (204)
- 프론트엔드 서비스 파일 생성 및 API 연동
- 기존 8건 목업 데이터 → 실제 API 데이터 전환 계획

### 1.2 비기능 요구사항 분석

**성능 요구사항:**
- 현재 상태: 목록 조회 < 500ms, Import 500건 < 30초 — 합리적인 기준
- 제안 사항: OpenSearch의 `_bulk` API를 활용하면 500건 적재가 5초 이내로 가능. 현재 기준이 충분히 보수적임

**보안 요구사항:**
- 현재 상태: JWT 인증, 로그인 사용자 접근 제어 — 기존 시스템과 일관적
- 제안 사항: Import 스크립트(CLI)는 인증 없이 실행되므로 서버 접근 권한으로 대체. REST API Import는 JWT 필수

**확장성 고려:**
- 현재 상태: 탐지 엔진 연동을 위한 필드 확보 언급 — 적절
- 제안 사항: `detection_config` 필드에 원본 Sigma detection 블록을 보존하므로, 향후 Sigma→OpenSearch DSL 변환 엔진이 이 필드를 직접 활용할 수 있어 확장성 확보됨

---

## 2. 기술적 실현 가능성 평가

### 2.1 현재 시스템과의 호환성

**기존 아키텍처:**
- FastAPI + OpenSearch + opensearch-py 환경에서 완벽히 구현 가능
- 기존 레이어 구조(Repository → Service → Endpoint)와 100% 호환 — `notification.py` 패턴을 그대로 따를 수 있음
- 알림 규칙(`notification.py`)이 Model 레이어 없이 Schema + Repository + Service + Endpoint로 구현되어 있어, Sigma Rule도 동일 패턴 적용 가능

**OpenSearch:**
- `cs_sigma_rules` 인덱스를 `scripts/opensearch_setup/1_index_cruxsiem.json`에 추가 필요
- 기존 인덱스 설정 패턴(shards, replicas, mappings)과 일관성 유지
- Soft Delete(`deleted_at` 필드)는 기존 패턴과 동일

**API 구조:**
- RESTful 원칙 준수: GET(목록/단건), PUT(토글), DELETE(삭제) — 기존 패턴과 일치
- `endpoints/__init__.py`에 새 라우터 등록 필요

### 2.2 필요한 외부 의존성
- 필수: `PyYAML` — Sigma YAML 파싱 (현재 `requirements.txt`에 없음, 추가 필요)
- 선택: 없음 (`ruamel.yaml`은 YAML 1.2 지원이 필요할 때만)

### 2.3 예상되는 기술적 도전과제
1. **Sigma YAML 구조 다양성**: Sigma 룰의 `detection` 블록이 룰마다 구조가 상이함 (selection, condition, filter 조합). 파싱 시 원본 보존(`detection_config`) + 메타데이터 추출 분리 전략 필요
2. **MITRE 태그 파싱**: Sigma 태그 형식(`attack.execution`, `attack.t1059.001`)에서 전술/기술 ID를 정확히 분리해야 함. 정규식 기반 파싱 필요
3. **재적재(Re-import) 시 기존 데이터 처리**: `sigma_id`(UUID)로 중복 감지 후 업데이트/스킵 전략 결정 필요

---

## 3. 보안 및 성능 고려사항

### 3.1 보안 취약점 분석

**인증/인가:**
- REST API는 기존 JWT 미들웨어 재사용으로 충분
- CLI Import 스크립트는 서버 로컬 실행이므로 별도 인증 불필요

**데이터 보호:**
- Sigma 룰 자체는 민감 데이터가 아님 (공개 룰셋 기반)
- `raw_yaml` 필드에 원본 저장 시 보안 위험 없음

**입력 검증:**
- YAML 파싱 시 악의적 YAML(YAML bomb, 임의 코드 실행) 방어 필요
- PyYAML의 `yaml.safe_load()` 필수 사용 (`yaml.load()` 금지)

**권장 보안 조치:**
1. YAML 파싱 시 `yaml.safe_load()` 강제 사용
2. YAML 파일 크기 제한 (예: 1MB 이하)

### 3.2 성능 최적화 제안

**OpenSearch:**
- 인덱스 전략: `name`(text+keyword), `severity`(keyword), `mitre_technique_ids`(keyword), `is_active`(boolean) — 필터 조건 필드에 keyword 타입 적용 완료
- 벌크 적재: OpenSearch `_bulk` API로 일괄 처리 (건별 API 호출 대비 10x 이상 성능)

**API 성능:**
- 캐싱: 룰 목록이 자주 변경되지 않으므로 메모리 캐시 고려 가능 (선택)
- 페이지네이션: `from` + `size` 기반 (기존 알림 규칙과 동일)

**예상 병목 지점:**
- YAML 파일 500개 일괄 파싱 시 I/O — asyncio 또는 bulk 처리로 해결 가능

---

## 4. 사용자 시나리오 검증

### 4.1 시나리오 완전성

**누락된 시나리오:**
1. **재적재 시나리오**: Sigma YAML 파일이 업데이트되어 다시 Import할 때의 동작 (업데이트? 스킵? 버전 관리?)
2. **룰 삭제 시나리오**: 관리자가 특정 룰을 비활성화가 아닌 완전히 삭제(Soft Delete)하는 경우
3. **빈 목록 시나리오**: Import 전 상태에서 UI 진입 시 안내 메시지

**추가 필요 예외 상황:**
1. OpenSearch 연결 실패 시 Import 스크립트의 에러 처리
2. 필수 필드(`title`, `level`, `logsource`, `detection`)가 누락된 YAML 파일 처리

### 4.2 엣지 케이스
1. 동일 `sigma_id`를 가진 YAML 파일이 여러 개 존재하는 경우
2. `level` 필드가 없거나 비표준 값인 경우 (기본값 설정 필요)
3. `tags` 필드가 없는 룰 — MITRE 매핑이 빈 배열이 되어야 함
4. 매우 긴 `detection` 블록 (복잡한 룰) — `raw_yaml` 저장 및 UI 렌더링 성능

```

1. 재적재 시나리오

이건 무조건 Upsert + Revision 관리로 가는 게 좋다.

내가 추천하는 동작

같은 sigma_id 기준으로 비교한다.

경우 1: 기존에 없는 룰
신규 생성
status = active
revision = 1
경우 2: 기존에 있고 내용 동일
skip
import_result = unchanged
경우 3: 기존에 있고 내용 변경
update
revision += 1
updated_at 갱신
이전 raw_yaml/history 보존

즉 정책은 이거다.

same sigma_id + same content     -> skip
same sigma_id + changed content  -> update
new sigma_id                     -> insert
비교 기준

비교는 raw_yaml 문자열 그대로보다
정규화된 content hash를 두는 게 좋다.

예:

YAML 파싱

key ordering 정리

normalized JSON 생성

content_hash 저장

필드 예:

{
  "sigma_id": "8f1a9c",
  "content_hash": "abc123",
  "revision": 3
}
버전 관리 추천안

두 가지 중 선택이다.

A안. 현재 문서만 유지

현재 인덱스에는 최신본만 저장

별도 history 인덱스에 revision 저장

추천.

B안. 매 revision마다 새 문서

조회 복잡해짐

UI 불편

비추천.

내가 추천하는 인덱스 구조
cs_detection_rules

최신본

cs_detection_rule_history

이력본

2. 룰 삭제 시나리오

이건 soft delete가 맞다.

왜냐하면:

Detector가 참조 중일 수 있음

감사 이력이 필요함

나중에 복구할 수 있어야 함

추천 상태값
active
inactive
deleted
import_error
deprecated

삭제 시 동작:

is_deleted = true
status = deleted
deleted_at 저장
deleted_by 저장
중요한 정책
삭제된 룰은 UI에서 기본 숨김

하지만 관리자 필터로 조회 가능

Detector에 이미 연결된 룰이면

바로 삭제하지 말고:

삭제 가능

다만 used_by_detector_count > 0 경고 표시

또는 더 엄격하게:

연결 중이면 삭제 금지

먼저 Detector에서 제거 필요

내 추천은 삭제 허용 + 경고 표시다.

3. 빈 목록 시나리오

이건 UI에서 명확하게 안내해야 한다.

메시지 예시
등록된 탐지 규칙이 없습니다.
Sigma Rule Import를 먼저 실행해주세요.

버튼:

[룰 가져오기]

폐쇄망이면 더 구체적으로:

현재 Rule Library가 비어 있습니다.
외부 저장소에서 반입한 Sigma Rule 패키지를 Import 해주세요.

즉 빈 목록은 에러가 아니라 초기 상태로 취급한다.

4. OpenSearch 연결 실패 시 Import 에러 처리

이건 Import 전체 실패로 명확히 처리해야 한다.

추천 방식

Import 시작 전에 헬스체크:

1. OpenSearch 연결 확인
2. 대상 인덱스 존재 여부 확인
3. 쓰기 가능 여부 확인

실패 시:

import_job status = failed
error_code = OPENSEARCH_CONNECTION_FAILED
error_message 저장
룰 단위 import 진행하지 않음

즉 연결 실패는 job-level failure다.

추가 추천

import_job 개념을 두는 게 좋다.

cs_rule_import_jobs

필드 예:

{
  "job_id": "import-20260317-001",
  "status": "failed",
  "total_files": 120,
  "processed_files": 0,
  "success_count": 0,
  "skip_count": 0,
  "error_count": 120,
  "error_message": "OpenSearch connection failed"
}

이게 있으면 UI와 운영이 훨씬 편하다.

5. 필수 필드 누락 YAML 처리

이건 룰 단위 validation error로 처리한다.

필수 필드:

title
level
logsource
detection

정책은 이렇게 간다.

title 누락

에러, import 실패

logsource 누락

에러, import 실패

detection 누락

에러, import 실패

level 누락

완전 실패로 볼지 기본값 줄지 선택 가능
나는 기본값 부여 + warning 추천

처리 결과
invalid file -> skip import
error log 저장
import_job.error_count 증가

즉 전체 job은 계속 가고, 그 룰만 실패 처리한다.

6. 동일 sigma_id를 가진 YAML 여러 개 존재

이건 반드시 정책이 있어야 한다.

추천 정책

sigma_id는 논리적 유니크 키로 본다.

같은 sigma_id가 여러 파일에 있으면:

경우 1: content 동일

중복 파일로 간주

하나만 import

나머지 skip with warning

경우 2: content 다름

충돌

import_error 처리

관리자 검토 필요

즉

same sigma_id + different content = conflict
이유

이걸 자동 update 처리해버리면
어느 파일이 진짜인지 알 수 없다.

그래서 이런 경우는:

status = conflict

또는 import job 로그에 남기고 둘 다 반영 안 하는 게 안전하다.

7. level 필드가 없거나 비표준 값인 경우

이건 normalize 레이어에서 처리한다.

추천 severity 매핑
critical -> critical
high     -> high
medium   -> medium
low      -> low
informational -> info
level 누락
default = medium
warning 남김
비표준 값

예: severe, warning, notice

정책:

normalize table 있으면 변환
없으면 default = medium + original_level 저장
추천 필드
{
  "level_original": "warning",
  "level_normalized": "medium"
}

이렇게 두 개 저장하면 나중에 추적 가능하다.

8. tags 없는 룰

이건 간단하다.

정답은 네 말대로:

tags = []
mitre_attack = []

즉 null 말고 빈 배열로 통일하는 게 좋다.

왜냐하면 UI와 필터 로직이 단순해진다.

추천 파생 필드
{
  "tags": [],
  "mitre_tactics": [],
  "mitre_techniques": []
}

Sigma tags에서 attack. 계열만 파싱해서 따로 저장하면 UI에서 쓰기 좋다.

9. 매우 긴 detection 블록 처리

이건 반드시 raw_yaml 저장이 있어야 한다.

그리고 UI에는 두 가지를 분리해서 준다.

저장

raw_yaml

detection parsed object

detection_text_preview optional

UI

기본은 접힌 상태

show more

code viewer/monaco/json viewer

virtualization은 필요 없고 lazy render 정도면 충분

성능 관점 추천

리스트 API에서는 절대 raw_yaml 전체를 주지 말고
상세 API에서만 준다.

리스트 응답
name
severity
logsource
tags
status
updated_at
상세 응답
+ raw_yaml
+ detection
+ references
+ falsepositives

이렇게 분리해야 한다.

10. 내가 실제로 잡을 상태 머신

룰 상태를 명확히 두는 게 좋다.

Rule 상태
active
inactive
deleted
deprecated
conflict
invalid
Import 결과
inserted
updated
skipped
failed
conflict

이걸 분리해야 한다.

왜냐하면:

룰 자체 상태

import 작업 결과

는 다른 개념이기 때문이다.

11. 내가 추천하는 최종 정책표
재적재

동일 sigma_id + 동일 content: skip

동일 sigma_id + 변경 content: update + revision 증가

신규 sigma_id: insert

삭제

hard delete 금지

is_deleted = true, status = deleted

빈 목록

초기 상태 메시지 + import 유도 버튼

OpenSearch 연결 실패

import job 전체 실패

필수 필드 누락

해당 파일만 실패

job은 계속 진행

동일 sigma_id 중복

동일 content: warning + skip

다른 content: conflict

level 누락/비표준

normalize

없으면 medium

tags 없음

빈 배열

detection 길이 큼

raw_yaml 저장

상세 API에서만 렌더

12. 추가로 있으면 좋은 것

이 정도면 거의 운영 가능하지만, 하나 더 넣으면 좋다.

Import Preview

실제 반영 전 미리 보여주기

예:

신규 25건
업데이트 4건
스킵 101건
충돌 2건
실패 3건

이건 관리자 입장에서 매우 유용하다.

13. 한 줄 결론

이 상황에서는 “룰 문서 관리 시스템”처럼 생각해야 한다.
즉 단순 적재가 아니라,

검증
정규화
upsert
revision 관리
soft delete
job logging

까지 있어야 한다.

```

---

## 5. 데이터 모델 검토

### 5.1 기존 프론트엔드 타입과의 정합성 분석

현재 프론트엔드 `DetectionRuleData` 인터페이스(DetectionRuleDetail.tsx):

```typescript
interface DetectionRuleData {
  id: string;
  name: string;
  logType: string;         // ← spec: log_source_product + log_source_category
  description: string;
  lastUpdated: string;     // ← spec: updated_at
  author: string;
  source: string;          // ← spec에 없음 (Sigma의 related 또는 출처)
  license: string;         // ← spec에 없음 (Sigma의 license 필드)
  severity: string;
  tags: string[];
  references: string[];    // ← spec에 없음 (Sigma의 references 필드)
  falsePositives: string[];
  ruleStatus: string;      // ← spec: sigma_status
  detection: string;       // ← spec: detection_config (object) vs UI는 string
  enabled: boolean;
}
```

**불일치 항목:**

| 프론트엔드 필드 | 기획서 매핑 | 문제 |
|----------------|-----------|------|
| `source` | 없음 | Sigma의 `related` 또는 파일 출처 정보 필요 |
| `license` | 없음 | Sigma YAML에 `license` 필드 있음 — 매핑 추가 필요 |
| `references` | 없음 | Sigma YAML에 `references` 필드 있음 — 매핑 추가 필요 |
| `logType` | `log_source_product` | 단일 문자열 vs 3개 분리 필드 — API 응답에서 조합 필요 |
| `detection` | `detection_config` (object) | UI는 YAML 문자열을 `<pre>`로 표시, API는 detection_config를 raw_yaml 또는 문자열로 제공 필요 |

### 5.2 OpenSearch 인덱스 설계 제안

기획서의 매핑 테이블에 **추가 필요한 필드**:

```json
{
  "mappings": {
    "properties": {
      "id":                    { "type": "keyword" },
      "sigma_id":              { "type": "keyword" },
      "name":                  { "type": "text", "fields": { "keyword": { "type": "keyword" } } },//ignore_above 256추가
      "description":           { "type": "text" }, // 멀티 type:keyword, ignore_above 256 추가
      "severity":              { "type": "keyword" },
      "sigma_status":          { "type": "keyword" }, // 시그마 스태이터스는 뭐임?
      "author":                { "type": "keyword" }, // 멀티 type:keyword, ignore_above 256 추가
      "sigma_date":            { "type": "keyword" }, 
      "references":            { "type": "keyword" },
      "license":               { "type": "keyword" },
      "log_source_category":   { "type": "keyword" },
      "log_source_product":    { "type": "keyword" },
      "log_source_service":    { "type": "keyword" },
      "detection_config":      { "type": "object", "enabled": false },
      "tags":                  { "type": "keyword" },
      "mitre_technique_ids":   { "type": "keyword" },
      "mitre_tactic_ids":      { "type": "keyword" },
      "false_positives":       { "type": "text" },
      "is_active":             { "type": "boolean" },
      "raw_yaml":              { "type": "text", "index": false }, //오브젝트가 낫지않나? enable도 false 추가하고
      "file_path":             { "type": "keyword" },
      "created_at":            { "type": "date" },
      "updated_at":            { "type": "date" },
      "deleted_at":            { "type": "date" }
    }
  }
}
```

변경사항:
- `references`, `license` 필드 추가 (프론트엔드 정합성)
- `sigma_date`를 `keyword`로 변경 (Sigma YAML의 날짜 형식이 비표준일 수 있음)
- `detection_config`를 `"enabled": false`로 설정 (검색 불필요, 저장만)
- `raw_yaml`을 `"index": false`로 설정 (검색 불필요, 조회만)

### 5.3 Pydantic 스키마 제안

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SigmaRuleBase(BaseModel):
    name: str
    sigma_id: str
    description: Optional[str] = None
    severity: str = "medium"
    sigma_status: Optional[str] = None
    author: Optional[str] = None
    sigma_date: Optional[str] = None
    references: List[str] = []
    license: Optional[str] = None
    log_source_category: Optional[str] = None
    log_source_product: Optional[str] = None
    log_source_service: Optional[str] = None
    detection_config: Dict[str, Any] = {}
    tags: List[str] = []
    mitre_technique_ids: List[str] = []
    mitre_tactic_ids: List[str] = []
    false_positives: List[str] = []
    is_active: bool = True
    raw_yaml: Optional[str] = None
    file_path: Optional[str] = None

class SigmaRuleResponse(SigmaRuleBase):
    id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SigmaRuleListResponse(BaseModel):
    total: int
    items: List[SigmaRuleResponse]
```

---

## 6. 명확화가 필요한 사항

### 6.1 질문 사항

1. **API 경로 네이밍: `/api/v1/sigma-rules` vs `/api/v1/detection-rules`**
   - 현재 기획서 내용: `/api/v1/sigma-rules`
   - 명확화 필요 이유: 프론트엔드 메뉴명은 "디텍션 룰"이고, 향후 Sigma 외에 다른 형태의 탐지 룰(커스텀 룰 등)도 추가될 수 있음. `/api/v1/sigma-rules`로 하면 Sigma 전용으로 한정됨.
   - 제안 사항:
     - **옵션 A**: `/api/v1/sigma-rules` — Sigma 전용 (현재 기획서)
     - **옵션 B**: `/api/v1/detection-rules` — 범용 탐지 룰 (향후 커스텀 룰 통합 가능)
     - **권장**: 옵션 A — 현재 범위가 "Sigma 적재"에 한정되므로, 명확한 네이밍이 유리. 향후 커스텀 룰 추가 시 별도 엔드포인트 또는 통합 검토

2. **재적재(Re-import) 전략**
   - 현재 기획서 내용: 시나리오 1에서 "중복 건수" 언급만 있고 구체적 전략 미정의
   - 명확화 필요 이유: 운영 중 Sigma 룰 파일이 업데이트되면 기존 데이터와 충돌 처리 필요
   - 제안 사항:
     - **옵션 A**: `sigma_id` 기준 스킵 (이미 존재하면 무시)
     - **옵션 B**: `sigma_id` 기준 덮어쓰기 (기존 문서 업데이트, `is_active` 보존)
     - **옵션 C**: 전체 삭제 후 재적재 (`--force` 플래그)
     - **권장**: 옵션 B — 기존 `is_active` 설정은 보존하면서 룰 내용만 업데이트

3. **`informational` severity 매핑**
   - 현재 기획서 내용: 미결정 사항 #2로 남아있음
   - 명확화 필요 이유: Sigma 공식 스펙은 5단계(informational, low, medium, high, critical)이지만 기존 UI는 4단계
   - 제안 사항:
     - **옵션 A**: 5단계 그대로 유지 — `SeverityChip`에 `informational` 추가
     - **옵션 B**: `informational` → `low`로 매핑
     - **옵션 C**: `informational` → `info`로 변환하여 5단계 유지 (알림 시스템의 `info`와 통일)
     - **권장**: 옵션 A — Sigma 원본 데이터 보존이 중요하며, `SeverityChip`에 색상 하나 추가하는 것은 간단

4. **Import 스크립트 위치**
   - 현재 기획서 내용: `python -m app.scripts.import_sigma`
   - 명확화 필요 이유: 기존 프로젝트의 Init 스크립트는 `backend/scripts/` 디렉토리에 위치 (`init_opensearch.py`, `init_notification.py` 등). `app.scripts`는 존재하지 않는 경로
   - 제안 사항:
     - **옵션 A**: `backend/scripts/import_sigma.py` (기존 패턴)
     - **옵션 B**: `backend/app/scripts/import_sigma.py` (기획서 원안)
     - **권장**: 옵션 A — 기존 프로젝트 패턴 준수

5. **프론트엔드 누락 필드 처리**
   - 현재 기획서 내용: 매핑 테이블에 `references`, `license`, `source` 필드 없음
   - 명확화 필요 이유: 프론트엔드 DetectionRuleDetail이 이미 이 필드들을 표시하고 있음
   - 제안 사항: 매핑 테이블에 `references` (keyword[]), `license` (keyword) 추가

### 6.2 의사결정 필요 사항

1. **인덱스 정의 등록 위치:**
   - 옵션 A: `scripts/opensearch_setup/1_index_cruxsiem.json`에 추가 (기존 인덱스와 함께)
   - 옵션 B: `scripts/opensearch_setup/8_index_cs_sigma_rules.json` 별도 파일
   - 권장 사항: 옵션 A — 모든 인덱스를 한 파일에서 관리하는 기존 패턴 유지

2. **Sigma YAML 디렉토리 구조:**
   - 옵션 A: `backend/resources/sigma/{product}/` (product별: windows, linux, network 등)
   - 옵션 B: `backend/resources/sigma/{category}/` (category별: process_creation, network_connection 등)
   - 옵션 C: Sigma 공식 저장소 구조 그대로 유지
   - 권장 사항: 옵션 C — 사용자가 Sigma 저장소에서 받은 구조 그대로 넣을 수 있어 편리

---

## 7. 프로젝트 규칙 준수 검토

### 7.1 ASSISTANT.md 규칙 적합성

**레이어 아키텍처:**
- Schema → Repository → Service → Endpoint 구조 적용 가능: ✅
- Model 레이어: 기존 Notification과 동일하게 Model 없이 Schema 직접 사용 가능

**OpenSearch 인덱스 네이밍:**
- `cs_` 접두사 + snake_case, 복수형: `cs_sigma_rules` ✅
- 필드명 snake_case: `log_source_category`, `mitre_technique_ids` ✅
- 타임스탬프: `created_at`, `updated_at`, `deleted_at` ✅
- Boolean: `is_active` ✅
- Soft delete: `deleted_at` 필드 ✅

**API 규칙:**
- `/api/v1` prefix: ✅
- RESTful 네이밍: `sigma-rules` (kebab-case, 복수형) ✅

**i18n:**
- 프론트엔드 텍스트 하드코딩 금지: 기존 `dr*` 키 활용 + 신규 키 추가 필요

**TDD:**
- 테스트 파일 패턴 명시: 백엔드 `tests/test_*/test_sigma_rule.py` 3개 + 프론트엔드 `tests/unit/` 필요

### 7.2 추가 고려사항
- `endpoints/__init__.py`에 새 라우터 등록 필요
- `requirements.txt`에 `pyyaml` 추가 필요

---

## 8. 개선 제안 사항

### 8.1 우선순위 높음 (반드시 반영 필요)
1. **DELETE API 추가**: `DELETE /api/v1/sigma-rules/{id}` (Soft Delete, 204) — 기존 CRUD 패턴 준수
2. **누락 필드 매핑 추가**: `references`, `license` 필드를 데이터 매핑 테이블에 추가 — 프론트엔드 정합성
3. **Import 스크립트 위치 수정**: `backend/scripts/import_sigma.py`로 변경 — 기존 프로젝트 패턴
4. **재적재 전략 명시**: `sigma_id` 기준 upsert 전략 정의

### 8.2 우선순위 중간 (권장)
1. **프론트엔드 서비스 레이어 명시**: `frontend/src/services/sigmaRuleService.ts` 파일 생성 요구사항 추가
2. **프론트엔드 타입 통합**: `DetectionRuleData`를 `types/index.ts`로 이동하여 중앙 관리
3. **OpenSearch 인덱스 정의**: `scripts/opensearch_setup/1_index_cruxsiem.json`에 추가하는 작업 포함

### 8.3 우선순위 낮음 (선택)
1. Import 진행률 표시 (대량 파일 적재 시 프로그레스 로그)
2. 적재 결과를 JSON 파일로 내보내기 (감사 로그)

---

## 9. 검토 체크리스트

### 완전성
- [x] 모든 필수 요구사항 명시됨
- [x] 비기능 요구사항 포함됨
- [ ] 예외 상황 고려됨 (재적재, 삭제 시나리오 보완 필요)
- [x] 성공 기준 명확함

### 명확성
- [ ] 요구사항이 모호하지 않음 (API 경로, severity 매핑 결정 필요)
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

> **작성 가이드:** 아래 질문들에 대한 답변을 작성하세요. 선택한 옵션과 그 이유를 명확히 기록하면, 최종 기획서 작성 시 참고됩니다.

### 섹션 6.1의 질문들에 대한 답변

#### 질문 1: API 경로 네이밍 — `/api/v1/sigma-rules` vs `/api/v1/detection-rules`
**선택한 옵션:**
<!-- 옵션 A: /api/v1/sigma-rules (Sigma 전용) -->
<!-- 옵션 B: /api/v1/detection-rules (범용) -->

**선택 이유:**


**구체적인 동작:**


---

#### 질문 2: 재적재(Re-import) 전략
**선택한 옵션:**
<!-- 옵션 A: sigma_id 기준 스킵 -->
<!-- 옵션 B: sigma_id 기준 덮어쓰기 (is_active 보존) -->
<!-- 옵션 C: 전체 삭제 후 재적재 (--force) -->

**선택 이유:**


---

#### 질문 3: informational severity 매핑
**선택한 옵션:**
<!-- 옵션 A: 5단계 그대로 유지 (SeverityChip에 informational 추가) -->
<!-- 옵션 B: informational → low로 매핑 -->
<!-- 옵션 C: informational → info로 변환 (알림 시스템과 통일) -->

**선택 이유:**


---

#### 질문 4: Import 스크립트 위치
**선택한 옵션:**
<!-- 옵션 A: backend/scripts/import_sigma.py (기존 패턴) -->
<!-- 옵션 B: backend/app/scripts/import_sigma.py (기획서 원안) -->

**선택 이유:**


---

#### 질문 5: 프론트엔드 누락 필드 처리 (references, license)
**선택한 옵션:**
<!-- 매핑 테이블에 추가하는 것에 동의 / 불필요 -->

**선택 이유:**


---

### 추가 결정 사항

#### 결정 사항 1: Sigma YAML 디렉토리 구조
**결정:**
<!-- 옵션 A: product별 / 옵션 B: category별 / 옵션 C: Sigma 공식 구조 그대로 -->

**이유:**


---

#### 결정 사항 2: 인덱스 정의 등록 위치
**결정:**
<!-- 옵션 A: 1_index_cruxsiem.json에 추가 / 옵션 B: 별도 파일 -->

**이유:**


---

## 11. 답변 기반 업데이트 사항

> **작성 가이드:** 위 답변을 바탕으로 기획서에 추가/변경해야 할 구체적인 내용을 정리하세요.

### API 명세 확정
<!-- 답변 후 확정된 API 경로, 파라미터, 응답 형식 -->


### 데이터 모델 확정
<!-- 답변 후 확정된 추가/변경 필드 -->


### 비기능 요구사항 확정
<!-- 답변 후 확정된 성능/보안 기준 -->


---

## 12. 다음 단계

### 12.1 권장 액션
1. 위의 "10. 검토 질문에 대한 답변" 섹션으로 이동하여 5개 질문에 답변을 작성하세요
2. "추가 결정 사항" 2건에도 결정을 기록하세요
3. "11. 답변 기반 업데이트 사항"에 확정된 내용을 정리하세요
4. 답변 완료 후 3단계(기획 확정) 진행을 요청하세요

### 12.2 예상 추가 작업 시간
- 답변 작성: 15~30분
- 최종 기획서 생성: 자동

---

**답변 작성 완료일:**
**작성자:**
**검토 완료 일시:** 2026-03-17
**다음 단계:** 3단계 — 기획 확정 (`/finalize-spec sigma-rule`)
