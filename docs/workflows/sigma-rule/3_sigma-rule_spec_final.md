# Sigma Rule 적재 및 관리 기능 기획서 (최종)

**작성일:** 2026-03-17
**최종 승인일:** 2026-03-17
**작성자:** Jerry
**검토자:** AI
**버전:** 2.0
**상태:** ✅ 확정

---

## 📌 변경 이력 요약

### 초안 대비 주요 변경사항
1. **재적재 전략 확정**: Upsert + Content Hash + Revision 관리 도입
2. **인덱스 이름 변경**: `cs_sigma_rules` → `cs_detection_rules` + `cs_detection_rule_history`
3. **Import Job 개념 도입**: `cs_rule_import_jobs` 인덱스 추가 (적재 작업 추적)
4. **룰 상태 머신 확장**: `is_active: boolean` → `status: enum` (active/inactive/deleted/deprecated/conflict/invalid)
5. **누락 필드 추가**: `references`, `license`, `content_hash`, `revision`, `level_original`, `level_normalized`, `deleted_by`
6. **리스트/상세 API 응답 분리**: 리스트는 경량, 상세에서만 raw_yaml/detection 포함
7. **Import 스크립트 위치 수정**: `backend/scripts/import_sigma.py` (기존 패턴 준수)
8. **DELETE API 추가**: Soft Delete 엔드포인트

### 검토 반영 사항
- 반영한 제안:
  - DELETE API 추가
  - `references`, `license` 필드 매핑 추가
  - Import 스크립트 위치를 `backend/scripts/`로 변경
  - OpenSearch 필드 타입 개선 (ignore_above, multi-field keyword)
  - 리스트/상세 응답 분리
- 반영하지 않은 제안:
  - 없음 (모든 제안 반영)

---

## 1. 개요

### 1.1 목적
온프레미스 SIEM 환경에서 Sigma Rule(YAML 파일)을 프로젝트에 보관하고, OpenSearch 인덱스에 파싱·적재하여 디텍션 룰 UI에서 조회·검색·활성화/비활성화할 수 있도록 한다.

### 1.2 배경
- 프론트엔드에 디텍션 룰 UI 목업(마스터-디테일 레이아웃)이 이미 구현되어 있으나 백엔드가 없음
- 온프레미스 환경이므로 외부 Sigma 저장소 실시간 참조 불가
- Sigma YAML 파일을 보유하고 있으며, 이를 시스템에 등록해야 함
- 하이브리드 방식 채택: YML 파일을 프로젝트에 보관(시드) + OpenSearch 인덱스에 적재(런타임)

### 1.3 범위

**포함:**
- Sigma YAML 파일 프로젝트 내 저장 구조 정의 (Sigma 공식 구조 그대로)
- Sigma YAML 파싱 → 검증 → 정규화 → Upsert 적재 스크립트
- OpenSearch 인덱스 3종 설계: `cs_detection_rules`, `cs_detection_rule_history`, `cs_rule_import_jobs`
- Sigma Rule CRUD API (목록 조회, 단건 조회, 활성화/비활성화, 삭제)
- Import Job 관리 (적재 작업 추적, Preview/Dry-run)
- 프론트엔드 기존 DetectionRuleList/Detail 컴포넌트와 API 연동
- 관련 테스트 (백엔드 서비스/리포지토리/API, 프론트엔드 컴포넌트)

