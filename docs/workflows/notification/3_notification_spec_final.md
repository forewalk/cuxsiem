# 알림 센터 (Notification Center) 최종 기능 명세서

## 1. 개요
관리자 설정 메뉴 내에 알림 관련 기능을 통합 관리할 수 있는 '알림 센터' 메뉴를 추가한다.

## 2. 확정된 요구사항
- **대상:** 관리자(admin) 계정
- **위치:** 사이드바의 '관리 설정' 메뉴 하위
- **구조:**
    - 관리 설정
        - 사용자 관리
        - 비밀번호 정책
        - **알림 센터 (Collapse 형태)**
            - **알림 규칙 목록**
            - **알림 내역**
- **동작:**
    - '알림 센터' 클릭 시 하위 메뉴(알림 규칙 목록, 알림 내역)가 펼쳐지거나 접혀야 함.
    - 하위 메뉴 클릭 시 `useTabStore`를 통해 새로운 탭을 추가하고 화면을 전환함.

## 3. 구현 상세
### 3.1 사이드바 UI (`AdminSidemenu.tsx`)
- `openNotificationMenu` 상태 추가 (기본값: `false`)
- `Notifications` 아이콘 (`@mui/icons-material`) 사용
- 중첩된 `Collapse` 구조 적용: `관리 설정` (Collapse) -> `알림 센터` (Collapse)

### 3.2 다국어 설정 (`ko.json`, `en.json`, `ja.json`)
- `notificationCenter`: "알림 센터" (ko) / "Notification Center" (en) / "通知センター" (ja)
- `notificationRuleList`: "알림 규칙 목록" (ko) / "Notification Rule List" (en) / "通知ルール一覧" (ja)
- `notificationHistory`: "알림 내역" (ko) / "Notification History" (en) / "通知이력" (ja)

### 3.3 임시 페이지 컴포넌트
- 실제 기능 구현 전까지는 `NotificationRuleListTab`, `NotificationHistoryTab` 이라는 이름의 Placeholder 컴포넌트를 정의하여 연결함.

## 4. 향후 계획
- 사이드바 메뉴 구현 후, 각 메뉴의 상세 페이지(검색, 필터, 테이블 등)를 순차적으로 개발함.