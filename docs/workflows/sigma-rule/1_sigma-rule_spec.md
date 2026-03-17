# Sigma Rule 적재 및 관리 기능 기획서

**작성일:** 2026-03-17
**작성자:** Jerry
**버전:** 1.0
**상태:** 초안

---

## 1. 개요

### 1.1 목적
온프레미스 SIEM 환경에서 Sigma Rule(YAML 파일)을 프로젝트에 보관하고, OpenSearch 인덱스에 적재하여 디텍션 룰 UI에서 조회·검색·활성화/비활성화할 수 있도록 한다.

### 1.2 배경
- 프론트엔드에 디텍션 룰 UI 목업(마스터-디테일 레이아웃)이 이미 구현되어 있으나 백엔드가 없음
- 온프레미스 환경이므로 외부 Sigma 저장소 실시간 참조 불가
- Sigma YAML 파일을 보유하고 있으며, 이를 시스템에 등록해야 함
- 하이브리드 방식 채택: YML 파일을 프로젝트에 보관(시드) + OpenSearch 인덱스에 적재(런타임)

### 1.3 범위

**포함:**
- Sigma YAML 파일 프로젝트 내 저장 구조 정의
- Sigma YAML → OpenSearch 파싱/적재 스크립트
- `cs_sigma_rules` 인덱스 설계 및 생성
- Sigma Rule CRUD API (목록 조회, 단건 조회, 활성화/비활성화)
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
1. **YML 저장 구조**: `backend/resources/sigma/` 하위에 카테고리별 디렉토리로 Sigma YAML 보관
2. **파싱 스크립트**: Sigma YAML을 읽어 OpenSearch 문서로 변환하는 import CLI/스크립트
3. **OpenSearch 인덱스**: `cs_sigma_rules` 인덱스 매핑 생성 및 초기 적재
4. **목록 조회 API**: severity, status, log_source, MITRE 기술 필터 + 텍스트 검색 + 페이지네이션
5. **단건 조회 API**: 룰 상세 정보 (원본 YAML 내용 포함)
6. **활성화/비활성화 API**: 개별 룰 토글
7. **프론트엔드 연동**: DetectionRuleList/Detail 컴포넌트에서 실제 API 데이터 표시

#### 선택 기능 (Should Have)
1. **일괄 Import API**: REST API를 통한 Sigma YAML 업로드 및 적재
2. **MITRE ATT&CK 커버리지 통계**: 등록된 룰의 ATT&CK 기술 커버리지 요약

#### 향후 고려사항 (Nice to Have)
1. Sigma Rule 편집/생성 UI
2. 룰 Export (JSON/YAML)
3. 룰 버전 관리 (동일 룰의 변경 이력)

### 2.2 비기능 요구사항

#### 성능
- 목록 조회 응답 시간: < 500ms (1,000건 이내)
- Import 스크립트: 500개 YAML 파일 적재 < 30초

#### 보안
- 인증: JWT 기반 (기존 인증 시스템 활용)
- 접근 제어: 로그인 사용자만 접근 가능

#### 확장성
- 향후 탐지 엔진 연동을 위한 쿼리 설정 필드 확보
- 룰 타입(query, threshold 등) 확장 가능한 구조

---

## 3. 사용자 시나리오

### 3.1 주요 사용자
- **보안 관리자**: Sigma 룰을 시스템에 적재하고 활성화/비활성화를 관리
- **보안 분석가**: 등록된 룰 목록을 조회하고 상세 내용 확인

### 3.2 사용 시나리오

#### 시나리오 1: 초기 Sigma Rule 적재
**사전 조건:**
- Sigma YAML 파일이 `backend/resources/sigma/` 에 배치됨
- OpenSearch가 실행 중

**실행 단계:**
1. 관리자가 import 스크립트 실행 (`python -m app.scripts.import_sigma`)
2. 스크립트가 YAML 파일을 파싱하여 OpenSearch에 적재
3. 적재 결과 요약 출력 (성공/실패/중복 건수)