**제외:**
- Sigma Rule 실시간 탐지 엔진 (스케줄러, 쿼리 실행) — 별도 워크플로우
- 탐지 이벤트(`cs_detection_events`) 저장소 — 별도 워크플로우
- EQL/ML 타입 실행 엔진 — 별도 워크플로우
- 프로세스 트리 연동 — 별도 워크플로우
- Sigma Rule 생성/편집 폼 (UI에서 직접 룰 작성) — 후속 작업

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)
1. **YML 저장 구조**: `backend/resources/sigma/` 하위에 Sigma 공식 저장소 구조 그대로 보관
2. **파싱·검증·정규화 스크립트**: Sigma YAML → 검증(필수 필드) → 정규화(severity, MITRE 태그) → OpenSearch Upsert
3. **OpenSearch 인덱스 3종**: `cs_detection_rules`(최신본), `cs_detection_rule_history`(이력본), `cs_rule_import_jobs`(적재 작업)
4. **목록 조회 API**: severity, status, log_source, MITRE 기술 필터 + 텍스트 검색 + 페이지네이션 (경량 응답)
5. **단건 조회 API**: 룰 상세 정보 (raw_yaml, detection, references, false_positives 포함)
6. **활성화/비활성화 API**: 개별 룰 status 토글 (active ↔ inactive)
7. **삭제 API**: Soft Delete (status=deleted, deleted_at, deleted_by)
8. **프론트엔드 연동**: DetectionRuleList/Detail 컴포넌트에서 실제 API 데이터 표시
9. **프론트엔드 서비스 레이어**: `sigmaRuleService.ts` 생성

#### 선택 기능 (Should Have)
1. **Import Preview**: 실제 반영 전 dry-run (신규/업데이트/스킵/충돌/실패 건수 미리 표시)
2. **일괄 Import API**: REST API를 통한 Sigma YAML 업로드 및 적재
3. **MITRE ATT&CK 커버리지 통계**: 등록된 룰의 ATT&CK 기술 커버리지 요약

#### 향후 고려사항 (Nice to Have)
1. Sigma Rule 편집/생성 UI
2. 룰 Export (JSON/YAML)
3. Import Preview UI (웹에서 dry-run 결과 확인)

### 2.2 비기능 요구사항

#### 성능
- 목록 조회 응답 시간: < 500ms (1,000건 이내)
- Import 스크립트: 500개 YAML 파일 적재 < 30초 (OpenSearch `_bulk` API 활용)

#### 보안
- 인증: JWT 기반 (기존 인증 시스템 활용)
- 접근 제어: 로그인 사용자만 접근 가능
- YAML 파싱: `yaml.safe_load()` 강제 사용 (YAML bomb/코드 실행 방어)
- YAML 파일 크기 제한: 1MB 이하

#### 확장성
- 향후 탐지 엔진 연동을 위한 `detection_config` 필드 보존
- 룰 타입(query, threshold 등) 확장 가능한 구조
- `cs_detection_rules` 인덱스는 향후 Sigma 외 커스텀 룰도 수용 가능

---

## 3. 사용자 시나리오 (확정)

### 3.1 주요 사용자
- **보안 관리자**: Sigma 룰 적재, 활성화/비활성화/삭제 관리
- **보안 분석가**: 등록된 룰 목록 조회, 상세 확인

### 3.2 사용 시나리오

#### 시나리오 1: 초기 Sigma Rule 적재
**사전 조건:**
- Sigma YAML 파일이 `backend/resources/sigma/`에 배치됨
- OpenSearch 실행 중, `cs_detection_rules` 인덱스 존재

**실행 단계:**
1. 관리자가 import 스크립트 실행 (`python scripts/import_sigma.py`)
2. 스크립트가 Pre-flight 헬스체크 수행 (OpenSearch 연결, 인덱스 존재, 쓰기 가능)
3. YAML 파일 순회 → 파싱 → 필수 필드 검증 → 정규화 → content_hash 생성
4. sigma_id 기준 Upsert (신규 insert / 변경 update+revision / 동일 skip)
5. Import Job 결과 저장 (`cs_rule_import_jobs`)
6. 적재 결과 요약 출력 (inserted/updated/skipped/failed/conflict 건수)

**기대 결과:**
- `cs_detection_rules`에 파싱된 룰 문서 저장
- `cs_rule_import_jobs`에 적재 작업 기록 저장

