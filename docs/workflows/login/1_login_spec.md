# 로그인 기능 기획서

**작성일:** 2026-01-30
**작성자:** 김장훈
**버전:** 1.0
**상태:** 초안

---

## 1. 개요

### 1.1 목적
CruxSIEM 웹 애플리케이션에 사용자 인증 및 로그인 기능을 구현하여 보안 관제 플랫폼에 대한 접근 제어를 수행합니다.

### 1.2 배경
- SIEM 플랫폼은 민감한 보안 로그 및 이벤트 데이터를 다루므로 인증된 사용자만 접근 가능해야 함
- OpenSearch 기반 NoSQL 구조에서 사용자 정보를 관리하고 세션 기반 인증을 구현
- Figma 디자인 시안(docs/figma/login/login.svg)을 기반으로 UI 구현

### 1.3 범위

**포함:**
- 사용자 로그인 페이지 (이메일/비밀번호 기반)
- 로그아웃 기능
- 세션 기반 인증 (JWT 토큰)
- OpenSearch 시스템 인덱스를 통한 사용자 정보 관리 (cs_users, cs_sessions)
- 비밀번호 암호화 (bcrypt)
- 로그인 실패 처리 및 에러 메시지
- 인증 미들웨어 (FastAPI Dependency)

**제외:**
- 회원가입 기능 (향후 개발)
- 비밀번호 찾기/재설정 (향후 개발)
- 소셜 로그인 (OAuth) (향후 개발)
- 2단계 인증 (2FA) (향후 개발)
- 비회원 모드 (향후 개발)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)
1. 이메일/비밀번호 입력 폼 (Figma 디자인 기반)
2. 로그인 요청 API 엔드포인트 (POST /api/v1/auth/login)
3. 로그아웃 API 엔드포인트 (POST /api/v1/auth/logout)
4. JWT 토큰 생성 및 검증
5. 인증이 필요한 API에 대한 인증 미들웨어
6. 사용자 정보 조회 API (GET /api/v1/auth/me)
7. OpenSearch 시스템 인덱스 (cs_users, cs_sessions) 생성 및 CRUD

#### 선택 기능 (Should Have)
1. "로그인 상태 유지" 체크박스 (토큰 만료 시간 연장)
2. 로그인 시도 횟수 제한 (Brute Force 방지)
3. 세션 만료 시 자동 로그아웃

#### 향후 고려사항 (Nice to Have)
1. 다국어 지원 (로그인 페이지)
2. 다크모드/라이트모드 토글
3. 로그인 이력 기록

### 2.2 비기능 요구사항

#### 성능
- 로그인 API 응답 시간: 500ms 이내
- 토큰 검증 응답 시간: 100ms 이내
- 동시 로그인 사용자 수: 100명 이상 지원

#### 보안
- 비밀번호는 bcrypt로 해싱 (salt rounds: 12)
- JWT 토큰은 HS256 알고리즘 사용
- 토큰 만료 시간: 기본 24시간, "로그인 유지" 시 7일
- HTTPS 전송 (프로덕션 환경)
- CORS 설정 (허용된 origin만 접근)

#### 가용성
- 서비스 가동률: 99.9%
- OpenSearch 장애 시 graceful degradation

#### 확장성
- 향후 RBAC (Role-Based Access Control) 구현을 위한 구조 고려
- 소셜 로그인 추가 가능한 확장 구조

---

## 3. 사용자 시나리오

### 3.1 주요 사용자
- SIEM 플랫폼 관리자
- 보안 분석가
- 시스템 운영자

### 3.2 사용 시나리오

#### 시나리오 1: 정상 로그인
**사전 조건:**
- 사용자 계정이 cs_users 인덱스에 등록되어 있음
- 브라우저에서 로그인 페이지 접근

**실행 단계:**
1. 사용자가 이메일과 비밀번호를 입력
2. "로그인" 버튼 클릭
3. 백엔드에서 이메일로 사용자 조회
4. 비밀번호 해시 비교 검증
5. JWT 토큰 생성 및 반환
6. 프론트엔드에서 토큰을 localStorage에 저장
7. 메인 대시보드로 리디렉션

**기대 결과:**
- 로그인 성공 후 대시보드 화면 표시
- 이후 API 요청 시 Authorization 헤더에 토큰 포함

**예외 상황:**
- 이메일이 존재하지 않음 → "이메일 또는 비밀번호가 올바르지 않습니다" 표시
- 비밀번호 불일치 → 동일 메시지 표시 (보안상 이유로 구체적 정보 미제공)
- 네트워크 오류 → "서버 연결에 실패했습니다" 표시

---

