# 알림 센터 사이드바 통합 기술 문서

## 1. 개요
관리자 전용 사이드바 메뉴에 '알림 센터' 아코디언 메뉴를 추가하고, 하위 메뉴인 '알림 규칙 목록'과 '알림 내역'을 통합함.

## 2. 변경 사항
### 2.1 다국어 (i18n)
- `frontend/src/locales/ko.json`, `en.json`, `ja.json` 파일에 다음 키 추가:
    - `notificationCenter`: 알림 센터
    - `notificationRuleList`: 알림 규칙 목록
    - `notificationHistory`: 알림 내역

### 2.2 사이드바 (`AdminSidemenu.tsx`)
- `openNotificationMenu` 상태 변수 추가 및 `handleNotificationMenuClick` 핸들러 구현.
- 관리 설정 하위에 중첩된 `Collapse` 구조로 알림 센터 메뉴 배치.
- 계층 구분을 위해 하위 메뉴에 `pl: 6` 패딩 적용.

### 2.3 탭 및 컴포넌트
- 임시 탭 컴포넌트 생성:
    - `NotificationRuleListTab.tsx`
    - `NotificationHistoryTab.tsx`
- `TabManager.tsx`의 `tabComponents` 맵에 새 컴포넌트 등록.

## 3. 사용법
1. 관리자(admin) 계정으로 로그인.
2. 좌측 사이드바 하단의 '관리 설정' 클릭.
3. '알림 센터' 클릭 시 하위 메뉴 노출.
4. 각 하위 메뉴 클릭 시 상단 탭 시스템을 통해 해당 기능 페이지(현재 준비 중 메시지)로 이동.

## 4. 참고 사항
- 본 작업은 메뉴 구조 통합에 집중하였으며, 각 탭의 실제 비즈니스 로직과 UI 상세 디자인은 후속 작업에서 진행될 예정임.