**예외 상황 및 처리:**
- OpenSearch 연결 실패 → Job-level failure (전체 중단, 룰 import 진행 안 함)
- 필수 필드 누락 (title/logsource/detection) → 해당 파일만 skip, Job 계속 진행
- level 누락 → default `medium` + warning
- 동일 sigma_id + 다른 content 중복 파일 → conflict 처리, 둘 다 반영 안 함

---

#### 시나리오 2: 재적재 (룰 업데이트)
**사전 조건:**
- 기존 룰이 적재된 상태
- 업데이트된 Sigma YAML 파일 배치

**실행 단계:**
1. import 스크립트 실행
2. content_hash 비교를 통한 변경 감지

**기대 결과:**
- 동일 sigma_id + 동일 content → skip
- 동일 sigma_id + 변경 content → update (revision += 1, 기존 is_active/status 보존, 이전본 history에 저장)
- 신규 sigma_id → insert

---

#### 시나리오 3: 디텍션 룰 목록 조회 및 상세 확인
**사전 조건:**
- Sigma Rule이 적재된 상태
- 사용자가 시나리오 > 디텍션 룰 메뉴 진입

**실행 단계:**
1. 탐지 규칙 탭 선택 → 좌측에 룰 목록 로드 (경량 응답)
2. 특정 룰 클릭 → 우측 상세 패널에 전체 정보 표시 (raw_yaml 포함)
3. 활성화/비활성화 토글로 룰 상태 변경

**기대 결과:**
- 목록에서 severity, status, log_source, MITRE 기술로 필터링 가능
- 상세 패널에 severity, description, MITRE 태그, detection 로직, 원본 YAML 등 표시
- detection 블록은 기본 접힌 상태, show more로 확장

---

#### 시나리오 4: 룰 삭제
**사전 조건:**
- 룰이 적재된 상태

**실행 단계:**
1. 관리자가 특정 룰 삭제 요청
2. Detector에 연결 중인 룰이면 경고 표시 (삭제는 허용)

**기대 결과:**
- `is_deleted = true`, `status = deleted`, `deleted_at`, `deleted_by` 설정
- UI 기본 목록에서 숨겨짐 (관리자 필터로 조회 가능)

---

#### 시나리오 5: 빈 목록 (초기 상태)
**사전 조건:**
- Import 전 상태에서 UI 진입

**기대 결과:**
- 에러가 아닌 초기 상태 안내 메시지 표시
- "등록된 탐지 규칙이 없습니다. Sigma Rule Import를 먼저 실행해주세요."
- [룰 가져오기] 버튼 표시

---

## 4. 데이터 요구사항 (확정)

### 4.1 OpenSearch 인덱스: `cs_detection_rules` (최신본)

