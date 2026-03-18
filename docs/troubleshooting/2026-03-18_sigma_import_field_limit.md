# OpenSearch Sigma Rule Import 실패: total fields limit exceeded

> **날짜:** 2026-03-18  
> **환경:** OpenSearch (ns1.cruxdata.co.kr:11723), Python 3.11, opensearch-py  
> **영향 범위:** `cs_detection_rules` 인덱스  
> **해결 상태:** 해결 완료

---

## 배경

SigmaHQ 공식 규칙 저장소의 YAML 파일 약 3,700개를 `cs_detection_rules` 인덱스에 일괄 적재하는 과정에서 대량 실패가 발생했다.

기존에는 Windows 카테고리 23개 파일만 테스트 적재하던 것을, 6개 폴더(rules, rules-compliance, rules-dfir, rules-emerging-threats, rules-placeholder, rules-threat-hunting)로 확장한 첫 번째 전체 Import였다.

### Import 결과

| 항목 | 수 |
|---|---|
| 전체 파일 | 3,702 |
| 신규 INSERT 성공 | 1,037 |
| 실패 | **2,665** |

---

## 에러 분석

실패 로그에서 두 가지 유형의 에러가 반복적으로 나타났다.

### 에러 1: 필드 수 한도 초과

```
RequestError(400, 'illegal_argument_exception',
  'Limit of total fields [1000] has been exceeded')
```

**원인:** OpenSearch 인덱스의 기본 필드 수 한도는 **1,000개**이다. Sigma 규칙의 `detection` 블록을 `detection_config` 필드에 원본 구조 그대로(dynamic mapping) 저장하고 있었기 때문에, 규칙마다 서로 다른 필드 경로가 모두 개별 매핑 필드로 등록되었다.

예를 들어 규칙 A는 `detection_config.selection.CommandLine`, 규칙 B는 `detection_config.filter_main.User`처럼 각각 다른 경로를 사용한다. 3,700개 규칙의 detection 구조가 합쳐지면 고유 필드 경로가 수천 개에 달해 1,000개 한도를 초과한다.

### 에러 2: 매핑 타입 충돌

```
RequestError(400, 'mapper_parsing_exception',
  'object mapping for [detection_config.selection] tried to parse field [null]
   as object, but found a concrete value')
```

```
RequestError(400, 'mapper_parsing_exception',
  "failed to parse field [detection_config.keywords] of type [text] ...
   Preview of field's value: '{|all=[grep, password]}'")
```

**원인:** 먼저 적재된 규칙이 `detection_config.selection`을 object로 매핑한 후, 이후 규칙이 같은 경로에 string이나 null을 넣으려 하면 타입 충돌이 발생한다. `keywords` 필드도 마찬가지로 text로 매핑된 뒤 object가 들어오면 파싱에 실패한다.

Sigma 규칙의 detection 블록은 규칙마다 구조가 완전히 다르기 때문에, dynamic mapping으로는 일관된 매핑을 유지할 수 없다.

---

## 근본 원인

`detection_config` 필드를 **dynamic mapping(기본값)** 상태로 저장한 것이 문제다.

```python
# import 스크립트의 parse_sigma_yaml()
doc = {
    ...
    "detection_config": parsed.get("detection") or {},  # 원본 구조 그대로 저장
    ...
}
```

OpenSearch는 JSON 문서가 인덱싱될 때 내부 필드 경로를 자동으로 매핑에 추가한다. `detection_config` 하위의 모든 키가 매핑 필드로 등록되면서:

1. 고유 필드 수가 1,000개를 초과 → **에러 1**
2. 같은 경로에 다른 타입의 값이 들어옴 → **에러 2**

---

## 해결 방법

`detection_config` 필드에 `"enabled": false` 매핑을 적용한다. 이렇게 하면 OpenSearch가 해당 필드의 내부 구조를 인덱싱하지 않고 원본 JSON을 그대로 저장만 한다.

### 1단계: 인덱스 삭제 및 재생성

```bash
# 기존 인덱스 삭제
curl -X DELETE "http://<host>:<port>/cs_detection_rules"

# 매핑 지정하여 재생성
curl -X PUT "http://<host>:<port>/cs_detection_rules" -H 'Content-Type: application/json' -d '
{
  "mappings": {
    "properties": {
      "detection_config": {
        "type": "object",
        "enabled": false
      }
    }
  }
}
'
```

### 2단계: Import 재실행

```bash
cd backend
python scripts/import_sigma.py
```

### 왜 `enabled: false`인가?

| 옵션 | 인덱싱 | 검색 가능 | 저장 | 적합한 경우 |
|---|---|---|---|---|
| dynamic: true (기본) | O | O | O | 구조가 일정한 필드 |
| dynamic: false | X (새 필드 무시) | 매핑된 필드만 | O | 일부만 검색 필요 |
| **enabled: false** | **X** | **X** | **O** | **저장/조회만 필요** |

`detection_config`는 규칙 상세 조회 시 원본을 반환하는 용도로만 사용하고, 이 필드 내부를 검색 조건으로 사용하지 않으므로 `enabled: false`가 최적이다.

---

## 재발 방지

1. **인덱스 매핑 사전 정의:** 스크립트에서 인덱스 자동 생성 시 매핑을 함께 지정하도록 `preflight_check()` 로직을 개선한다.
2. **raw_yaml 활용:** detection 내용이 필요하면 `raw_yaml` 필드(원본 YAML 문자열)를 파싱하여 사용한다. `detection_config`에 대한 직접 검색은 지양한다.

---

## 참고

- [OpenSearch - Mapping parameters: enabled](https://opensearch.org/docs/latest/field-types/supported-field-types/object/#the-enabled-parameter)
- [OpenSearch - Index settings: total fields limit](https://opensearch.org/docs/latest/install-and-configure/configuring-opensearch/index-settings/)
