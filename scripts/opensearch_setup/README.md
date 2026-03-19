# CruxSIEM - OpenSearch 신규 서버 초기화 가이드

## 실행 순서

```
1_index_cruxsiem.json     → cs_ 인덱스 생성 (14개)
2_ism.json                → ISM 수명주기 정책 생성
3_index_template_*.json   → 로그 인덱스 템플릿 등록
4_data_cs_code.json       → 역할 코드 초기 데이터 (role-1~4)
5_data_cs_policies.json   → 고급설정 + 패스워드 정책 기본값
6_data_cs_dashboards.json → 대시보드 패널 초기 데이터 (19개)
7_data_cs_users_admin.json → administrator 초기 계정 (초기 비밀번호: CruxSIEM1!)
─── 여기까지 기본 서버 초기화 ───
8. Sigma 규칙 Import        → 3,700+ 표준 탐지 규칙 적재
9. Sigma 규칙 벌크 변환      → pySigma로 OpenSearch DSL 쿼리 생성
```

---

## Step 1: cs_ 인덱스 생성

`1_index_cruxsiem.json`의 각 인덱스를 생성:

```bash
OS="http://localhost:9200"

for INDEX in cs_alerts cs_code cs_dashboards cs_login_attempts cs_notification_rules cs_policies cs_sessions cs_users cs_detection_rules cs_detection_policies cs_detection_events cs_detection_rule_history cs_rule_import_jobs cs_rule_reconvert_jobs; do
  echo "Creating $INDEX..."
  curl -s -X PUT "$OS/$INDEX" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; d=json.load(open('1_index_cruxsiem.json')); m=d.get('$INDEX',{}); body={'mappings':m.get('mappings',{})}; s=m.get('settings',{}).get('index',{}); clean={k:v for k,v in s.items() if k in ('number_of_shards','number_of_replicas','refresh_interval')}; body['settings']={'index':clean} if clean else {}; print(json.dumps(body))")"
  echo ""
done
```

또는 DevTools에서 직접 `1_index_cruxsiem.json`의 각 인덱스 mappings를 붙여넣기.

---

## Step 2: ISM 수명주기 정책 등록

```bash
curl -X PUT "$OS/_plugins/_ism/policies/sentinel_one_policy" \
  -H "Content-Type: application/json" \
  -d "$(cat 2_ism.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['policy']))")"
```

---

## Step 3: 인덱스 템플릿 등록 (로그 수집용)

```bash
for TEMPLATE in edr agents threats; do
  NAME=$(cat 3_index_template_${TEMPLATE}.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.keys())[0])")
  curl -X PUT "$OS/_index_template/$NAME" \
    -H "Content-Type: application/json" \
    -d "$(cat 3_index_template_${TEMPLATE}.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(list(d.values())[0]))")"
  echo ""
done
```

---

## Step 4~6: 초기 데이터 삽입 (Bulk API)

```bash
# cs_code (role-1~4)
curl -X POST "$OS/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @4_data_cs_code.json

# cs_policies (고급설정 + 패스워드 정책)
curl -X POST "$OS/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @5_data_cs_policies.json

# cs_dashboards (대시보드 패널 19개)
curl -X POST "$OS/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @6_data_cs_dashboards.json
```

---

## Step 7: 관리자 계정 삽입

```bash
# cs_users (administrator, 초기 비밀번호: CruxSIEM1!)
curl -X POST "$OS/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @7_data_cs_users_admin.json
```

> **주의:** 최초 로그인 후 반드시 비밀번호를 변경하세요.

---

## Step 8: Sigma 규칙 Import (탐지 기능 사용 시 필수)

Sigma 커뮤니티의 표준 탐지 규칙 YAML을 `cs_detection_rules` 인덱스에 적재한다.

```bash
cd backend
python scripts/import_sigma.py

# dry-run으로 미리보기
python scripts/import_sigma.py --dry-run
```

- 기본 경로: `backend/resources/sigma/` (3,700+ YAML 파일)
- 결과: `cs_detection_rules`에 `type=sigma` 규칙 생성, `cs_rule_import_jobs`에 작업 이력 기록
- 이미 Import된 규칙은 `content_hash` 비교로 자동 스킵

---

## Step 9: Sigma 규칙 벌크 변환 (탐지 기능 사용 시 필수)

Import된 Sigma 규칙의 YAML을 pySigma로 OpenSearch DSL(Lucene) 쿼리로 변환한다.
변환 결과는 각 규칙의 `opensearch_query` 필드에 저장된다.

```bash
cd backend
python scripts/reconvert_rules.py --all

# dry-run으로 미리보기
python scripts/reconvert_rules.py --all --dry-run

# 실패한 규칙만 재변환
python scripts/reconvert_rules.py --status failed
```

- 파이프라인: `sentinelone_edr_v1` (SentinelOne EDR 필드 매핑)
- 예상 결과: 3,686/3,702 성공 (99.6%), 16건 실패 (pySigma 미지원 기능)
- 소요 시간: ~16초

> **중요:** `sigma_pipeline.py`의 필드 매핑을 변경한 경우 이 스크립트를 다시 실행해야 한다.

---

## 인덱스별 초기화 필요 여부 요약

| 인덱스 | 초기 데이터 필요 | 방법 |
|--------|----------------|------|
| cs_code | **필수** | `4_data_cs_code.json` |
| cs_policies | **필수** | `5_data_cs_policies.json` |
| cs_dashboards | **필수** | `6_data_cs_dashboards.json` |
| cs_users | **필수** (관리자) | `7_data_cs_users_admin.json` (초기 비밀번호: CruxSIEM1!) |
| cs_alerts | 불필요 | 알림 발생 시 자동 생성 |
| cs_login_attempts | 불필요 | 로그인 시 자동 생성 |
| cs_sessions | 불필요 | 로그인 시 자동 생성 |
| cs_notification_rules | 불필요 | UI에서 직접 등록 |
| cs_detection_rules | **필수** | Step 8 `import_sigma.py` + Step 9 `reconvert_rules.py` |
| cs_detection_policies | 불필요 | UI에서 Detector 생성 시 자동 |
| cs_detection_events | 불필요 | 탐지 엔진 실행 시 자동 생성 |
| cs_detection_rule_history | 불필요 | Import 시 자동 생성 |
| cs_rule_import_jobs | 불필요 | Import 시 자동 기록 |
| cs_rule_reconvert_jobs | 불필요 | 재변환 시 자동 기록 |