**기대 결과:**
- `cs_sigma_rules` 인덱스에 파싱된 룰 문서가 저장됨

**예외 상황:**
- 잘못된 YAML 형식 → 오류 로그 출력 후 다음 파일 계속 처리

---

#### 시나리오 2: 디텍션 룰 목록 조회 및 상세 확인
**사전 조건:**
- Sigma Rule이 적재된 상태
- 사용자가 시나리오 > 디텍션 룰 메뉴 진입

**실행 단계:**
1. 좌측 룰 목록에서 이름, 로그소스, MITRE 태그 확인
2. 특정 룰 클릭 시 우측 상세 패널에 룰 정보 표시
3. 활성화/비활성화 토글로 룰 상태 변경

**기대 결과:**
- 목록에서 검색/필터링 가능
- 상세 패널에 severity, description, MITRE 태그, 원본 쿼리 등 표시

---

## 4. 데이터 요구사항

### 4.1 Sigma YAML 주요 필드 → OpenSearch 매핑

| Sigma YAML 필드 | OpenSearch 필드 | 타입 | 필수 | 설명 |
|-----------------|----------------|------|------|------|
| `title` | `name` | text + keyword | 필수 | 룰 이름 |
| `id` | `sigma_id` | keyword | 필수 | Sigma 고유 UUID |
| `description` | `description` | text | 선택 | 룰 설명 |
| `status` | `sigma_status` | keyword | 선택 | Sigma 상태 (test, stable 등) |
| `level` | `severity` | keyword | 필수 | critical/high/medium/low/informational |
| `author` | `author` | keyword | 선택 | 룰 작성자 |
| `date` | `sigma_date` | date | 선택 | 원본 작성일 |
| `logsource.category` | `log_source_category` | keyword | 필수 | 로그 카테고리 |
| `logsource.product` | `log_source_product` | keyword | 선택 | 로그 소스 제품 |
| `logsource.service` | `log_source_service` | keyword | 선택 | 로그 소스 서비스 |
| `detection` | `detection_config` | object | 필수 | 탐지 조건 (원본 보존) |
| `tags` | `tags` | keyword[] | 선택 | Sigma 태그 (MITRE 포함) |
| — | `mitre_technique_ids` | keyword[] | 파싱 | tags에서 추출한 MITRE 기술 ID |
| — | `mitre_tactic_ids` | keyword[] | 파싱 | tags에서 추출한 MITRE 전술 |
| `falsepositives` | `false_positives` | text[] | 선택 | 오탐 가능 사례 |
| — | `id` | keyword | 자동 | OpenSearch 문서 ID (UUID) |
| — | `is_active` | boolean | 자동 | 활성화 여부 (기본 true) |
| — | `raw_yaml` | text | 자동 | 원본 YAML 문자열 |
| — | `file_path` | keyword | 자동 | 소스 파일 경로 |
| — | `created_at` | date | 자동 | 적재 일시 |
| — | `updated_at` | date | 자동 | 수정 일시 |
| — | `deleted_at` | date | 자동 | 삭제 일시 (Soft delete) |

### 4.2 데이터 생성/수정/삭제
- 생성: Import 스크립트 또는 API를 통한 YAML 적재
- 수정: 활성화/비활성화 토글
- 삭제: Soft delete (`deleted_at` 필드 설정)
- 조회: 필터/검색/페이지네이션 기반 목록 + 단건 상세

---

## 5. API 요구사항

### 5.1 필요한 엔드포인트

#### API 1: 룰 목록 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules`
- **설명:** Sigma Rule 목록 (필터, 검색, 페이지네이션)
- **쿼리 파라미터:** `severity`, `is_active`, `log_source_product`, `mitre_technique_id`, `search`, `page`, `size`, `sort_by`, `sort_order`

