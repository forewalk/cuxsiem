# [개발계획] 계정 신청 기능 (Account Application)

## 1. 작업 목표
로그인 페이지에서 접근 가능한 계정 신청 기능을 백엔드부터 프론트엔드까지 풀스택으로 구현함.

## 2. 상세 작업 목록

### 2.1 백엔드 (FastAPI)
- [ ] `app/schemas/user.py`: `UserApply` 스키마 추가 (username, email, name, password)
- [ ] `app/api/v1/endpoints/auth.py`: `POST /apply` 엔드포인트 추가
    - `UserService.create_user`를 호출하되, `role='user'`, `is_active=False`로 강제 설정
- [ ] `app/services/user.py`: 필요 시 계정 신청 전용 검증 로직 추가

### 2.2 프론트엔드 (React/MUI)
- [ ] `src/locales/*.json`: 다국어 텍스트 추가 (계정 신청 관련)
- [ ] `src/services/authService.ts`: `applyAccount` API 호출 함수 추가
- [ ] `src/components/auth/AccountApplyModal.tsx`: 신규 모달 컴포넌트 구현
    - `Dialog` 사용, 이미지 `a1.png` 스타일 적용
    - 역할/상태 필드 제외
    - 비밀번호 정책 실시간 검증 UI 포함
- [ ] `src/pages/auth/Login.tsx`: '계정 신청' 링크 추가 및 모달 연동

## 3. 수정 및 생성 파일 리스트

### 백엔드
- `web/backend/app/schemas/user.py` (수정)
- `web/backend/app/api/v1/endpoints/auth.py` (수정)

### 프론트엔드
- `web/frontend/src/locales/ko.json` (수정)
- `web/frontend/src/locales/en.json` (수정)
- `web/frontend/src/locales/ja.json` (수정)
- `web/frontend/src/services/authService.ts` (수정)
- `web/frontend/src/components/auth/AccountApplyModal.tsx` (생성)
- `web/frontend/src/pages/auth/Login.tsx` (수정)

## 4. 테스트 계획
- **백엔드**: `POST /api/v1/auth/apply` 호출 시 DB에 `is_active=false`, `role=user`로 저장되는지 확인.
- **프론트엔드**: 
    - 로그인 페이지에서 모달 정상 오픈 확인.
    - 비밀번호 정책 미준수 시 버튼 비활성화 또는 에러 메시지 확인.
    - 신청 성공 후 성공 메시지 출력 및 모달 닫힘 확인.