#### 시나리오 2: 로그아웃
**사전 조건:**
- 사용자가 로그인된 상태

**실행 단계:**
1. 사용자가 헤더의 "로그아웃" 버튼 클릭
2. 백엔드 로그아웃 API 호출 (토큰 무효화)
3. 프론트엔드에서 localStorage의 토큰 삭제
4. 로그인 페이지로 리디렉션

**기대 결과:**
- 로그인 페이지로 이동
- 세션 정보 삭제

**예외 상황:**
- 네트워크 오류 시에도 로컬 토큰 삭제하여 로그아웃 처리

---

#### 시나리오 3: 인증되지 않은 접근
**사전 조건:**
- 사용자가 로그인하지 않은 상태
- 또는 토큰이 만료된 상태

**실행 단계:**
1. 사용자가 보호된 페이지 (예: /dashboard) 접근 시도
2. 프론트엔드에서 토큰 확인
3. 토큰이 없거나 만료된 경우 로그인 페이지로 리디렉션

**기대 결과:**
- 로그인 페이지로 자동 이동
- 로그인 후 원래 접근하려던 페이지로 복귀

**예외 상황:**
- 없음

---

## 4. 데이터 요구사항

### 4.1 OpenSearch 시스템 인덱스

#### cs_users (사용자 정보)
| 필드명 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|------|
| id | keyword | Y | 사용자 UUID (Primary Key) |
| email | keyword | Y | 이메일 (Unique) |
| password_hash | text | Y | bcrypt 해시된 비밀번호 |
| name | text | Y | 사용자 이름 |
| role | keyword | Y | 역할 (admin, analyst, viewer 등) |
| is_active | boolean | Y | 활성 상태 (기본: true) |
| created_at | date | Y | 생성일시 |
| updated_at | date | Y | 수정일시 |
| deleted_at | date | N | 삭제일시 (Soft delete) |
| last_login_at | date | N | 마지막 로그인 일시 |

#### cs_sessions (세션 정보)
| 필드명 | 타입 | 필수 여부 | 설명 |
|-------|------|----------|------|
| id | keyword | Y | 세션 UUID (Primary Key) |
| user_id | keyword | Y | 사용자 ID (cs_users.id 참조) |
| token | keyword | Y | JWT 토큰 (해시값 저장) |
| ip_address | ip | N | 로그인 IP 주소 |
| user_agent | text | N | User-Agent 정보 |
| created_at | date | Y | 세션 생성일시 |
| expires_at | date | Y | 세션 만료일시 |
| is_active | boolean | Y | 활성 상태 |

### 4.2 데이터 생성/수정/삭제
- **생성:** 로그인 시 cs_sessions에 새 세션 생성
- **수정:** 로그인 시 cs_users.last_login_at 업데이트
- **삭제:** 로그아웃 시 cs_sessions.is_active = false로 변경 (Soft delete)
- **조회:** 토큰 검증 시 cs_sessions 조회, 사용자 정보 조회 시 cs_users 조회

---

## 5. API 요구사항

### 5.1 필요한 엔드포인트

#### API 1: 로그인
- **Method:** POST
- **Path:** /api/v1/auth/login
- **설명:** 이메일/비밀번호로 로그인하여 JWT 토큰 발급
- **요청 파라미터:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "remember_me": false
  }
  ```
- **응답 (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "uuid-1234",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "admin"
    }
  }
  ```
- **에러 응답 (401 Unauthorized):**
  ```json
  {
    "detail": "이메일 또는 비밀번호가 올바르지 않습니다"
  }
  ```

#### API 2: 로그아웃
- **Method:** POST
- **Path:** /api/v1/auth/logout
- **설명:** 현재 세션 무효화
- **헤더:** Authorization: Bearer {token}
- **요청 파라미터:** 없음
- **응답 (204 No Content):**
  ```json
  (본문 없음)
  ```

#### API 3: 현재 사용자 정보 조회
- **Method:** GET
- **Path:** /api/v1/auth/me
- **설명:** 현재 로그인된 사용자 정보 반환
- **헤더:** Authorization: Bearer {token}
- **응답 (200 OK):**
  ```json
  {
    "id": "uuid-1234",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "admin",
    "last_login_at": "2026-01-30T10:30:00Z"
  }
  ```

