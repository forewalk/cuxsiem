# 로그인 기능 최종 개발 계획서

**작성일:** 2026-01-30
**최종 승인일:** 2026-01-30
**작성자:** Claude AI (Senior Developer)
**승인자:** 김장훈
**기획서 버전:** 2.0 (최종)
**상태:** 승인 완료
**개발 시작 예정일:** 2026-01-30

---

## 1. 개발 개요

### 1.1 목표
OpenSearch 기반 JWT 인증 시스템 구현

### 1.2 기술 스택
- Backend: FastAPI + opensearch-py + python-jose + passlib
- Frontend: React + TypeScript + MUI
- Database: OpenSearch (NoSQL)

---

## 2. 아키텍처 설계

### 2.1 백엔드 레이어 구조



### 2.2 생성될 파일 목록

**백엔드:**
- app/models/user.py (User 데이터 클래스)
- app/schemas/auth.py (Pydantic 스키마)
- app/repositories/user.py
- app/repositories/session.py
- app/repositories/login_attempt.py
- app/services/auth.py
- app/core/security.py (JWT + bcrypt)
- app/api/v1/endpoints/auth.py
- backend/scripts/init_opensearch.py (인덱스 초기화)
- backend/scripts/create_admin.py (관리자 계정 생성)

**프론트엔드:**
- frontend/src/pages/LoginPage.tsx
- frontend/src/services/authService.ts
- frontend/src/hooks/useAuth.ts
- frontend/src/components/PrivateRoute.tsx

**테스트:**
- tests/test_repositories/test_user.py
- tests/test_services/test_auth.py
- tests/test_api/test_auth.py

---

## 3. OpenSearch 인덱스 설계

### 3.1 cs_users 인덱스



### 3.2 cs_sessions 인덱스



### 3.3 cs_login_attempts 인덱스



---

## 4. API 설계

### 4.1 POST /api/v1/auth/login

**요청:**


**응답 (200):**


**에러:**
- 401: 이메일/비밀번호 불일치
- 403: 계정 비활성화
- 429: 로그인 시도 횟수 초과

### 4.2 POST /api/v1/auth/logout

**헤더:** Authorization: Bearer {token}
**응답:** 204 No Content

### 4.3 GET /api/v1/auth/me

**헤더:** Authorization: Bearer {token}
**응답 (200):**


---

## 5. 구현 상세

### 5.1 Pydantic 스키마 (app/schemas/auth.py)

Ctrl click to launch VS Code Native REPL

### 5.2 보안 유틸리티 (app/core/security.py)

Ctrl click to launch VS Code Native REPL

### 5.3 Repository (app/repositories/user.py)

Ctrl click to launch VS Code Native REPL

---

## 6. 의존성 관리

### 6.1 requirements.txt 추가



---

## 7. 환경변수 (.env.example 추가)



---

## 8. 테스트 계획

### 8.1 테스트 케이스

**test_auth.py:**
- 정상 로그인
- 비밀번호 불일치
- 존재하지 않는 이메일
- 비활성 계정
- 로그인 실패 5회 초과
- 로그아웃
- 토큰 검증

**커버리지 목표:** 80% 이상

---

## 9. 구현 순서

### Phase 1: 기반 구조 (2시간)
- [ ] 의존성 설치
- [ ] 환경변수 설정
- [ ] OpenSearch 인덱스 생성 스크립트
- [ ] app/core/security.py 구현
- [ ] app/schemas/auth.py 구현

### Phase 2: Repository (2시간)
- [ ] app/repositories/user.py
- [ ] app/repositories/session.py
- [ ] app/repositories/login_attempt.py

### Phase 3: Service (2시간)
- [ ] app/services/auth.py (로그인 로직)
- [ ] 비밀번호 검증
- [ ] JWT 토큰 생성
- [ ] 로그인 실패 제한

### Phase 4: API (2시간)
- [ ] app/api/v1/endpoints/auth.py
- [ ] /login, /logout, /me 엔드포인트
- [ ] get_current_user dependency

### Phase 5: 테스트 & 프론트엔드 (4시간)
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 프론트엔드 LoginPage
- [ ] authService, useAuth

**총 예상 시간:** 12시간

---

## 10. 주의사항

1. OpenSearch는 동기 API이므로 asyncio.run_in_executor 사용
2. 비밀번호 해시는 index: false로 검색 비활성화
3. 이메일은 소문자 변환 후 저장/조회
4. JWT Secret Key는 최소 32자 이상
5. 로그인 실패 제한은 cs_login_attempts 인덱스 활용

---

**작성 완료:** 2026-01-30

---

## 11. 승인 확인

### 11.1 초안 대비 변경사항
- 변경사항 없음 (초안 그대로 승인)

### 11.2 합의 사항
1. **아키텍처:** OpenSearch 기반 JWT 인증 시스템 확정
2. **데이터베이스:** cs_users, cs_sessions, cs_login_attempts 인덱스 생성
3. **API 설계:** POST /login, POST /logout, GET /me 확정
4. **개발 순서:** Phase 1-5 (총 12시간) 확정
5. **의존성:** python-jose, passlib, python-multipart 추가 확정

### 11.3 개발 시작 조건
- [X] 기획서 승인 완료
- [X] 개발 계획 승인 완료
- [X] 아키텍처 설계 확정
- [X] 데이터베이스 설계 확정
- [X] API 설계 확정

---

**최종 승인일:** 2026-01-30
**승인자:** 김장훈
**다음 단계:** `/develop login` 명령으로 개발 시작
