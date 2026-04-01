# setup/opensearch/

OpenSearch 설치, 설정, CS_ 인덱스 초기화 가이드.

---

## 설치 환경

- 권장 사양: RAM 32GB 이상 (JVM 힙 14GB 설정 기준)
- 데이터 경로: `/data/opensearch`
- 로그 경로: `/logs/opensearch`
- 실행 사용자: `cruxsiem`

---

## 주요 설정값 (`opensearch.yml`)

```yaml
cluster.name: <클러스터명>           # 예: demo-cruxsiem
node.name: node-1
node.roles: [data, data_hot, ingest, cluster_manager, remote_cluster_client]
path.data: /data/opensearch
path.logs: /logs/opensearch
http.port: 9200
```

> 설정 파일 위치: `setup/OPA/opensearch/opensearch.yml` (실제 파일)

---

## JVM 메모리 설정 (`jvm.options`)

```
-Xms14g
-Xmx14g
```

> 서버 RAM의 50% 이하로 설정. 힙 dump 경로: `/logs/opensearch/`

---

## systemd 서비스 등록

```bash
cp setup/OPA/opensearch/systemd/user/opensearch.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable opensearch
systemctl --user start opensearch
```

---

## CS_ 인덱스 초기화 순서

실행 전 OpenSearch가 구동 중이어야 한다.

```bash
OS="http://localhost:9200"    # 또는 실제 호스트
```

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `1_index_cruxsiem.json` | cs_ 시스템 인덱스 매핑 전체 |
| 2 | `2_ism.json` | ISM 수명주기 정책 |
| 3 | `3_index_template_*.json` | 로그 수집 인덱스 템플릿 (edr, agents, threats) |
| 4 | `4_data_cs_code.json` | 역할 코드 (role-1~4) |
| 5 | `5_data_cs_policies.json` | 고급설정 + 패스워드 정책 기본값 |
| 6 | `6_data_cs_dashboards.json` | 대시보드 패널 초기 데이터 |
| 7 | `7_data_cs_users_admin.json` | 관리자 계정 (초기 비밀번호: CruxSIEM1!) |

> **주의:** 최초 로그인 후 반드시 비밀번호 변경.

### Step 1: cs_ 인덱스 생성

```bash
for INDEX in cs_alerts cs_code cs_dashboards cs_login_attempts \
  cs_notification_rules cs_policies cs_sessions cs_users \
  cs_detection_rules cs_detection_policies cs_detection_events \
  cs_detection_rule_history cs_rule_import_jobs cs_rule_reconvert_jobs \
  cs_action cs_action_history; do
  curl -s -X PUT "$OS/$INDEX" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json,sys
d=json.load(open('1_index_cruxsiem.json'))
m=d.get('$INDEX',{})
body={'mappings':m.get('mappings',{})}
s=m.get('settings',{}).get('index',{})
clean={k:v for k,v in s.items() if k in ('number_of_shards','number_of_replicas','refresh_interval')}
body['settings']={'index':clean} if clean else {}
print(json.dumps(body))")"
  echo ""
done
```

### Step 2: ISM 정책 등록

```bash
curl -X PUT "$OS/_plugins/_ism/policies/sentinel_one_policy" \
  -H "Content-Type: application/json" \
  -d "$(cat 2_ism.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['policy']))")"
```

### Step 3: 인덱스 템플릿 등록

```bash
for TEMPLATE in edr agents threats; do
  NAME=$(cat 3_index_template_${TEMPLATE}.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.keys())[0])")
  curl -X PUT "$OS/_index_template/$NAME" \
    -H "Content-Type: application/json" \
    -d "$(cat 3_index_template_${TEMPLATE}.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(list(d.values())[0]))")"
done
```

### Step 4~7: 초기 데이터 삽입

```bash
for DATA in 4_data_cs_code.json 5_data_cs_policies.json \
            6_data_cs_dashboards.json 7_data_cs_users_admin.json; do
  curl -X POST "$OS/_bulk" \
    -H "Content-Type: application/x-ndjson" \
    --data-binary @${DATA}
  echo ""
done
```

### Step 8~9: Sigma 규칙 적재 (탐지 기능 사용 시 필수)

```bash
cd backend
python scripts/import_sigma.py
python scripts/reconvert_rules.py --all
```

---

## 인덱스별 초기 데이터 필요 여부

| 인덱스 | 초기 데이터 | 비고 |
|--------|------------|------|
| cs_code | 필수 | role-1~4 코드 |
| cs_policies | 필수 | 고급설정, 패스워드 정책 |
| cs_dashboards | 필수 | 대시보드 패널 |
| cs_users | 필수 | 관리자 계정 |
| cs_action | 불필요 | UI에서 등록 |
| cs_alerts | 불필요 | 알림 발생 시 자동 |
| cs_sessions | 불필요 | 로그인 시 자동 |
| cs_detection_rules | 필수 | Step 8 Sigma import |