#### API 2: 룰 단건 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules/{id}`
- **설명:** Sigma Rule 상세 (원본 YAML 포함)

#### API 3: 활성화/비활성화 토글
- **Method:** PUT
- **Path:** `/api/v1/sigma-rules/{id}/toggle`
- **설명:** `is_active` 필드 반전

#### API 4: 일괄 Import (선택)
- **Method:** POST
- **Path:** `/api/v1/sigma-rules/import`
- **설명:** Sigma YAML 파일 업로드 및 적재

#### API 5: 통계 조회
- **Method:** GET
- **Path:** `/api/v1/sigma-rules/stats`
- **설명:** 전체 룰 수, severity별 분포, MITRE 커버리지 등

---

## 6. UI/UX 요구사항

### 6.1 화면 구성
기존 마스터-디테일 레이아웃(DetectionRuleList + DetectionRuleDetail) 활용:

- **좌측 목록 패널**: 룰 이름, 로그소스 플랫폼, MITRE 기술, severity 칩, 활성화 토글
- **우측 상세 패널**: 선택된 룰의 전체 정보 (이름, 설명, severity, MITRE 태그, detection 설정, 원본 YAML 등)

### 6.2 사용자 플로우
1. 시나리오 > 디텍션 룰 메뉴 진입
2. 탐지 규칙 탭 선택 → 좌측에 Sigma Rule 목록 로드
3. 룰 선택 → 우측에 상세 정보 표시
4. 토글로 활성화/비활성화 전환

---

## 7. 제약사항 및 고려사항

### 7.1 기술적 제약사항
- 온프레미스 환경: 외부 네트워크 접근 불가, Sigma 저장소 실시간 동기화 불가
- OpenSearch 버전: 기존 프로젝트에서 사용 중인 버전 호환성 유지

### 7.2 비즈니스 제약사항
- Sigma YAML 파일은 사용자가 직접 제공 (자동 다운로드 불가)

### 7.3 외부 의존성
- `PyYAML` 또는 `ruamel.yaml`: Sigma YAML 파싱 라이브러리

---

## 8. 성공 기준

### 8.1 완료 조건
- [ ] Sigma YAML 파일이 `backend/resources/sigma/`에 카테고리별로 저장됨
- [ ] Import 스크립트로 YAML → OpenSearch 적재 성공
- [ ] API로 룰 목록 조회, 단건 조회, 토글 동작 확인
- [ ] 프론트엔드 DetectionRuleList에서 실제 데이터 목록 표시
- [ ] 프론트엔드 DetectionRuleDetail에서 선택된 룰 상세 표시
- [ ] 백엔드 테스트 통과 (서비스/리포지토리/API)
- [ ] 프론트엔드 테스트 통과 (컴포넌트)

---

## 9. 일정 및 우선순위

### 9.1 우선순위
- [x] P1 - 높음

### 9.2 예상 일정
- 기획 완료: 2026-03-17
- 개발 완료: -
- 테스트 완료: -
- 배포: -

---

## 10. 참고자료
- Sigma Rule 공식 사양: https://sigmahq.io/
- DETECTION_RESEARCH.md (프로젝트 내 연구 문서)
- 기존 알림 규칙 워크플로우: `docs/workflows/notification-rule-mgmt/`

---

## 11. 질문 및 미결정 사항

1. Sigma YAML 파일의 초기 적재 대상 범위 (Windows 중심? Linux 포함?)
2. severity 매핑: Sigma의 `informational` 레벨을 기존 UI의 4단계(critical/high/medium/low)에 어떻게 매핑할 것인가?
3. 탐지 엔진 연동 시점 — 이 워크플로우에서는 "적재 및 조회"까지만 다루고, 실제 탐지 실행은 후속 워크플로우로 분리

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|-----|------|----------|--------|
| 2026-03-17 | 1.0  | 초안 작성 | Jerry |
