# 알림 메시지 미리보기 시스템 연구 문서

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [아키텍처 & 데이터 흐름](#2-아키텍처--데이터-흐름)
3. [백엔드: 메시지 템플릿 렌더링](#3-백엔드-메시지-템플릿-렌더링)
4. [프론트엔드: 미리보기 렌더링](#4-프론트엔드-미리보기-렌더링)
5. [백엔드 vs 프론트엔드 차이점](#5-백엔드-vs-프론트엔드-차이점)
6. [Webhook Body 템플릿](#6-webhook-body-템플릿)
7. [사용 가능한 변수 목록](#7-사용-가능한-변수-목록)
8. [변수 해석 우선순위](#8-변수-해석-우선순위)
9. [알려진 이슈 & 불일치](#9-알려진-이슈--불일치)
10. [테스트 커버리지](#10-테스트-커버리지)

---

## 1. 시스템 개요

알림 메시지 미리보기 시스템은 **두 개의 병렬 구현**으로 구성된다:

| 구현 | 위치 | 용도 |
|------|------|------|
| **백엔드 (Python)** | `backend/app/services/notification.py` | 실제 알림 생성 시 메시지 렌더링 |
| **프론트엔드 (TypeScript)** | `frontend/src/pages/admin/alerts/tabs/NotificationRuleListTab.tsx` | UI에서 실시간 미리보기 |

두 구현은 동일한 `{{변수}}` 문법을 사용하지만, 해석 범위와 동작에 차이가 있다.

---

## 2. 아키텍처 & 데이터 흐름

### 프론트엔드 미리보기 흐름

```
[사용자가 메시지 템플릿 입력]
        │
        ▼
[사용자가 "쿼리 실행" 클릭]
        │
        ▼
handleTestQuery() → notificationService.testQuery(target_index, condition_config)
        │
        ▼
[백엔드] POST /api/v1/notifications/test-query → OpenSearch 쿼리 실행 → raw 응답 반환
        │
        ▼
[프론트엔드] queryTestResult = OpenSearch raw 응답 저장
        │
        ▼
renderMessagePreview (useMemo) → {{변수}}를 queryTestResult + formData로 치환
        │
        ▼
NotificationRuleDetail 컴포넌트에서 미리보기 표시
```

### 백엔드 실제 알림 생성 흐름

```
[스케줄러가 탐지 규칙 실행]
        │
        ▼
run_detection_for_rule() → OpenSearch 쿼리 실행
        │
        ▼
_create_aggregation_alert() → template_context 구성
        │
        ▼
_render_message_template(template, context) → {{변수}} 치환
        │
        ▼
렌더링된 메시지를 cs_alerts 인덱스에 저장
        │
        ▼
_deliver_alert() → WebSocket 전송 + Webhook 발송
```

---

## 3. 백엔드: 메시지 템플릿 렌더링

### 핵심 함수: `_render_message_template`

**파일**: `backend/app/services/notification.py` (line 155-238)

#### 정규식

```python
re.sub(r"\{\{\s*([\w\.@]+)\s*\}\}", replace_var, template)
```

- `[\w\.@]+` : 영숫자, 밑줄, 점(.), @만 허용
- `\s*` : 중괄호 안 앞뒤 공백 허용
- 예: `{{ endpoint.name }}` → 유효, `{{ a[0] }}` → 매칭 안 됨

#### 변수 해석 알고리즘 (`replace_var`)

```
{{변수명}} 발견 시:

1. 단순 키 (점 없음, 예: {{total}})
   ├─ context[key] 조회 → 값 있으면 반환
   ├─ _hit_sources[0][key] 조회 (fallback) → 값 있으면 반환
   └─ 값 없으면 → "{{key}}" 그대로 유지

2. 중첩 키 (점 있음, 예: {{endpoint.name}})
   ├─ context에서 중첩 탐색 (context["endpoint"]["name"]) → 값 있으면 반환
   ├─ context에서 flattened key 탐색 (context["endpoint.name"]) → 값 있으면 반환
   ├─ _hit_sources 전체 순회 → 각 hit에서 값 추출
   │   ├─ 중첩 탐색: hit["endpoint"]["name"]
   │   └─ flattened 탐색: hit["endpoint.name"]
   │   → 유니크 값만 추출 → 줄바꿈(\n)으로 합쳐서 반환
   └─ 값 없으면 → "{{key}}" 그대로 유지
```

#### `get_nested_value` 헬퍼

```python
def get_nested_value(obj, keys):
    # 1단계: 일반 중첩 구조 탐색 (obj["a"]["b"]["c"])
    # 2단계: flattened key 탐색 (obj["a.b.c"])
```

- dict 아닌 값을 만나면 중첩 탐색 중단
- flattened key fallback은 OpenSearch가 점 포함 필드명을 반환하는 경우 대응

#### `to_str` 변환

```python
def to_str(value):
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)
```

- dict/list는 JSON 문자열로 변환 (pretty print)
- 그 외는 `str()` 변환

### template_context 구성

**파일**: `backend/app/services/notification.py` (line 454-470)

```python
template_context = {
    **result,                          # OpenSearch 전체 응답 (hits, aggregations 등)
    "total": total,                    # hits.total.value
    "rule_name": rule.get("name"),
    "rule_id": rule_id,
    "rule_severity": rule.get("severity"),
    "target_index": target_index,
    "_hit_sources": hit_sources,       # [hit["_source"] for hit in hits]
}
```

`**result`로 OpenSearch 응답 전체를 spread하므로, `{{hits.total.value}}`, `{{aggregations.threats.buckets}}` 같은 깊은 경로도 접근 가능하다.

---

## 4. 프론트엔드: 미리보기 렌더링

### 핵심 로직: `renderMessagePreview`

**파일**: `frontend/src/pages/admin/alerts/tabs/NotificationRuleListTab.tsx` (line 152-190)

```typescript
const renderMessagePreview = useMemo(() => {
  let preview = formData.message_template;
  if (queryTestResult) {
    const total = queryTestResult.hits?.total?.value || 0;
    const hits = queryTestResult.hits?.hits || [];
    const hitSources = hits.map((h: any) => h._source);

    preview = preview.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmed = varName.trim();

      // 하드코딩된 특수 변수
      if (trimmed === 'total') return String(total);
      if (trimmed === 'rule_name') return formData.name || trimmed;
      if (trimmed === 'rule_severity') return formData.severity || trimmed;
      if (trimmed === 'rule_target_index') return formData.target_index || trimmed;

      // _hit_sources에서 탐색
      if (hitSources.length > 0) {
        const values = hitSources.map((source: any) => {
          const val = getNestedValue(source, trimmed);
          return val !== null && val !== undefined ? String(val) : null;
        }).filter((v: string | null) => v !== null);
        if (values.length > 0) {
          const uniqueValues = Array.from(new Set(values));
          return uniqueValues.join('\n');
        }
      }
      return match; // 미해석 변수는 그대로 유지
    });
  }
  return preview;
}, [formData.message_template, formData.name, formData.severity, formData.target_index, queryTestResult]);
```

#### 정규식

```javascript
/\{\{([^}]+)\}\}/g
```

- `[^}]+` : `}` 제외 모든 문자 허용 → 백엔드보다 관대함
- 예: `{{ a[0] }}` → 매칭됨 (백엔드에서는 안 됨)

#### 변수 해석 알고리즘

```
1. queryTestResult 없음 → 템플릿 원문 그대로 표시
2. queryTestResult 있음:
   ├─ "total" → queryTestResult.hits.total.value
   ├─ "rule_name" → formData.name
   ├─ "rule_severity" → formData.severity
   ├─ "rule_target_index" → formData.target_index
   ├─ 기타 변수 → hitSources 전체 순회
   │   ├─ getNestedValue(source, path) → 중첩 탐색
   │   └─ source[path] fallback → flattened key 탐색
   │   → 유니크 값만 추출 → 줄바꿈(\n)으로 합치기
   └─ 못 찾으면 → "{{변수명}}" 그대로 유지
```

#### `getNestedValue` (프론트엔드)

```typescript
const getNestedValue = (obj: any, path: string): any => {
  const keys = path.split('.');
  let value = obj;
  let foundNested = true;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      foundNested = false;
      break;
    }
  }
  if (foundNested) return value;
  if (obj[path] !== undefined) return obj[path];  // flattened key fallback
  return null;
};
```

### UI 표시

**파일**: `frontend/src/pages/admin/alerts/components/NotificationRuleDetail.tsx`

- `renderMessagePreview`는 `NotificationRuleListTab` → `NotificationRuleDetail`로 prop 전달
- `<Typography>` 컴포넌트에서 `whiteSpace: 'pre-wrap'`으로 줄바꿈 유지
- `queryTestResult`가 없을 때는 `runQueryPreviewHint` 안내 메시지 표시

---

## 5. 백엔드 vs 프론트엔드 차이점

| 구분 | 백엔드 | 프론트엔드 |
|------|--------|-----------|
| **정규식** | `[\w\.@]+` (엄격) | `[^}]+` (관대) |
| **단순 키 → _hit_sources fallback** | O (`_hit_sources[0]`에서 탐색) | X (하드코딩된 4개 변수만) |
| **OpenSearch 전체 응답 접근** | O (`{{hits.total.value}}`, `{{aggregations.*}}`) | X (hitSources만 접근) |
| **`{{rule_id}}` 지원** | O | X |
| **값이 dict/list일 때** | JSON pretty print | `String()` 변환 |
| **context 구성** | OpenSearch 전체 응답 + 메타 + _hit_sources | queryTestResult raw 응답에서 직접 추출 |

---

## 6. Webhook Body 템플릿

### 핵심 함수: `_build_webhook_payload`

**파일**: `backend/app/services/notification.py` (line 405-425)

메시지 템플릿 렌더링과는 **완전히 다른 방식**으로 동작한다.

```python
def _build_webhook_payload(self, body_template, template_vars):
    # 1. 빈 템플릿 → 빈 객체 {} 반환
    # 2. 단순 str.replace로 {{key}} 치환 (중첩 키 미지원)
    # 3. 미해석 변수는 빈 문자열로 제거
    # 4. json.loads()로 파싱 → 반드시 유효한 JSON이어야 함
    # 5. 파싱 실패 시 빈 객체 {} 반환
```

| 구분 | 메시지 템플릿 | Webhook Body |
|------|-------------|-------------|
| **치환 방식** | `re.sub` + 복잡한 해석 | `str.replace` 루프 |
| **중첩 키** | O (`{{endpoint.name}}`) | X (flat 키만) |
| **_hit_sources 탐색** | O | X |
| **미해석 변수** | 원문 유지 (`{{key}}`) | 빈 문자열로 제거 |
| **출력 형식** | 문자열 | JSON 객체 (json.loads) |
| **JSON 이스케이프** | X | O (json.dumps로 안전 처리) |

### Webhook 사용 가능 변수 (6개만)

```python
template_vars = {
    "id":                alert_id,
    "rule_name":         created_alert.get("rule_name"),
    "rule_severity":     created_alert.get("rule_severity"),
    "message":           created_alert.get("message"),        # 렌더링된 메시지
    "created_at":        created_alert.get("created_at"),
    "rule_target_index": created_alert.get("rule_target_index"),
}
```

---

## 7. 사용 가능한 변수 목록

### 메시지 템플릿 변수

| 변수 | 소스 | 예시 값 | 프론트 미리보기 |
|------|------|--------|:---:|
| `{{total}}` | `hits.total.value` | `42` | O |
| `{{rule_name}}` | 규칙명 | `"High Threat Detection"` | O (formData) |
| `{{rule_id}}` | 규칙 ID | `"rule-001"` | X |
| `{{rule_severity}}` | 심각도 | `"critical"` | O (formData) |
| `{{target_index}}` | 대상 인덱스 | `"logs-sentinel_one.edr"` | X |
| `{{rule_target_index}}` | 대상 인덱스 (alias) | `"logs-sentinel_one.edr"` | O (formData) |
| `{{hits.total.value}}` | OpenSearch 전체 응답 중첩 접근 | `5` | X |
| `{{aggregations.*.buckets}}` | 집계 결과 | JSON array | X |
| `{{endpoint.name}}` | _hit_sources 중첩 필드 | `"web-01"` | O |
| `{{threatInfo.threatName}}` | _hit_sources 중첩 필드 (중복 제거, 줄바꿈 구분) | `"Malware.Gen\nTrojan"` | O |

### Webhook Body 변수

| 변수 | 소스 | 예시 값 |
|------|------|--------|
| `{{id}}` | 알림 ID | `"alert-abc123"` |
| `{{rule_name}}` | 규칙명 | `"High Threat Detection"` |
| `{{rule_severity}}` | 심각도 | `"critical"` |
| `{{message}}` | 렌더링된 메시지 (위 메시지 템플릿 결과) | 전체 메시지 문자열 |
| `{{created_at}}` | 알림 생성 시각 | `"2026-03-12T10:00:00"` |
| `{{rule_target_index}}` | 대상 인덱스 | `"logs-sentinel_one.edr"` |

---

## 8. 변수 해석 우선순위

### 백엔드 (단순 키, 예: `{{total}}`)

```
1. context["total"] 직접 조회
2. _hit_sources[0]["total"] fallback
3. 못 찾으면 → "{{total}}" 유지
```

### 백엔드 (중첩 키, 예: `{{endpoint.name}}`)

```
1. context["endpoint"]["name"] 중첩 탐색
2. context["endpoint.name"] flattened key
3. _hit_sources 전체 순회:
   3a. hit["endpoint"]["name"] 중첩 탐색
   3b. hit["endpoint.name"] flattened key
   → 유니크 값 추출, \n 구분
4. 못 찾으면 → "{{endpoint.name}}" 유지
```

### 프론트엔드

```
1. 하드코딩 매칭: total, rule_name, rule_severity, rule_target_index
2. hitSources 전체 순회:
   2a. getNestedValue(source, path) → 중첩 탐색 + flattened fallback
   → 유니크 값 추출, \n 구분
3. 못 찾으면 → "{{변수명}}" 유지
```

---

## 9. 알려진 이슈 & 불일치

### 1. 단순 키 _hit_sources fallback 불일치

**백엔드 코드** (line 204-207)에서는 단순 키도 `_hit_sources[0]`에서 탐색한다:

```python
# 단순 키 접근 (total, rule_name 등)
if '.' not in key:
    value = context.get(key)
    if value is None:
        hit_sources = context.get("_hit_sources", [])
        if hit_sources and isinstance(hit_sources, list):
            value = hit_sources[0].get(key)  # ← fallback
```

그러나 **테스트 파일** (`test_hit_sources_simple_key_not_resolved`)은 단순 키가 `_hit_sources`를 탐색하지 **않는다**고 단언한다:

```python
def test_hit_sources_simple_key_not_resolved(self, service):
    template = "호스트: {{host}}"
    ctx = {"_hit_sources": [{"host": "web-01"}]}
    result = service._render_message_template(template, ctx)
    assert result == "호스트: {{host}}"  # ← 실제 코드와 불일치
```

**현재 상태**: 이 테스트는 실패하고 있음 (코드가 실제로 `"web-01"`을 반환).

### 2. 프론트엔드에서 접근 불가한 변수

프론트엔드 미리보기에서는 다음 변수들이 해석되지 않는다:
- `{{rule_id}}` — 아직 저장 전이므로 ID 없음
- `{{target_index}}` — `rule_target_index`만 지원
- `{{hits.total.value}}` — OpenSearch 응답의 전체 구조 탐색 미지원
- `{{aggregations.*}}` — 집계 결과 접근 미지원

### 3. 정규식 차이

- 백엔드: `[\w\.@]+` → `{{a[0]}}` 매칭 안 됨
- 프론트엔드: `[^}]+` → `{{a[0]}}` 매칭됨 (하지만 해석은 안 됨)
- 사용자가 잘못된 변수를 입력하면 양쪽에서 다르게 처리될 수 있음

### 4. Webhook Body의 제한적 변수 세트

Webhook Body 템플릿은 6개 변수만 사용 가능하며, `_hit_sources` 필드에 접근할 수 없다. 메시지 템플릿에서 `{{endpoint.name}}`을 쓸 수 있지만 Webhook Body에서는 불가능하다.

---

## 10. 테스트 커버리지

**파일**: `backend/tests/test_services/test_notification.py` (`TestMessageTemplateRendering` 클래스)

| 테스트 | 검증 내용 | 상태 |
|--------|----------|------|
| `test_simple_variable` | `{{total}}` → `"42"` | PASS |
| `test_nested_variable` | `{{hits.total.value}}` → `"100"` | PASS |
| `test_multiple_variables` | 여러 변수 동시 치환 | PASS |
| `test_missing_variable_preserved` | 미해석 변수 원문 유지 | PASS |
| `test_hit_sources_extraction_with_nested_key` | 중첩 키로 _hit_sources 탐색 + 중복 제거 | PASS |
| `test_hit_sources_simple_key_not_resolved` | 단순 키 _hit_sources 미탐색 (코드와 불일치) | **FAIL** |
| `test_empty_template` | 빈 템플릿 → 빈 문자열 | PASS |

**프론트엔드 테스트**: `renderMessagePreview`에 대한 단위 테스트는 현재 없음.
