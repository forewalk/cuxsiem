# 알림 센터 사이드바 메뉴 구현 최종 개발 계획서

## 1. 확정된 작업 순서
1. **i18n 키 추가:** `ko.json`, `en.json`, `ja.json` 수정.
2. **임시 탭 컴포넌트 생성:** `NotificationRuleListTab`, `NotificationHistoryTab` 생성.
3. **탭 컴포넌트 등록:** `MainDashboardContent.tsx` 수정.
4. **사이드바 메뉴 구현:** `AdminSidemenu.tsx` 수정 (Collapse 적용).

## 2. 세부 명세
- **번역 키:**
    - `notificationCenter`
    - `notificationRuleList`
    - `notificationHistory`
- **아이콘 매핑:**
    - 알림 센터: `NotificationsIcon`
    - 알림 규칙 목록: `ListAltIcon`
    - 알림 내역: `HistoryIcon`

## 3. 리스크 및 대응
- **중첩된 Collapse 레이아웃:** MUI `Collapse`가 중첩될 때 애니메이션이나 들여쓰기가 자연스럽지 않을 수 있으므로, `pl: 4` (1단계), `pl: 6` (2단계)와 같이 패딩을 조절하여 계층을 명확히 함.