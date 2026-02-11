# 계정 신청 기능 기술 문서

## 1. 개요
이 문서는 비로그인 사용자가 시스템 사용을 위해 계정을 신청하고, 관리자가 이를 승인하기 전까지 비활성 상태로 유지하는 기능의 기술적 구현 명세를 설명합니다.

## 2. 아키텍처

### 2.1 백엔드 (FastAPI)
- **Endpoint:** `POST /api/v1/auth/apply`
- **구현 로직:**
    - `UserApply` 스키마를 통해 필수 정보(ID, 이메일, 이름, 비밀번호) 수신.
    - 서버에서 `is_active=False`, `role='user'`를 강제로 주입하여 `UserService.create_user` 호출.
- **정책 공개:**
    - `GET /api/v1/password-policy`의 관리자 권한 의존성(`get_current_admin_user`)을 제거하여 비인증 사용자도 조회가 가능하도록 변경.

### 2.2 프론트엔드 (React + MUI)
- **컴포넌트:** `AccountApplyModal`
- **검증 로직:**
    - `useMemo`를 사용하여 비밀번호 정책 준수 여부를 실시간으로 계산.
    - 정책 중 `require_...` 설정이 `true`인 항목만 화면에 노출.
    - 상태에 따라 `success.main` (초록) 또는 `error.main` (빨강) 색상 적용.
- **에러 처리:**
    - 백엔드에서 배열/객체 형태로 반환하는 Pydantic `detail` 에러를 파싱하여 사용자에게 문자열로 출력하는 유틸리티 로직 포함.

## 3. UI/UX 디자인
- **디자인 가이드:** `docs/figma/account/a1.png`를 기반으로 하되, 불필요한 스위치 및 선택 박스를 제거.
- **다국어:** `react-i18next`를 통한 3개 국어(KO, EN, JA) 완벽 지원.

## 4. 설정 및 환경변수
- 비밀번호 복잡성 정책은 `Admin > Password Policy` 설정값에 의존하며, 실시간으로 반영됩니다.
- 이메일 검증 규칙은 프론트엔드의 `@` 포함 체크와 백엔드의 `EmailStr` 검증이 이중으로 적용됩니다.