| 필드 | 타입 | 필수 | 출처 | 설명 |
|------|------|------|------|------|
| `id` | keyword | 자동 | 시스템 UUID | OpenSearch 문서 ID |
| `sigma_id` | keyword | 필수 | YAML `id` | Sigma 고유 UUID (논리적 유니크 키) |
| `name` | text + keyword (ignore_above: 256) | 필수 | YAML `title` | 룰 이름 |
| `description` | text + keyword (ignore_above: 256) | 선택 | YAML `description` | 룰 설명 |
| `level_original` | keyword | 선택 | YAML `level` | 원본 severity 값 |
| `level_normalized` | keyword | 필수 | 파싱 | 정규화된 severity (critical/high/medium/low/info) |
| `sigma_status` | keyword | 선택 | YAML `status` | Sigma 성숙도 (experimental/test/stable/deprecated/unsupported) |
| `author` | text + keyword (ignore_above: 256) | 선택 | YAML `author` | 룰 작성자 |
| `sigma_date` | keyword | 선택 | YAML `date` | 원본 작성일 |
| `references` | keyword[] | 선택 | YAML `references` | 참고 URL 목록 |
| `license` | keyword | 선택 | YAML `license` | 라이선스 |
| `log_source_category` | keyword | 필수 | YAML `logsource.category` | 로그 카테고리 |
| `log_source_product` | keyword | 선택 | YAML `logsource.product` | 로그 제품 |
| `log_source_service` | keyword | 선택 | YAML `logsource.service` | 로그 서비스 |
| `detection_config` | object (enabled: false) | 필수 | YAML `detection` | 탐지 조건 원본 (검색 불필요, 저장만) |
| `tags` | keyword[] | 선택 | YAML `tags` | Sigma 태그 전체 (빈 배열 허용, null 금지) |
| `mitre_technique_ids` | keyword[] | 파싱 | tags에서 추출 | MITRE 기술 ID (예: T1059.001) |
| `mitre_tactic_ids` | keyword[] | 파싱 | tags에서 추출 | MITRE 전술 (예: execution) |
| `false_positives` | text[] | 선택 | YAML `falsepositives` | 오탐 가능 사례 |
| `status` | keyword | 자동 | 시스템 | 룰 상태: active/inactive/deleted/deprecated/conflict/invalid |
| `is_deleted` | boolean | 자동 | 시스템 | 삭제 여부 (기본 false) |
| `raw_yaml` | object (enabled: false) | 자동 | 파싱 | 원본 YAML (검색/인덱싱 불필요, 저장만) |
| `file_path` | keyword | 자동 | 파싱 | 소스 파일 경로 |
| `content_hash` | keyword | 자동 | 파싱 | 정규화된 콘텐츠 해시 (변경 감지용) |
| `revision` | integer | 자동 | 시스템 | 리비전 번호 (기본 1, update마다 +1) |
| `deleted_by` | keyword | 조건부 | 시스템 | 삭제한 사용자 ID |
| `created_at` | date | 자동 | 시스템 | 최초 적재 일시 |
| `updated_at` | date | 자동 | 시스템 | 수정 일시 |
| `deleted_at` | date | 조건부 | 시스템 | 삭제 일시 (Soft delete) |

### 4.2 OpenSearch 인덱스: `cs_detection_rule_history` (이력본)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | keyword | 히스토리 문서 ID |
| `rule_id` | keyword | 원본 룰 문서 ID 참조 |
| `sigma_id` | keyword | Sigma UUID |
| `revision` | integer | 해당 시점의 리비전 번호 |
| `raw_yaml` | object (enabled: false) | 해당 시점의 원본 YAML |
| `content_hash` | keyword | 해당 시점의 콘텐츠 해시 |
| `changed_at` | date | 변경 일시 |

### 4.3 OpenSearch 인덱스: `cs_rule_import_jobs` (적재 작업)

| 필드 | 타입 | 설명 |
|------|------|------|
| `job_id` | keyword | 작업 ID (예: import-20260317-001) |
| `status` | keyword | 작업 상태: running/completed/failed |
| `total_files` | integer | 전체 파일 수 |
| `processed_files` | integer | 처리된 파일 수 |
| `inserted_count` | integer | 신규 삽입 수 |
| `updated_count` | integer | 업데이트 수 |
| `skipped_count` | integer | 스킵 수 |
| `failed_count` | integer | 실패 수 |
| `conflict_count` | integer | 충돌 수 |
| `error_message` | text | 에러 메시지 (Job-level failure 시) |
| `errors` | object[] | 파일별 에러 상세 |
| `started_at` | date | 시작 일시 |
| `completed_at` | date | 완료 일시 |

### 4.4 데이터 작업
- **CREATE**: Import 스크립트로 YAML → OpenSearch 적재 (Upsert)
- **READ**: 목록 조회 (경량), 단건 조회 (전체), Import Job 이력 조회
- **UPDATE**: 활성화/비활성화 토글 (status 변경), 재적재 시 content update + revision 증가
- **DELETE**: Soft Delete (is_deleted=true, status=deleted, deleted_at, deleted_by)

### 4.5 Severity 정규화 매핑

| Sigma level (원본) | level_normalized | 비고 |
|-------------------|-----------------|------|
| critical | critical | |
| high | high | |
| medium | medium | |
| low | low | |
| informational | info | 알림 시스템과 통일 |
| (누락) | medium | default, warning 로그 |
| (비표준 값) | medium | normalize table 미존재 시, level_original 보존 |

