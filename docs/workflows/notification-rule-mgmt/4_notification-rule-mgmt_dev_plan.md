# 알림 규칙 관리 (Notification Rule Management) 기능 개발 계획서

**작성일:** 2026-02-11
**작성자:** Gemini
**기반 문서:** `3_notification-rule-mgmt_spec_final.md`
**상태:** 초안

---

## 📋 개발 개요

### 목표
알림 규칙 목록에서 '규칙 추가' 및 '수정' 버튼을 눌렀을 때 상세 설정을 입력할 수 있는 폼을 제공하고, 이를 백엔드 API와 연동한다.

### 개발 범위
- i18n 번역 파일 업데이트 (`ko.json`, `en.json`, `ja.json`)
- `NotificationRuleListTab.tsx` 컴포넌트 고도화
- `NotificationRuleForm` 다이얼로그 및 폼 로직 구현
- 백엔드 API 연동 (목록 조회, 생성, 수정, 삭제)

### 예상 개발 기간
- 예상 소요 시간: 4시간

---

## 1. 아키텍처 설계

### 1.1 프론트엔드 컴포넌트 구조
- `NotificationRuleListTab`: 메인 목록 화면 및 다이얼로그 관리
- `NotificationRuleForm`: (내부 또는 분리) 다이얼로그 내 컨텐츠 구성

### 1.2 데이터 흐름
1. `useEffect`를 통해 목록 조회 API 호출 -> `rules` 상태 저장
2. '추가/수정' 클릭 -> `editingRule` 및 `formData` 상태 초기화 -> 다이얼로그 오픈
3. 입력값 변경 -> `setFormData` 업데이트
4. '저장' 클릭 -> API 호출 (POST/PUT) -> 성공 시 목록 리프레시 및 닫기

---

## 2. API 설계

기존 구현된 엔드포인트를 사용:
- `GET /api/v1/notifications/rules`
- `POST /api/v1/notifications/rules`
- `PUT /api/v1/notifications/rules/{id}`
- `DELETE /api/v1/notifications/rules/{id}`

---

## 3. 구현 상세

### 3.1 i18n 번역 키 추가
```json
{
  "ruleName": "규칙명",
  "targetIndex": "대상 인덱스",
  "severity": "위험도",
  "interval": "탐지 주기",
  "window": "조회 범위",
  "condition": "탐지 조건 (DSL)",
  "channels": "알림 채널",
  "active": "활성",
  "inactive": "비활성",
  "addRule": "규칙 추가",
  "editRule": "규칙 수정",
  "unit_m": "분",
  "confirmDeleteRule": "이 규칙을 삭제하시겠습니까?",
  "saveSuccess": "저장되었습니다.",
  "deleteSuccess": "삭제되었습니다."
}
```

### 3.2 폼 필드 구성
- **TextField**: name, target_index, interval_min, window_min, dedup_ttl_min, dedup_key_template
- **Select**: severity (Critical, High, Medium, Low, Info)
- **Switch**: is_active
- **TextField (multiline)**: condition_config (JSON.stringify/parse 처리)
- **Complex UI**: 채널 설정 (Slack, Webhook, Email 별 칩 또는 리스트)

### 3.3 검증 로직
- 필수값 체크 (name, condition_config 등)
- `window_min >= interval_min` 체크
- `condition_config` 유효 JSON 여부 체크

---

## 4. 구현 순서

### Phase 1: 환경 설정 (0.5 hour)
- [ ] 다국어 번역 키 추가 (`frontend/src/locales/*.json`)

### Phase 2: UI 구현 (1.5 hours)
- [ ] `NotificationRuleListTab.tsx` 다이얼로그 뼈대 구축
- [ ] 기본 정보 필드 및 위험도 선택 UI 구현
- [ ] 탐지 조건(DSL) 입력 UI 구현 (JSON 파싱 포함)
- [ ] 채널 설정 UI 구현 (간소화 버전 우선 적용 후 확장)

### Phase 3: 기능 연동 (1 hour)
- [ ] 생성(POST) 및 수정(PUT) 로직 구현
- [ ] 목록 새로고침 로직 연결

### Phase 4: 테스트 및 검증 (1 hour)
- [ ] 데이터 입력 및 저장 테스트
- [ ] 다국어 전환 테스트
- [ ] 예외 처리 (API 에러 등) 확인

---

## 5. 다음 단계

✅ 5단계: 개발 계획 승인 (`/approve-dev-plan notification-rule-mgmt`)
