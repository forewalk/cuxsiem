# 알림 센터 사이드바 메뉴 구현 개발 계획서

## 1. 개요
최종 명세서에 따라 관리자 사이드바에 '알림 센터' 메뉴와 하위 항목(규칙 목록, 내역)을 추가하기 위한 개발 계획을 수립함.

## 2. 작업 범위
### 2.1 다국어 파일 수정
- `frontend/src/locales/ko.json`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- '알림 센터', '알림 규칙 목록', '알림 내역' 번역 키 추가.

### 2.2 사이드바 컴포넌트 수정 (`frontend/src/components/AdminSidemenu.tsx`)
- `openNotificationMenu` 상태 추가.
- `Notifications`, `ListAlt`, `History` 아이콘 임포트.
- 관리 설정(`openAdminMenu`) 하위에 `알림 센터` ListItem 추가 및 `Collapse` 적용.

### 2.3 플레이스홀더 탭 컴포넌트 생성
- `frontend/src/components/tabs/NotificationRuleListTab.tsx` (임시)
- `frontend/src/components/tabs/NotificationHistoryTab.tsx` (임시)
- 기존 `tabStore`에 컴포넌트를 매핑하기 위해 `frontend/src/pages/MainDashboardContent.tsx` (또는 탭을 렌더링하는 위치) 수정 확인.

## 3. 세부 작업 단계
1. **[Step 1] 다국어 키 추가:** 3개 언어 JSON 파일에 메뉴명 추가.
2. **[Step 2] 사이드바 로직 구현:** `AdminSidemenu.tsx`에 상태 변수 및 메뉴 구조 추가.
3. **[Step 3] 임시 컴포넌트 작성:** 메뉴 클릭 시 표시될 간단한 "준비 중" 컴포넌트 생성.
4. **[Step 4] 탭 매핑 등록:** `MainDashboardContent.tsx`의 `tabComponents` 객체에 새 컴포넌트 등록.

## 4. 검증 계획
- **관리자 권한 확인:** admin 계정으로 로그인 시에만 해당 메뉴가 보이는지 확인.
- **아코디언 동작:** '알림 센터' 클릭 시 하위 메뉴가 정상적으로 펼쳐지고 접히는지 확인.
- **탭 생성 확인:** '알림 규칙 목록' 및 '알림 내역' 클릭 시 상단 탭이 생성되고 해당 컴포넌트가 렌더링되는지 확인.
- **다국어 확인:** 언어 변경 시 메뉴명이 올바르게 바뀌는지 확인.
