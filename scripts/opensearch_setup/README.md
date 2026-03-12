# CruxSIEM - OpenSearch 신규 서버 초기화 가이드

## 실행 순서

```
1_index_cruxsiem.json     → cs_ 인덱스 생성
2_ism.json                → ISM 수명주기 정책 생성
3_index_template_*.json   → 로그 인덱스 템플릿 등록
4_data_cs_code.json       → 역할 코드 초기 데이터 (role-1~4)
5_data_cs_policies.json   → 고급설정 + 패스워드 정책 기본값
6_data_cs_dashboards.json → 대시보드 패널 초기 데이터 (19개)
7_data_cs_users_admin.json → administrator 초기 계정 (초기 비밀번호: CruxSIEM1!)
```

---

## Step 1: cs_ 인덱스 생성

`1_index_cruxsiem.json`의 각 인덱스를 생성:

```bash
OS="http://localhost:9200"

for INDEX in cs_alerts cs_code cs_dashboards cs_login_attempts cs_notification_rules cs_policies cs_sessions cs_users; do
  curl -X PUT "$OS/$INDEX" \
    -H "Content-Type: application/json" \
    -d "$(cat 1_index_cruxsiem.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('$INDEX', {}).get('mappings', {})))")"
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
