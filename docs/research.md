# 알림 시스템 (Alerts) 전체 연구 문서

## 목차

1. [파일 인벤토리](#1-파일-인벤토리)
2. [컴포넌트 계층 구조](#2-컴포넌트-계층-구조)
3. [상태 관리 (전체 Hook 목록)](#3-상태-관리-전체-hook-목록)
4. [Props 흐름 (전체 데이터 전달)](#4-props-흐름-전체-데이터-전달)
5. [API 호출](#5-api-호출)
6. [이벤트 핸들러](#6-이벤트-핸들러)
7. [비즈니스 로직](#7-비즈니스-로직)
8. [메시지 미리보기 시스템](#8-메시지-미리보기-시스템)
9. [Webhook Body 템플릿](#9-webhook-body-템플릿)
10. [사용 가능한 변수 목록](#10-사용-가능한-변수-목록)
11. [i18n 키 목록](#11-i18n-키-목록)
12. [타입/인터페이스](#12-타입인터페이스)
13. [외부 의존성](#13-외부-의존성)
14. [알려진 이슈 & 개선점](#14-알려진-이슈--개선점)

---

## 1. 파일 인벤토리

**총 11개 파일, ~2,500 lines**

| # | 파일 경로 | Lines | 역할 |
|---|----------|-------|------|
| 1 | `components/index.ts` | 4 | 배럴 export |
| 2 | `components/SeverityChip.tsx` | 47 | 심각도별 컬러 Chip 렌더링 |
| 3 | `components/AlertTableStyles.ts` | 105 | 공유 테이블 스타일, 날짜 포맷터, 필터 옵션 상수 |
| 4 | `components/AlertsControlBar.tsx` | 505 | Kibana 스타일 검색 + 시간 범위 선택 + 자동 새로고침 툴바 |
| 5 | `components/GlobalAlertSnackbar.tsx` | 105 | 실시간 위협 알림 스택형 스낵바 |
| 6 | `components/NotificationRuleList.tsx` | 134 | 마스터 패널 — 규칙 목록 (선택/활성 토글) |
| 7 | `components/NotificationRuleDetail.tsx` | 429 | 디테일 패널 — 규칙 생성/수정 폼 (DSL 에디터, 웹훅, 이력) |
| 8 | `components/AlertTableFilterMenu.tsx` | 70 | 체크박스 기반 드롭다운 필터 메뉴 |
| 9 | `components/WebhookHeadersEditor.tsx` | 114 | Postman 스타일 Key-Value 헤더 에디터 (Autocomplete) |
| 10 | `tabs/NotificationRuleListTab.tsx` | 633 | **메인 오케스트레이터** — 마스터-디테일 레이아웃, 전체 CRUD, Export/Import |
| 11 | `tabs/NotificationHistoryTab.tsx` | 354 | 알림 발송 내역 조회 (검색, 시간 범위, 심각도 필터, 페이지네이션) |

---

## 2. 컴포넌트 계층 구조

```
NotificationRuleListTab (tabs/)
├── LinearProgress (로딩 바)
├── Action Bar (Export / Import / Delete 버튼)
├── NotificationRuleList (components/)
│   ├── Checkbox (전체 선택)
│   ├── Button (규칙 추가)
│   └── List > ListItemButton (각 규칙)
│       ├── Checkbox (개별 선택)
│       ├── ListItemText (규칙명)
│       ├── SeverityChip (심각도)
│       └── Switch (활성 토글)
├── Resize Handle (드래그 구분선)
├── NotificationRuleDetail (components/)
│   ├── MonacoEditor (DSL 쿼리 에디터)
│   ├── MonacoEditor (웹훅 본문 에디터)
│   ├── WebhookHeadersEditor (components/)
│   │   ├── Autocomplete (헤더 Key 드롭다운)
│   │   ├── TextField (헤더 Value)
│   │   └── IconButton (행 삭제)
│   └── 변경 이력 테이블
├── Dialog (삭제 확인)
└── Snackbar (성공/에러 피드백)

NotificationHistoryTab (tabs/)
├── LinearProgress (로딩 바)
├── AlertsControlBar (components/)
│   ├── Search TextField
│   ├── Time Picker (Popover)
│   │   ├── Quick Select (공통 범위)
│   │   ├── DateCalendar (절대 날짜)
│   │   └── Relative / Now 탭
│   ├── Refresh 버튼
│   └── Auto-Refresh 컨트롤
├── 결과 헤더
├── Paper (스크롤 테이블)
│   ├── 헤더 행 (FilterListIcon → AlertTableFilterMenu)
│   └── 확장 가능한 행 (Collapse → 메시지 내용)
├── 페이지네이션 바
└── AlertTableFilterMenu (심각도 필터 팝업)
```

---

## 3. 상태 관리 (전체 Hook 목록)

### 3.1 NotificationRuleListTab.tsx (633 lines — 메인 상태 소유자)

#### useState

| 변수 | 타입 | 용도 |
|------|------|------|
| `rules` | `NotificationRule[]` | API에서 가져온 규칙 목록 |
| `total` | `number` | 총 규칙 수 |
| `page` | `number` | 현재 페이지 (항상 0, setter 미노출) |
| `rowsPerPage` | `number` | 페이지당 항목 수 (settings에서 초기화) |
| `loading` | `boolean` | 로딩 상태 |
| `listWidth` | `number` | 마스터 패널 너비 (기본 320px, 리사이즈 가능) |
| `selectedRule` | `NotificationRule \| null` | 현재 선택된 규칙 |
| `showForm` | `boolean` | 디테일 폼 표시 여부 |
| `deleteIds` | `string[]` | 삭제 대기 ID 목록 (Dialog open 제어) |
| `formData` | `NotificationRuleCreate` | 생성/수정 폼 상태 |
| `dslString` | `string` | Monaco DSL 에디터의 JSON 문자열 |
| `jsonError` | `string \| null` | DSL JSON 파싱 에러 |
| `webhookHeaders` | `HeaderEntry[]` | 웹훅 헤더 Key-Value 쌍 |
| `webhookBodyStr` | `string` | 웹훅 본문 JSON 문자열 |
| `snackbar` | `{open, message, severity}` | 스낵바 알림 상태 |
| `queryTestLoading` | `boolean` | 쿼리 테스트 로딩 |
| `queryTestResult` | `any \| null` | 쿼리 테스트 OpenSearch 응답 |
| `queryTestError` | `string \| null` | 쿼리 테스트 에러 |
| `triggerTestLoading` | `boolean` | 트리거 테스트 로딩 |
| `triggerTestResult` | `{evaluation, total, has_aggregations} \| null` | 트리거 테스트 결과 |
| `triggerTestError` | `string \| null` | 트리거 테스트 에러 |
| `selectedRuleIds` | `Set<string>` | 다중 선택 Set (Export/Delete용) |

#### useRef

| Ref | 타입 | 용도 |
|-----|------|------|
| `isResizing` | `MutableRefObject<boolean>` | 패널 리사이즈 활성 여부 |
| `originalFormRef` | `MutableRefObject<string>` | 변경 감지용 원본 폼 데이터 JSON 스냅샷 |
| `fileInputRef` | `RefObject<HTMLInputElement>` | Import용 숨겨진 파일 입력 |

#### useMemo

| 변수 | 의존성 | 용도 |
|------|--------|------|
| `renderMessagePreview` | `formData.message_template, name, severity, target_index, queryTestResult, selectedRule` | `{{변수}}` 치환으로 메시지 미리보기 생성 |

#### useCallback

| 함수 | 의존성 | 용도 |
|------|--------|------|
| `handleMouseDown` | `[]` | 패널 리사이즈 시작 (전역 mousemove/mouseup 리스너 등록) |
| `loadRules` | `[page, rowsPerPage]` | API에서 규칙 목록 조회 |

#### useEffect

| 이펙트 | 의존성 | 용도 |
|--------|--------|------|
| `fetchRoleCodes()` | `[fetchRoleCodes]` | 마운트 시 역할 코드 로드 |
| `fetchSettings()` | `[fetchSettings]` | 마운트 시 설정 로드 |
| settings 적용 | `[settings]` | `pagination_size`로 `rowsPerPage` 설정 |
| `loadRules()` | `[loadRules]` | page/rowsPerPage 변경 시 규칙 재로드 |

#### 외부 Hook

| Hook | 반환값 | 용도 |
|------|--------|------|
| `useAuth()` | `{ user }` | 역할 권한 체크 |
| `useTranslation()` | `{ t, language }` | 다국어 |
| `useWebSocket()` | — | `new_alert` 수신 시 규칙 목록 새로고침 |
| `useRoleCodesStore()` | `{ roleCodes, roleNames, fetch }` | 역할 코드/이름 조회 |
| `useSettingsStore()` | `{ settings, fetchSettings }` | 앱 설정 (페이지네이션, 시간 필터) |

---

### 3.2 NotificationHistoryTab.tsx (354 lines)

#### useState

| 변수 | 타입 | 용도 |
|------|------|------|
| `notifications` | `NotificationHistory[]` | 알림 내역 |
| `total` | `number` | 총 결과 수 |
| `page` | `number` | 현재 페이지 |
| `rowsPerPage` | `number` | 페이지당 항목 수 (기본 25) |
| `pageSizeOptions` | `number[]` | `[20, 50, 100, 500]` |
| `loading` | `boolean` | 로딩 상태 |
| `searchQuery` | `string` | 검색어 |
| `selectedSeverities` | `string[]` | 활성 심각도 필터 |
| `expandedRows` | `Set<number>` | 확장된 행 인덱스 Set |
| `fromValue`, `fromUnit`, `toValue`, `toUnit`, `fromDate`, `toDate` | 시간 상태 | 시간 범위 6개 변수 |
| `severityAnchor` | `HTMLElement \| null` | 심각도 필터 메뉴 앵커 |

---

### 3.3 AlertsControlBar.tsx (505 lines)

#### useState

| 변수 | 타입 | 용도 |
|------|------|------|
| `tempQuery` | `string` | 로컬 검색 입력 (Enter로 제출) |
| `anchorEl` | `HTMLDivElement \| null` | Popover 앵커 |
| `popoverType` | `'quick' \| 'detailed'` | 팝오버 뷰 타입 |
| `editingPoint` | `'from' \| 'to'` | 편집 중인 시간 엔드포인트 |
| `tabValue` | `number` | 상세 팝오버 탭 (0=절대, 1=상대, 2=현재) |
| `popoverVal` | `number` | 시간 입력 숫자값 |
| `popoverUnit` | `string` | 시간 입력 단위 (m/h/d) |
| `popoverDate` | `Dayjs` | 절대 날짜 선택 |
| `popoverTime` | `string` | 절대 시간 선택 (HH:mm) |
| `autoRefreshValue` | `number` | 자동 새로고침 간격 값 |
| `autoRefreshUnit` | `'seconds' \| 'minutes'` | 자동 새로고침 간격 단위 |
| `isRefreshing` | `boolean` | 자동 새로고침 활성 여부 |

---

### 3.4 나머지 컴포넌트

`NotificationRuleDetail`, `SeverityChip`, `AlertTableFilterMenu`, `WebhookHeadersEditor`, `GlobalAlertSnackbar`는 모두 **순수 프레젠테이션** — 내부 상태 없이 props만으로 동작.

---

## 4. Props 흐름 (전체 데이터 전달)

### NotificationRuleListTab → NotificationRuleList

| Prop | 타입 | 출처 |
|------|------|------|
| `width` | `number` | `listWidth` state |
| `rules` | `NotificationRule[]` | `rules` state |
| `selectedRuleId` | `string \| null` | `selectedRule?.id` |
| `selectedRuleIds` | `Set<string>` | `selectedRuleIds` state |
| `onSelect` | `(rule) => void` | `handleSelectRule` |
| `onToggleSelect` | `(ruleId) => void` | inline — `selectedRuleIds` Set 토글 |
| `onSelectAll` | `(checked) => void` | inline — 전체 선택/해제 |
| `onAdd` | `() => void` | `handleAddNew` |
| `onToggleActive` | `(rule) => void` | `handleToggleActive` |
| `loading` | `boolean` | `loading` state |
| `t` | function | 번역 함수 |

### NotificationRuleListTab → NotificationRuleDetail

| Prop | 타입 | 출처 |
|------|------|------|
| `showForm` | `boolean` | `showForm` state |
| `isEditing` | `boolean` | `!!selectedRule` |
| `formData` | `NotificationRuleCreate` | `formData` state |
| `onFormDataChange` | `(data) => void` | `setFormData` |
| `onSave` | `() => void` | `handleSave` |
| `onDelete` | `() => void` | inline — `deleteIds` 설정 |
| `t` | function | 번역 함수 |
| `dslString` | `string` | `dslString` state |
| `onDslChange` | `(value) => void` | `handleDslChange` |
| `jsonError` | `string \| null` | state |
| `onTestQuery` | `() => void` | `handleTestQuery` |
| `queryTestLoading` | `boolean` | state |
| `queryTestResult` | `any` | state |
| `queryTestError` | `string \| null` | state |
| `onTestTrigger` | `() => void` | `handleTestTrigger` |
| `triggerTestLoading` | `boolean` | state |
| `triggerTestResult` | object \| null | state |
| `triggerTestError` | `string \| null` | state |
| `renderMessagePreview` | `string` | useMemo 결과 |
| `webhookHeaders` | `HeaderEntry[]` | state |
| `onWebhookHeadersChange` | `(headers) => void` | `handleWebhookHeadersChange` |
| `webhookBodyStr` | `string` | state |
| `onWebhookBodyChange` | `(value) => void` | `handleWebhookBodyChange` |
| `onTestWebhook` | `() => void` | `handleTestWebhook` |
| `roleCodes` | `RoleCode[]` | `useRoleCodesStore` |
| `roleNames` | `Record<string, Record<string, string>>` | `useRoleCodesStore` |
| `language` | `string` | `useTranslation` |
| `getRoleName` | function | `@/utils/roleUtils` |
| `saveDisabled` | `boolean` | `!!jsonError \|\| !formData.name` |
| `changeHistory` | `ChangeHistoryEntry[]` | `selectedRule?.change_history` |
| `createdAt` | `string` | `selectedRule?.created_at` |

### NotificationRuleDetail → WebhookHeadersEditor

| Prop | 타입 | 출처 |
|------|------|------|
| `headers` | `HeaderEntry[]` | `webhookHeaders` prop |
| `onChange` | `(headers) => void` | `onWebhookHeadersChange` prop |
| `t` | function | 번역 함수 (컴포넌트 내 미사용) |

### NotificationHistoryTab → AlertsControlBar

| Prop | 타입 | 출처 |
|------|------|------|
| `t` | function | 번역 함수 |
| `fromValue/fromUnit/toValue/toUnit/fromDate/toDate` | 시간 상태 | 각 state |
| `onTimeChange` | `(fv, fu, tv, tu, fd, td) => void` | inline — 6개 시간 상태 설정 + 페이지 리셋 |
| `searchQuery` | `string` | state |
| `onSearchQueryChange` | `(q) => void` | inline — 검색어 설정 + 페이지 리셋 |
| `onRefresh` | `() => void` | inline — 페이지 리셋 + 재로드 |

### NotificationHistoryTab → AlertTableFilterMenu

| Prop | 타입 | 출처 |
|------|------|------|
| `anchorEl` | `HTMLElement \| null` | `severityAnchor` state |
| `open` | `boolean` | `Boolean(severityAnchor)` |
| `onClose` | `() => void` | `severityAnchor` null 설정 |
| `options` | `FilterOption[]` | `SEVERITY_OPTIONS.map(...)` |
| `selectedValues` | `string[]` | `selectedSeverities` state |
| `onToggle` | `(value) => void` | inline — severity 토글 |
| `multiSelect` | `boolean` | `true` |

---

## 5. API 호출

모든 API 호출은 `notificationService` (axios `api` wrapper)를 통해 수행:

| 호출자 | 서비스 메서드 | HTTP | 엔드포인트 | 요청 | 응답 |
|--------|-------------|------|-----------|------|------|
| `loadRules` | `getRules` | GET | `/api/v1/notifications/rules` | `{skip, limit, sort_by, order}` | `{total, items: NotificationRule[]}` |
| `handleSave` (생성) | `createRule` | POST | `/api/v1/notifications/rules` | `NotificationRuleCreate` | `NotificationRule` |
| `handleSave` (수정) | `updateRule` | PUT | `/api/v1/notifications/rules/:id` | `{...formData, changed_fields}` | `NotificationRule` |
| `handleDelete` | `deleteRule` | DELETE | `/api/v1/notifications/rules/:id` | (없음) | (void) |
| `handleTestQuery` | `testQuery` | POST | `/api/v1/notifications/rules/test-query` | `{target_index, condition_config}` | OpenSearch raw 응답 |
| `handleTestTrigger` | `testTrigger` | POST | `/api/v1/notifications/rules/test-trigger` | `{target_index, condition_config, trigger_condition}` | `{evaluation, total, has_aggregations}` |
| `handleTestWebhook` | `testWebhook` | POST | `/api/v1/notifications/webhook/test` | `{url, headers}` | `{success, message}` |
| `handleImport` | `importRules` | POST | `/api/v1/notifications/rules/import` | `{rules, overwrite: false}` | `{created, updated, errors, total_processed}` |
| `loadNotifications` | `getNotifications` | GET | `/api/v1/notifications/` | `{skip, limit, query?, from_date?, to_date?, severities?}` | `{total, items: NotificationHistory[]}` |

**WebSocket**: 두 탭 모두 `getAlertWsUrl()` + access_token으로 연결. `{type: 'new_alert'}` 메시지 수신 시 데이터 새로고침.

---

## 6. 이벤트 핸들러

### 6.1 NotificationRuleListTab

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| `handleSelectRule(rule)` | 리스트에서 규칙 클릭 | selectedRule 설정, formData 채움, 테스트 결과 리셋, 원본 스냅샷 저장 |
| `handleAddNew()` | "규칙 추가" 버튼 | 선택 해제, DEFAULT_FORM_DATA 세팅, 폼 표시 |
| `handleDslChange(value)` | Monaco 에디터 onChange | dslString 업데이트, JSON 파싱 → formData.condition_config 업데이트 또는 jsonError 설정 |
| `handleTestQuery()` | "쿼리 실행" 버튼 | JSON 에러 검증, testQuery API 호출, 결과/에러 저장 |
| `handleTestTrigger()` | "트리거 테스트" 버튼 | JSON 에러 검증, testTrigger API 호출, 결과/에러 저장 |
| `handleSave()` | "저장" 버튼 | 수정: changedFields 계산 → 변경 없으면 차단 → updateRule. 생성: createRule. 리스트 새로고침 |
| `handleDelete()` | 삭제 확인 다이얼로그 "삭제" | deleteIds 각각에 대해 deleteRule 호출, 선택 해제, 리스트 새로고침 |
| `handleToggleActive(rule)` | 리스트의 Switch | is_active 토글 + changed_fields: ['is_active'] → updateRule, selectedRule 동기화 |
| `handleWebhookHeadersChange` | 헤더 에디터 변경 | webhookHeaders 업데이트 + 배열→Record 변환하여 formData.receiver 업데이트 |
| `handleWebhookBodyChange` | 본문 에디터 변경 | webhookBodyStr 및 formData.receiver.webhook_body 업데이트 |
| `handleTestWebhook()` | "연결 테스트" 버튼 | testWebhook API 호출 (URL + 헤더) |
| `handleExport()` | "Export" 버튼 | selectedRuleIds로 규칙 필터, JSON Blob 생성, 다운로드 |
| `handleImport(e)` | 파일 입력 변경 | JSON 파일 읽기, 형식 검증, importRules API 호출, 새로고침 |
| `handleMouseDown()` | 리사이즈 핸들 mousedown | mousemove/mouseup 리스너로 패널 너비 조절 (200~600px) |

### 6.2 NotificationHistoryTab

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| `toggleRow(idx)` | 테이블 행 클릭 | expandedRows Set에서 인덱스 토글 (메시지 확장/축소) |
| `onTimeChange` | AlertsControlBar 콜백 | 6개 시간 상태 변수 설정 + 페이지 0으로 리셋 |
| `onSearchQueryChange` | AlertsControlBar 콜백 | searchQuery 설정 + 페이지 리셋 |
| `onRefresh` | AlertsControlBar 콜백 | 페이지 리셋 + loadNotifications 호출 |
| 심각도 필터 토글 | AlertTableFilterMenu onToggle | selectedSeverities 배열에서 토글 |
| 페이지 변경 | 페이지네이션 버튼 | `setPage(i)` |
| 페이지 크기 변경 | Select 변경 | `setRowsPerPage(n)` + `setPage(0)` |

### 6.3 AlertsControlBar

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| `handleSearchSubmit(e)` | Enter 키 | `onSearchQueryChange(tempQuery)` 호출 |
| `handleQuickClick(e)` | 달력 아이콘 클릭 | 'quick' 모드 팝오버 열기 |
| `handleFromClick(e)` | "from" 표시 클릭 | 'detailed' 모드, 'from' 편집 팝오버 열기 |
| `handleToClick(e)` | "to" 표시 클릭 | 'detailed' 모드, 'to' 편집 팝오버 열기 |
| `handleApplyTime()` | "적용" 버튼 | 탭에 따라 시간값 계산 → onTimeChange 호출 |
| `handleCommonClick(val, unit)` | 공통 범위 옵션 클릭 | "today" 특수 처리, 그 외 상대 시간값으로 onTimeChange |
| `toggleAutoRefresh()` | 재생/정지 버튼 | isRefreshing 토글 (autoRefreshValue > 0일 때) |

### 6.4 WebhookHeadersEditor

| 핸들러 | 트리거 | 동작 |
|--------|--------|------|
| `handleKeyChange(index, newKey)` | Autocomplete 변경 | 해당 인덱스 Key 업데이트, 마지막 빈 행 보장 |
| `handleValueChange(index, newValue)` | TextField 변경 | 해당 인덱스 Value 업데이트, 마지막 빈 행 보장 |
| `handleDelete(index)` | 삭제 아이콘 클릭 | 해당 인덱스 제거, 마지막 빈 행 보장 |

---

## 7. 비즈니스 로직

### 7.1 변경 감지 (`getChangedFields`)

`originalFormRef.current` (규칙 선택 시 JSON 스냅샷)과 현재 `formData`를 필드별 `JSON.stringify` 비교.

**비교 대상 (12개 필드):**

| 일반 필드 | Receiver 하위 필드 |
|-----------|-------------------|
| `name` | `receiver_type` |
| `description` | `receiver_values` |
| `target_index` | `webhook_url` |
| `condition_config` | `webhook_headers` |
| `message_template` | `webhook_body` |
| `severity` | |
| `interval_min` | |
| `trigger_condition` | |
| `is_active` | |

변경된 필드가 없으면 "변경된 항목이 없습니다" 스낵바 표시 후 API 호출 차단.

### 7.2 레거시 역할 매핑

`handleSelectRule`에서 `{ admin: 'role-1', user: 'role-2' }` 매핑 적용. 현재 `roleCodes`에 존재하지 않는 코드는 필터링.

### 7.3 심각도 → MUI 컬러 매핑 (SeverityChip)

| 심각도 | MUI 컬러 |
|--------|---------|
| `critical`, `high` | `error` (빨강) |
| `medium` | `warning` (주황) |
| `low`, `info` | `info` (파랑) |
| 기타 | `default` |

### 7.4 시간 범위 계산 (`calculateTimeRange`)

3가지 모드 지원:
1. **절대 날짜** — `fromDate`/`toDate` ISO 문자열 직접 사용
2. **상대** — `dayjs()`에서 `fromValue`/`toValue` + unit 차감
3. **현재** — `toDate` 기본값 `dayjs().toISOString()`

### 7.5 날짜 포맷 (AlertTableStyles)

- `formatDateTime`: UTC → 로컬 → `YYYY-MM-DD HH:mm:ss`
- `formatDateTimeWithTz`: UTC → 로컬 → `YYYY-MM-DD HH:mm:ss (UTC Z)`

### 7.6 Export/Import

**Export**: `selectedRuleIds`로 규칙 필터 → 10개 필드 추출 → `{version: "1.0", exported_at, rules}` JSON Blob → 다운로드

**Import**: JSON 파일 읽기 → `{rules: [...]}` 또는 flat 배열 허용 → `importRules` API (overwrite: false)

### 7.7 WebhookHeadersEditor 자동 행 추가

`ensureTrailingEmpty`: 항상 마지막에 빈 행 유지. Key 또는 Value 입력 시 자동으로 새 빈 행 생성.

### 7.8 페이지네이션 (NotificationHistoryTab)

현재 페이지 중심으로 5개 버튼 슬라이딩 윈도우 + 이전/다음 화살표.

---

## 8. 메시지 미리보기 시스템

### 8.1 백엔드: `_render_message_template`

**파일**: `backend/app/services/notification.py` (line 155-238)

**정규식**: `\{\{\s*([\w\.@]+)\s*\}\}`

**알고리즘**:

```
{{변수}} 발견 시:

1. 단순 키 (점 없음, 예: {{total}})
   ├─ context[key] 조회 → 값 있으면 반환
   ├─ _hit_sources[0][key] 조회 (fallback) → 값 있으면 반환
   └─ 값 없으면 → "{{key}}" 유지

2. 중첩 키 (점 있음, 예: {{endpoint.name}})
   ├─ context에서 중첩 탐색 (context["endpoint"]["name"])
   ├─ context에서 flattened key (context["endpoint.name"])
   ├─ _hit_sources 전체 순회:
   │   ├─ 중첩 탐색 + flattened key
   │   → 유니크 값 추출, \n으로 합치기
   └─ 못 찾으면 → "{{key}}" 유지
```

**context 구성** (line 454-470):

```python
template_context = {
    **result,                    # OpenSearch 전체 응답
    "total": total,
    "rule_name": rule.get("name"),
    "rule_id": rule_id,
    "rule_severity": rule.get("severity"),
    "target_index": target_index,
    "_hit_sources": hit_sources,
}
```

### 8.2 프론트엔드: `renderMessagePreview`

**파일**: `frontend/src/pages/admin/alerts/tabs/NotificationRuleListTab.tsx` (line 152-210)

**정규식**: `\{\{\s*([\w.@]+)\s*\}\}`

**알고리즘** (백엔드와 동일하게 정렬됨):

```
1. queryTestResult 없음 → 템플릿 원문 표시
2. queryTestResult 있음:
   ├─ context 구성 (...queryTestResult spread + 메타 필드)
   ├─ 단순 키: context[key] → _hit_sources[0][key] fallback
   ├─ 중첩 키: context 탐색 → _hit_sources 전체 순회
   └─ 못 찾으면 → "{{key}}" 유지
```

### 8.3 백엔드 vs 프론트엔드 동작 비교

| 구분 | 백엔드 | 프론트엔드 |
|------|--------|-----------|
| 정규식 | `[\w\.@]+` | `[\w.@]+` (동일) |
| context 구성 | `**result` spread + 메타 | `...queryTestResult` spread + 메타 (동일) |
| 단순 키 fallback | `_hit_sources[0]` | `hitSources[0]` (동일) |
| 중첩 키 context 탐색 | O | O (동일) |
| flattened key | O | O (동일) |
| dict/list 변환 | `json.dumps(indent=2)` | `JSON.stringify(null, 2)` (동일) |
| `rule_id` | O | O (`selectedRule?.id`) |
| aggregations 접근 | O | O (context spread) |

---

## 9. Webhook Body 템플릿

### `_build_webhook_payload` (백엔드)

**파일**: `backend/app/services/notification.py` (line 405-425)

메시지 템플릿과 완전히 다른 방식:

| 구분 | 메시지 템플릿 | Webhook Body |
|------|-------------|-------------|
| 치환 방식 | `re.sub` + 복잡한 해석 | `str.replace` 루프 |
| 중첩 키 | O | X (flat 키만) |
| _hit_sources | O | X |
| 미해석 변수 | 원문 유지 | 빈 문자열로 제거 |
| 출력 형식 | 문자열 | JSON 객체 (json.loads) |

### Webhook 전용 변수 (6개)

| 변수 | 소스 |
|------|------|
| `{{id}}` | 알림 ID |
| `{{rule_name}}` | 규칙명 |
| `{{rule_severity}}` | 심각도 |
| `{{message}}` | 렌더링된 메시지 |
| `{{created_at}}` | 알림 생성 시각 |
| `{{rule_target_index}}` | 대상 인덱스 |

---

## 10. 사용 가능한 변수 목록

### 메시지 템플릿

| 변수 | 소스 | 예시 | 프론트 미리보기 |
|------|------|------|:---:|
| `{{total}}` | `hits.total.value` | `42` | O |
| `{{rule_name}}` | 규칙명 | `"High Threat"` | O |
| `{{rule_id}}` | 규칙 ID | `"rule-001"` | O |
| `{{rule_severity}}` | 심각도 | `"critical"` | O |
| `{{target_index}}` | 대상 인덱스 | `"logs-*"` | O |
| `{{rule_target_index}}` | 대상 인덱스 (alias) | `"logs-*"` | O |
| `{{hits.total.value}}` | OpenSearch 응답 | `5` | O |
| `{{aggregations.*}}` | 집계 결과 | JSON | O |
| `{{endpoint.name}}` | _hit_sources | `"web-01"` | O |
| `{{threatInfo.threatName}}` | _hit_sources (중복 제거) | `"Malware\nTrojan"` | O |

---

## 11. i18n 키 목록

### NotificationRuleListTab

`notificationCenter`, `selectRulesToExport`, `export`, `import`, `selectRulesToDelete`, `deleteRule`, `confirmDeleteRules`, `confirmDeleteRule`, `cancel`, `noPermission`, `invalidJson`, `dslJsonError`, `queryTestSuccess`, `queryRunFailed`, `noChanges`, `ruleSaveSuccess`, `saveFailed`, `ruleDeleteSuccess`, `webhookTestSuccess`, `webhookTestFail`, `exportSuccess`, `exportFailed`, `importInvalidFormat`, `importSuccess`, `importCreated`, `importErrors`, `importFailed`

### NotificationRuleDetail

`selectRulePrompt`, `editRule`, `addRule`, `save`, `basicInfo`, `ruleName`, `severity`, `ruleDescriptionLabel`, `detectionCondition`, `targetIndex`, `intervalMin`, `defineExtractionQuery`, `queryRunning`, `runQuery`, `extractionQueryResponse`, `runQueryPrompt`, `triggerConditionLabel`, `triggerConditionPlaceholder`, `triggerConditionHelper`, `testTrigger`, `notificationMessageTemplate`, `messageTemplate`, `messageTemplatePlaceholder`, `messagePreview`, `messagePreviewEmpty`, `runQueryPreviewHint`, `notificationReceiverRoles`, `selectReceiverRoles`, `webhookSettings`, `webhookDescription`, `webhookUrl`, `testConnection`, `webhookHeaders`, `webhookBody`, `changeHistory`, `date`, `author`, `changedItems`, `field_*` (동적 필드명)

### NotificationHistoryTab

`results`, `occurrenceDate`, `severity`, `ruleName`, `receiverGroup`, `noNotificationHistory`, `showingInfo`, `rowsPerPage`

### AlertsControlBar

`alertSearchPlaceholder`, `search`, `refresh`, `lastUpdated`, `quickSelect`, `unit_m`, `unit_h`, `unit_d`, `apply`, `commonlyUsed`, `today`, `last24h`, `thisWeek`, `last7d`, `last15m`, `last30d`, `refreshEvery`, `seconds`, `minutes`, `start`, `setStartPoint`, `setEndPoint`, `absolute`, `relative`, `now`, `setToNow`, `startDate`, `endDate`, `minutesAgo`, `hoursAgo`, `daysAgo`, `all`

### NotificationRuleList

`rules`, `addRule`, `noRulesRegistered`

---

## 12. 타입/인터페이스

### @/types/index.ts

```typescript
interface NotificationReceiver {
  type: string;
  values: string[];
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  webhook_body?: string;
}

interface ChangeHistoryEntry {
  user_id: string;
  changed_at: string;
  changed_fields?: string[];
}

interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  target_index: string;
  condition_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  trigger_condition?: string;
  receiver: NotificationReceiver;
  is_active: boolean;
  last_triggered_at?: string;
  total_alerts_count: number;
  created_at: string;
  updated_at: string;
  change_history?: ChangeHistoryEntry[];
}

interface NotificationRuleCreate {
  name: string;
  description?: string;
  target_index: string;
  condition_config: Record<string, unknown>;
  message_template: string;
  severity: string;
  interval_min: number;
  trigger_condition?: string;
  receiver: NotificationReceiver;
  is_active: boolean;
}

interface NotificationRuleUpdate {
  /* 모든 필드 Optional + changed_fields: string[] */
}

interface NotificationHistory {
  id: string;
  rule_id: string;
  rule_name: string;
  rule_description?: string;
  rule_severity: string;
  rule_target_index: string;
  message: string;
  message_template: string;
  event_index: string;
  dedup_key: string;
  receiver: NotificationReceiver | null;
  status: string;
}
```

### 로컬 인터페이스

```typescript
// SeverityChip.tsx
interface SeverityChipProps {
  severity: string | null;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

// AlertsControlBar.tsx
interface ControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  fromValue: number | null; fromUnit: string;
  toValue: number | null; toUnit: string;
  fromDate: string | null; toDate: string | null;
  onTimeChange: (fv, fu, tv, tu, fd, td) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  lastUpdated?: string;
}

// NotificationRuleList.tsx
interface NotificationRuleListProps {
  rules: NotificationRule[];
  selectedRuleId: string | null;
  selectedRuleIds: Set<string>;
  onSelect: (rule: NotificationRule) => void;
  onToggleSelect: (ruleId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onAdd: () => void;
  onToggleActive: (rule: NotificationRule) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  width?: number;
}

// NotificationRuleDetail.tsx (27개 props)
interface NotificationRuleDetailProps { /* 섹션 4 참조 */ }

// WebhookHeadersEditor.tsx
export interface HeaderEntry { key: string; value: string; }
interface WebhookHeadersEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
  t: (key: string) => string;
}

// AlertTableFilterMenu.tsx
interface FilterOption { value: string | boolean | null; label: string; }
interface AlertTableFilterMenuProps {
  anchorEl: MenuProps['anchorEl'];
  open: boolean; onClose: () => void;
  options: FilterOption[];
  selectedValues: (string | boolean | null)[];
  onToggle: (value: string | boolean | null) => void;
  multiSelect?: boolean;
}
```

---

## 13. 외부 의존성

### MUI Components

`Alert`, `Autocomplete`, `Box`, `Button`, `Checkbox`, `Chip`, `Collapse`, `Dialog`, `DialogActions`, `DialogContent`, `DialogTitle`, `Divider`, `FormControl`, `FormControlLabel`, `Grid`, `IconButton`, `LinearProgress`, `List`, `ListItemButton`, `ListItemIcon`, `ListItemText`, `Menu`, `MenuItem`, `Paper`, `Popover`, `Select`, `Snackbar`, `Stack`, `Switch`, `Tab`, `Tabs`, `TextField`, `Tooltip`, `Typography`

### MUI Icons

`Add`, `ArrowForward`, `CalendarMonth`, `CheckBox`, `CheckBoxOutlineBlank`, `ChevronLeft`, `ChevronRight`, `Close`, `Delete`, `FileDownload`, `FileUpload`, `FilterList`, `History`, `KeyboardArrowDown`, `KeyboardArrowRight`, `NotificationsActive`, `PlayArrow`, `Refresh`, `RemoveCircleOutline`, `Search`, `Stop`

### 기타

| 패키지 | 용도 |
|--------|------|
| `@monaco-editor/react` | DSL 쿼리 에디터, 웹훅 본문 에디터 |
| `@mui/x-date-pickers` | `AdapterDayjs`, `DateCalendar`, `LocalizationProvider` |
| `dayjs` + plugins | 시간 계산 (utc, locale) |

### 커스텀 Hook/Store/유틸

| Import | 출처 |
|--------|------|
| `useAuth` | `@/hooks/useAuth` |
| `useTranslation` | `@/hooks/useTranslation` |
| `useWebSocket` | `@/hooks/useWebSocket` |
| `useLanguageStore` | `@/stores/useLanguageStore` |
| `useRoleCodesStore` | `@/stores/useRoleCodesStore` |
| `useSettingsStore` | `@/stores/useSettingsStore` |
| `notificationService` | `@/services/notificationService` |
| `getRoleName` | `@/utils/roleUtils` |
| `getAlertWsUrl` | `@/utils/wsUtils` |

---

## 14. 알려진 이슈 & 개선점

### 14.1 `createdAt` prop 미사용

`NotificationRuleDetail`에 `createdAt` prop이 전달되지만 컴포넌트 내에서 사용되지 않음.

### 14.2 `WebhookHeadersEditor`의 `t` prop 미사용

`t` prop이 인터페이스에 정의되고 전달되지만 컴포넌트 본문에서 사용하지 않음 (placeholder를 하드코딩 "Key"/"Value"로 변경했기 때문).

### 14.3 `GlobalAlertSnackbar` 외부 사용

이 디렉토리 내에서는 사용되지 않음. 상위 레이아웃/페이지에서 import하여 사용 중.

### 14.4 백엔드 테스트 불일치

`test_hit_sources_simple_key_not_resolved` 테스트는 단순 키가 `_hit_sources`를 탐색하지 않는다고 단언하지만, 실제 백엔드 코드는 `_hit_sources[0]`을 탐색함 → 테스트 FAIL.

### 14.5 Webhook Body의 제한적 변수

Webhook Body는 6개 flat 변수만 지원. `_hit_sources` 필드나 중첩 키 접근 불가.
