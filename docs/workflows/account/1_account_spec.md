# [기획서] 계정 신청 기능 (Account Application)

## 1. 개요
로그인하지 않은 사용자가 시스템 이용을 위해 계정 생성을 신청하는 기능을 구현한다. 보안을 위해 신청된 계정은 관리자의 승인이 필요하도록 '비활성화' 상태로 생성된다.

## 2. 주요 기능
- **계정 신청 버튼**: 로그인 페이지 우측 하단에 '계정 신청' 링크/버튼 배치
- **입력 폼 (팝업)**: 사용자 추가와 유사한 모달 형태의 입력 UI
- **데이터 고정**:
    - 역할(Role): '사용자(user)' 고정 (UI 비노출)
    - 상태(Status): '비활성(inactive)' 고정 (UI 비노출)
- **비밀번호 정책**: 시스템에 설정된 비밀번호 정책을 준수하여 입력 검증
- **중복 체크**: 아이디 및 이메일 중복 확인

## 3. UI/UX 요구사항 (참조: a1.png)
- **모달 제목**: "계정 신청"
- **입력 필드**:
    - 아이디 (필수)
    - 이메일 (필수, 형식 검증)
    - 이름 (필수)
    - 비밀번호 (필수, 정책 안내 및 검증)
    - 비밀번호 확인 (필수)
- **제외 필드**: 역할 선택, 상태 스위치 (이미지 a1.png에서는 보이지만 계정 신청 폼에서는 제거)
- **하단 버튼**: 취소, 신청 (저장 대신 '신청'으로 표기)

## 4. 논리적 제약 조건
- **역할**: 신청 시 백엔드에서 자동으로 `role="user"` 할당
- **상태**: 신청 시 백엔드에서 자동으로 `is_active=false` 할당
- **비밀번호**: 기존 `PasswordPolicyService`를 연동하여 실시간 정책 검증 결과 표시

## 5. 백엔드 API 설계
- **Endpoint**: `POST /api/v1/accounts/apply`
- **Request Body**:
    ```json
    {
      "username": "string",
      "email": "string",
      "full_name": "string",
      "password": "string"
    }
    ```
- **Response**: `201 Created`

## 6. 프론트엔드 작업
- `src/pages/auth/Login.tsx`: 계정 신청 링크 추가
- `src/components/auth/AccountApplyModal.tsx`: 신규 모달 컴포넌트 생성 (기존 사용자 추가 모달 로직 재사용 및 변형)
- `src/services/authService.ts`: 계정 신청 API 호출 함수 추가