#### API 4: 토큰 갱신 (선택)
- **Method:** POST
- **Path:** /api/v1/auth/refresh
- **설명:** 만료 직전 토큰을 새 토큰으로 갱신
- **헤더:** Authorization: Bearer {token}
- **응답 (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400
  }
  ```

---

## 6. UI/UX 요구사항

### 6.1 화면 구성
**로그인 페이지** (docs/figma/login/login.svg 기반)
- 중앙 정렬 로그인 폼
- cruxSIEM 로고 또는 타이틀
- 이메일 입력 필드 (TextField)
- 비밀번호 입력 필드 (TextField, type="password")
- "로그인 상태 유지" 체크박스
- "로그인" 버튼 (MUI Button, color="secondary")
- 에러 메시지 표시 영역 (Alert 컴포넌트)
- 다크모드 기본 적용 (MUI 테마)

### 6.2 사용자 플로우
1. 사용자가 브라우저에서 애플리케이션 접근
2. 인증되지 않은 경우 `/login` 페이지로 리디렉션
3. 이메일/비밀번호 입력 후 "로그인" 버튼 클릭
4. 로그인 성공 시 `/dashboard` (또는 메인 페이지)로 이동
5. 로그인 실패 시 에러 메시지 표시

---

## 7. 제약사항 및 고려사항

### 7.1 기술적 제약사항
- OpenSearch는 관계형 DB가 아니므로 JOIN 불가 (비정규화 필요)
- OpenSearch에는 Foreign Key 개념이 없음 (애플리케이션 레벨에서 참조 무결성 보장)
- JWT는 stateless이므로 토큰 무효화를 위해 세션 테이블 필요

### 7.2 비즈니스 제약사항
- 초기 관리자 계정은 수동으로 생성 (회원가입 기능 없음)
- 비밀번호 정책: 최소 8자 이상 (영문, 숫자, 특수문자 조합 권장)

### 7.3 외부 의존성
- OpenSearch 서버 가용성
- 환경변수에 JWT_SECRET_KEY 설정 필요

### 7.4 법적/규정 준수 사항
- 개인정보보호법에 따른 비밀번호 암호화 의무
- 로그인 이력 기록 (향후 감사 로그 구현 시 활용)

---

## 8. 성공 기준

### 8.1 완료 조건
- [X] OpenSearch cs_users, cs_sessions 인덱스 생성 및 매핑 정의
- [X] 백엔드 로그인/로그아웃 API 구현 및 테스트 통과
- [X] JWT 토큰 생성/검증 로직 구현
- [X] 인증 미들웨어 (get_current_user) 구현
- [X] 프론트엔드 로그인 페이지 구현 (Figma 디자인 기반)
- [X] 토큰 저장 및 API 요청 시 자동 포함
- [X] 인증되지 않은 접근 시 로그인 페이지 리디렉션
- [X] 단위 테스트 및 통합 테스트 작성 (pytest)
- [X] API 문서 (Swagger) 업데이트

### 8.2 측정 지표
- 로그인 API 응답 시간 < 500ms
- 토큰 검증 시간 < 100ms
- 단위 테스트 커버리지 > 80%

---

## 9. 일정 및 우선순위

### 9.1 우선순위
- [X] P0 - 긴급/필수

### 9.2 예상 일정
- 기획 완료: 2026-01-30
- 개발 완료: 2026-01-31
- 테스트 완료: 2026-02-01
- 배포: 2026-02-02

---

## 10. 참고자료

- Figma 디자인: docs/figma/login/login.svg
- FastAPI 공식 문서: https://fastapi.tiangolo.com/tutorial/security/
- JWT 공식 사이트: https://jwt.io/
- bcrypt 라이브러리: https://pypi.org/project/bcrypt/
- OpenSearch 공식 문서: https://opensearch.org/docs/latest/

---

## 11. 질문 및 미결정 사항

1. 초기 관리자 계정 생성 방법 (마이그레이션 스크립트? 수동 생성?)
 > 패스워드 초기화 버튼 클릭으로 난수 패스워드 생성 후, 로그인시 변경 유도
2. 로그인 실패 횟수 제한 정책 (5회? 10회?)
 > 해당 사항도 admin에서 설정 가능한 형태로 제공 해야 함, default 5회
3. 토큰 만료 시 자동 갱신 vs 재로그인 요구
 > 세션 타임 아웃에 대한 설정도 admin에서 설정 가능한 형태 제공, default 24시간 자동 로그아웃
4. 패스워드 복잡도에 따른 정책 설정 부분을 나중에 admin페이지에서 고려설계 해야함
5. i18n 적용
6. 사용자 그룹이 권한으로 분리되어 적용되어야 하고 해당 권한에 추후 index 이름을 화이트리스트로 접근 권한 관리, 페이지별 권한관리를 고려하여 설계
7. 사용자쪽 업데이트를 위해서 id를 _id 로 매핑해서 _id를 기준으로 업데이트 할 수 있도록 처리

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|-----|------|----------|--------|
| 2026-01-30 | 1.0  | 초안 작성 | 김장훈 |
