# [구현결과] 계정 신청 기능 (Account Application)

## 1. 구현 요약
- **백엔드**: 비인증 사용자가 계정 신청을 할 수 있는 `/api/v1/auth/apply` 엔드포인트 구현. 보안을 위해 `role='user'`, `is_active=False` 강제 적용.
- **프론트엔드**:
    - `AccountApplyModal`: 아이디, 이메일, 이름, 비밀번호 입력을 위한 모달 구현. 실시간 비밀번호 정책 검증 기능 포함.
    - `LoginPage`: '계정 신청' 링크를 통해 모달을 호출하도록 연동.
    - 다국어 지원: KO, EN, JA 3개 국어 반영.

## 2. 주요 변경 사항
- **스키마**: `UserApply` 추가 (백엔드)
- **라우터**: `auth.apply_account` 추가 (백엔드)
- **컴포넌트**: `AccountApplyModal` 신규 생성 (프론트엔드)
- **서비스**: `authService.applyAccount` 추가 (프론트엔드)

## 3. 코드 하이라이트
- **백엔드 강제 로직**: 클라이언트의 요청 값과 상관없이 서버에서 `is_active`를 `False`로 고정하여 관리자 승인 프로세스를 보장함.
- **프론트엔드 검증**: `passwordPolicyService`와 연동하여 사용자가 입력하는 동안 복잡성 규칙 충족 여부를 시각적으로 표시함.