### 4.6 Import Upsert 정책

| 조건 | 동작 | Import 결과 |
|------|------|------------|
| 신규 sigma_id | insert, status=active, revision=1 | inserted |
| 동일 sigma_id + 동일 content_hash | skip | skipped |
| 동일 sigma_id + 다른 content_hash | update, revision += 1, 기존 status 보존, 이전본 history 저장 | updated |
| 동일 sigma_id 중복 파일 (같은 content) | 하나만 import, 나머지 skip + warning | skipped |
| 동일 sigma_id 중복 파일 (다른 content) | conflict, 둘 다 반영 안 함 | conflict |

---

## 5. API 명세 (확정)

### 5.1 엔드포인트 목록

#### API 1: 룰 목록 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules`
- **인증:** Required (JWT)
- **설명:** Sigma Rule 경량 목록 (raw_yaml, detection 미포함)

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `severity` | string | 선택 | critical/high/medium/low/info 필터 |
| `status` | string | 선택 | active/inactive/deleted 필터 |
| `log_source_product` | string | 선택 | 로그 소스 제품 필터 |
| `mitre_technique_id` | string | 선택 | MITRE 기술 ID 필터 |
| `search` | string | 선택 | 이름/설명 텍스트 검색 |
| `page` | integer | 선택 | 페이지 번호 (기본 1) |
| `size` | integer | 선택 | 페이지 크기 (기본 20) |
| `sort_by` | string | 선택 | 정렬 기준 (기본 updated_at) |
| `sort_order` | string | 선택 | asc/desc (기본 desc) |

**성공 응답 (200):**
```json
{
  "total": 120,
  "items": [
    {
      "id": "uuid",
      "sigma_id": "sigma-uuid",
      "name": "PowerShell Encoded Command Execution",
      "level_normalized": "critical",
      "status": "active",
      "log_source_category": "process_creation",
      "log_source_product": "windows",
      "tags": ["attack.execution", "attack.t1059.001"],
      "mitre_technique_ids": ["T1059.001"],
      "mitre_tactic_ids": ["execution"],
      "revision": 2,
      "updated_at": "2026-03-17T10:00:00Z"
    }
  ]
}
```

---

#### API 2: 룰 단건 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules/{id}`
- **인증:** Required (JWT)
- **설명:** Sigma Rule 전체 상세 (raw_yaml, detection, references 포함)

**성공 응답 (200):**
```json
{
  "id": "uuid",
  "sigma_id": "sigma-uuid",
  "name": "PowerShell Encoded Command Execution",
  "description": "Detects encoded PowerShell command execution...",
  "level_original": "critical",
  "level_normalized": "critical",
  "sigma_status": "stable",
  "author": "Florian Roth",
  "sigma_date": "2022/01/15",
  "references": ["https://example.com/article"],
  "license": "MIT",
  "log_source_category": "process_creation",
  "log_source_product": "windows",
  "log_source_service": null,
  "detection_config": { "selection": {"...": "..."}, "condition": "selection" },
  "tags": ["attack.execution", "attack.t1059.001"],
  "mitre_technique_ids": ["T1059.001"],
  "mitre_tactic_ids": ["execution"],
  "false_positives": ["Legitimate admin scripts"],
  "status": "active",
  "is_deleted": false,
  "raw_yaml": "title: PowerShell Encoded Command...\n...",
  "file_path": "windows/process_creation/proc_creation_win_powershell_encoded.yml",
  "content_hash": "abc123def456",
  "revision": 2,
  "created_at": "2026-03-17T09:00:00Z",
  "updated_at": "2026-03-17T10:00:00Z",
  "deleted_at": null
}
```

---

#### API 3: 활성화/비활성화 토글
- **Method:** PUT
- **Path:** `/api/v1/sigma-rules/{id}/toggle`
- **인증:** Required (JWT)
- **설명:** status를 active ↔ inactive 전환

