# 계정 신청 기능 개발 계획서

## 1. 개요
로그인 페이지에서 접근 가능한 계정 신청 기능을 백엔드부터 프론트엔드까지 풀스택으로 구현합니다.

## 2. 작업 단계

### Step 1: 백엔드 스키마 및 API 구현
- `app/schemas/user.py`에 `UserApply` 스키마 추가.
- `app/api/v1/endpoints/auth.py`에 `POST /apply` 엔드포인트 구현.
- `app/api/v1/endpoints/password_policy.py`의 조회 API 권한 공개로 변경.

### Step 2: 프론트엔드 서비스 및 다국어 설정
- `frontend/src/services/authService.ts`에 `applyAccount` 함수 추가.
- `frontend/src/types/index.ts`에 `UserApply` 인터페이스 추가.
- `frontend/src/locales/*.json`에 계정 신청 관련 텍스트 추가.

### Step 3: 프론트엔드 UI 컴포넌트 개발
- `frontend/src/components/auth/AccountApplyModal.tsx` 생성.
- `Dialog` (MUI) 기반 UI 구현 및 디자인 적용.
- `useMemo`를 활용한 실시간 비밀번호 정책 검증 로직 구현.

### Step 4: 로그인 페이지 연동
- `frontend/src/pages/LoginPage.tsx`에 "계정 신청" 링크 추가 및 모달 연동.
- 유효성 검사 에러 처리 강화 (Pydantic 에러 객체 렌더링 수정).

## 3. 구현 세부 사항
- **보안:** 백엔드에서 `is_active=False` 및 `role=user` 강제 할당.
- **UI 피드백:** 정책 충족 여부에 따른 색상(Red/Green) 즉시 변경.

## 4. 테스트 계획
- **백엔드:** API 호출 시 DB 저장 데이터의 `is_active`, `role` 값 검증.
- **프론트엔드:** 
    - 실시간 정책 체크 동작 확인.
    - 이메일 형식 미준수 시 전송 차단 확인.
    - 성공 시 안내 메시지 노출 확인.

---
**다음 단계:** 개발 계획 승인 및 구현 (5~6단계)