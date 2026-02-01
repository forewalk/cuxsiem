# 개발 계획서: admin

## 1. 프론트엔드 작업 (React)

### 1.1 상태 관리 (`src/pages/admin/stores/tabStore.ts`)
- Zustand를 사용하여 `tabs`, `activeTabId` 관리.
- `addTab`, `removeTab`, `setActiveTab` 액션 구현.
- `addTab` 시 5개 제한 로직 포함.

### 1.2 사이드바 수정 (`src/components/AdminSidemenu.tsx`)
- CSS Flexbox를 사용하여 '관리자 메뉴'를 하단으로 밀어냄 (`marginTop: 'auto'` 또는 `position: absolute`).
- 하위 메뉴 클릭 시 `addTab` 호출 및 `/main/admin` 경로로 이동.

### 1.3 관리자 메인 페이지 (`src/pages/admin/AdminPage.tsx`)
- `TabManager`를 렌더링하는 컨테이너 역할.

### 1.4 탭 매니저 (`src/pages/admin/components/TabManager.tsx`)
- MUI `Tabs` 컴포넌트 사용.
- 탭 내용 렌더링 시 `display: none` 방식을 사용하여 상태 유지 (컴포넌트 언마운트 방지).

### 1.5 개별 탭 컴포넌트
- `UserManagementTab.tsx`: 사용자 CRUD. 관리자 삭제 버튼 비활성화 로직 추가.
- `PasswordPolicyTab.tsx`: 정책 설정 폼.

## 2. 백엔드 작업 (FastAPI)
- 이미 사용자 및 정책 관련 API가 구현되어 있으므로, 프론트엔드 연동 중 필요 시 마이너 수정 진행.

## 3. 테스트 계획
- 관리자 권한 로그인 후 메뉴 노출 확인.
- 탭 5개 이상 오픈 시 경고 메시지 확인.
- 탭 전환 시 입력 데이터 유지 확인.
- 관리자 계정 삭제 시도 시 차단 확인.