**성공 응답 (200):**
```json
{
  "id": "uuid",
  "status": "inactive",
  "updated_at": "2026-03-17T10:05:00Z"
}
```

---

#### API 4: 룰 삭제
- **Method:** DELETE
- **Path:** `/api/v1/sigma-rules/{id}`
- **인증:** Required (JWT)
- **설명:** Soft Delete (status=deleted)

**성공 응답:** 204 No Content

---

#### API 5: 통계 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules/stats`
- **인증:** Required (JWT)
- **설명:** 전체 룰 수, severity별/status별 분포, MITRE 커버리지

**성공 응답 (200):**
```json
{
  "total": 120,
  "by_severity": { "critical": 15, "high": 35, "medium": 45, "low": 20, "info": 5 },
  "by_status": { "active": 100, "inactive": 18, "deprecated": 2 },
  "mitre_coverage": { "tactics_count": 12, "techniques_count": 87 }
}
```

---

#### API 6: 일괄 Import (Should Have)
- **Method:** POST
- **Path:** `/api/v1/sigma-rules/import`
- **인증:** Required (JWT)
- **설명:** YAML 파일 업로드 및 적재, Import Job 생성

---

## 6. Import 스크립트 명세 (확정)

### 6.1 위치 및 실행
- **파일**: `backend/scripts/import_sigma.py`
- **실행**: `cd backend && python scripts/import_sigma.py`
- **옵션**: `--dry-run` (Preview 모드, 실제 반영 안 함), `--path` (YAML 디렉토리 지정)

### 6.2 실행 흐름
```
1. Pre-flight 헬스체크
   ├── OpenSearch 연결 확인
   ├── 대상 인덱스 존재 여부 확인
   └── 쓰기 가능 여부 확인
   → 실패 시 Job-level failure, 즉시 종료

2. YAML 파일 스캔
   └── backend/resources/sigma/ 하위 재귀 탐색

3. 파일별 처리 루프
   ├── YAML 파싱 (yaml.safe_load)
   ├── 필수 필드 검증 (title, logsource, detection)
   │   → 실패 시 해당 파일 skip, error 기록
   ├── 정규화
   │   ├── severity: level → level_original + level_normalized
   │   ├── MITRE: tags → mitre_technique_ids + mitre_tactic_ids
   │   └── content_hash 생성 (YAML 파싱 → key sort → JSON → SHA256)
   ├── 중복 sigma_id 감지 (같은 batch 내)
   │   → 동일 content: skip + warning / 다른 content: conflict
   └── Upsert (sigma_id 기준)
       ├── 신규 → insert (revision=1, status=active)
       ├── 동일 hash → skip
       └── 다른 hash → update (revision += 1, 이전본 → history)

4. Import Job 결과 저장 (cs_rule_import_jobs)

5. 결과 요약 출력
   신규 25건 | 업데이트 4건 | 스킵 101건 | 충돌 2건 | 실패 3건
```

---

## 7. 프론트엔드 연동 (확정)

### 7.1 신규 파일
- `frontend/src/services/sigmaRuleService.ts` — API 호출 서비스
- 타입 정의를 `types/index.ts`로 통합 이동

### 7.2 수정 파일
- `DetectionRuleTab.tsx` — 목업 데이터 제거, API 연동
- `DetectionRuleList.tsx` — API 데이터 표시
- `DetectionRuleDetail.tsx` — API 상세 데이터 표시, detection 블록 접힌 상태 기본

### 7.3 빈 목록 UI
- 초기 상태 메시지: "등록된 탐지 규칙이 없습니다. Sigma Rule Import를 먼저 실행해주세요."
- i18n 키 추가 필요

---

## 8. 제약사항 및 고려사항 (확정)

### 8.1 기술적 제약사항
- 온프레미스 환경: 외부 네트워크 접근 불가, Sigma 저장소 실시간 동기화 불가
- OpenSearch 버전: 기존 프로젝트에서 사용 중인 버전 호환성 유지

