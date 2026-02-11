# [기술문서] 계정 신청 기능 (Account Application)

## 1. 개요
로그인 페이지에서 사용자가 직접 계정 생성을 신청하고, 관리자가 승인하기 전까지 비활성 상태로 유지되는 프로세스를 구현함.

## 2. 시스템 아키텍처

### 2.1 Backend (FastAPI)
- **Endpoint**: `POST /api/v1/auth/apply`
- **Schema**: `UserApply` (ID, Email, Name, Password)
- **Logic**:
    1. 아이디 및 이메일 중복 검사
    2. 비밀번호 해싱 (`bcrypt`)
    3. `is_active=False`, `role='user'` 강제 설정
    4. OpenSearch (`cs_users` 인덱스)에 저장

### 2.2 Frontend (React)
- **Component**: `AccountApplyModal`
    - `Dialog` (MUI) 기반
    - `passwordPolicyService`를 이용한 실시간 유효성 체크
    - `authService.applyAccount`를 통한 API 통신
- **I18n**: `ko.json`, `en.json`, `ja.json`에 관련 키 추가

## 3. 설정 및 사용 방법
- 별도의 설정은 필요 없으며, 로그인 페이지의 'Sign Up' 또는 '계정 신청' 링크를 통해 진입 가능.
- 비밀번호 정책은 `Admin > Password Policy` 탭에서 설정된 값을 실시간으로 반영함.

## 4. 향후 개선 사항
- 신청 시 관리자에게 이메일 또는 시스템 알림 전송 기능 추가.
- 캡차(CAPTCHA) 등 자동 가입 방지 로직 적용 검토.