### 8.2 비즈니스 제약사항
- Sigma YAML 파일은 사용자가 직접 제공 (자동 다운로드 불가)

### 8.3 외부 의존성
- `PyYAML`: Sigma YAML 파싱 (`requirements.txt` 추가 필요)

### 8.4 보안 요구사항
- YAML 파싱: `yaml.safe_load()` 강제 (보안 취약점 방지)
- YAML 파일 크기: 1MB 이하 제한
- REST API: JWT 인증 필수
- CLI 스크립트: 서버 접근 권한으로 대체

---

## 9. 성공 기준 (확정)

### 9.1 완료 조건
- [ ] Sigma YAML 파일이 `backend/resources/sigma/`에 Sigma 공식 구조로 저장됨
- [ ] Import 스크립트 실행 시 YAML → 검증 → 정규화 → OpenSearch Upsert 성공
- [ ] 재적재 시 content_hash 기반 변경 감지 및 revision 관리 동작
- [ ] Import Job 결과가 `cs_rule_import_jobs`에 기록됨
- [ ] API로 목록 조회 (경량), 단건 조회 (전체), 토글, 삭제 동작 확인
- [ ] 프론트엔드 DetectionRuleList에서 실제 API 데이터 목록 표시
- [ ] 프론트엔드 DetectionRuleDetail에서 선택된 룰 상세 표시 (detection 접힌 상태)
- [ ] 빈 목록 시 초기 상태 안내 메시지 표시
- [ ] 백엔드 테스트 통과 (서비스/리포지토리/API)
- [ ] 프론트엔드 테스트 통과 (컴포넌트)

### 9.2 테스트 기준
- [ ] 백엔드 단위 테스트: 서비스/리포지토리/API 각각
- [ ] Import 스크립트: 정상 적재, 재적재(upsert), 검증 실패, 중복 처리
- [ ] 프론트엔드 컴포넌트 테스트: 목록 렌더링, 상세 표시, 토글

---

## 10. 개발 착수 승인

### 10.1 승인 정보
- 승인자: Jerry
- 승인일: 2026-03-17
- 승인 조건: 본 기획서 내용 기준으로 개발 진행

### 10.2 다음 단계
✅ 4단계: 개발 계획서 작성

---

## 11. 부록

### 11.1 참고 자료
- Sigma Rule 공식 사양: https://sigmahq.io/
- DETECTION_RESEARCH.md (프로젝트 내 연구 문서)
- 기존 알림 규칙 워크플로우: `docs/workflows/notification-rule-mgmt/`

### 11.2 Sigma YAML 디렉토리 구조
Sigma 공식 저장소 구조를 그대로 유지:
```
backend/resources/sigma/
├── rules/
│   ├── windows/
│   │   ├── process_creation/
│   │   ├── registry_event/
│   │   └── ...
│   ├── linux/
│   └── network/
└── ...
```

### 11.3 룰 상태 머신

**Rule Status:**
| 상태 | 설명 |
|------|------|
| `active` | 활성 (기본) |
| `inactive` | 비활성 (관리자가 수동 비활성화) |
| `deleted` | 삭제됨 (Soft Delete) |
| `deprecated` | 폐기됨 (Sigma 원본이 deprecated) |
| `conflict` | 충돌 (동일 sigma_id 다른 content) |
| `invalid` | 유효하지 않음 (검증 실패) |

**Import Result:**
| 결과 | 설명 |
|------|------|
| `inserted` | 신규 삽입 |
| `updated` | 기존 룰 업데이트 (revision 증가) |
| `skipped` | 변경 없음 (동일 content_hash) |
| `failed` | 검증 실패 (필수 필드 누락 등) |
| `conflict` | 충돌 (동일 sigma_id 다른 content) |

---

**문서 상태:** 확정 및 잠금
**다음 단계:** 개발 계획 수립
