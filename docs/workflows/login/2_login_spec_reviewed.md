# 로그인 기능 기획서 검토 결과

**검토일:** 2026-01-30
**검토자:** Claude AI  
**원본 기획서:** 1_login_spec.md
**상태:** 검토 완료

---

## 검토 요약

### 전체 평가
기획서가 잘 작성되었습니다. OpenSearch 기반 JWT 인증 구현 방향이 명확하며, API 명세와 데이터 모델이 구체적입니다.

### 주요 발견사항
- ✅ 잘 작성된 부분: 사용자 시나리오, API 명세, 보안 고려사항, OpenSearch 인덱스 설계
- ⚠️ 개선 필요: 인덱스 매핑 정의, 환경변수 목록, 초기 계정 생성 방법
- ❌ 누락: 비밀번호 정책 검증 로직, 프론트엔드 라우팅 가드

---

## 1. 요구사항 검토

### 추가 필요 기능
1. 비밀번호 정책 검증 (최소 8자, 영문/숫자 조합 강제 여부)
2. 이메일 형식 검증
3. 동시 로그인 제한 정책
4. 세션 자동 연장 여부

### 비기능 요구사항 제안
- JWT Secret Key 최소 32자
- Rate Limiting (분당 10회 제한)
- 감사 로그 구조 사전 설계

---

## 2. 기술적 실현 가능성

### 필요한 외부 의존성
- python-jose[cryptography] (JWT)
- passlib[bcrypt] (비밀번호 해싱)
- python-multipart (Form 데이터)
- slowapi (Rate Limiting, 선택)

### 기술적 도전과제
1. OpenSearch 동기 API와 FastAPI 비동기 호환 (asyncio.to_thread 사용)
2. JWT 토큰 무효화 (cs_sessions 활용)
3. 초기 관리자 계정 생성 방법

---

## 3. 보안 및 성능

### 보안 권장 조치
1. 앱 시작 시 JWT_SECRET_KEY 존재 여부 확인
2. 로그인 실패 이력 감사 로그 기록
3. 비밀번호 해시 필드에 index: false 설정

### 성능 최적화
- cs_users.email: keyword 타입
- cs_sessions.expires_at: date 타입, range 쿼리 최적화
- bcrypt 해싱 비동기 처리

---

## 4. 데이터 모델

### OpenSearch 인덱스 매핑 제안

**cs_users:**
- id, email, role: keyword
- password_hash: keyword (index: false)
- name: text
- is_active: boolean
- created_at, updated_at, deleted_at, last_login_at: date

**cs_sessions:**
- id, user_id: keyword
- token_hash: keyword (index: false)
- ip_address: ip
- user_agent: text (index: false)
- created_at, expires_at: date
- is_active: boolean

### Pydantic 스키마 제안
- UserBase, UserCreate, UserUpdate, UserResponse
- LoginRequest, LoginResponse
- TokenPayload (sub, exp, iat)

---

## 5. 명확화 필요 사항

### 질문 1: 초기 관리자 계정 생성 방법
- 옵션 A: Python 스크립트 (권장)
- 옵션 B: 앱 최초 실행 시 자동 생성
- 옵션 C: 수동 삽입

### 질문 2: 로그인 실패 횟수 제한
- 옵션 A: IP 기반 제한 (권장)
- 옵션 B: 이메일 기반 제한
- 옵션 C: IP + 이메일 조합

### 질문 3: 토큰 갱신 전략
- 옵션 A: Refresh Token
- 옵션 B: 자동 갱신
- 옵션 C: 재로그인 필수 (권장)

### 질문 4: 동시 로그인 세션
- 옵션 A: 무제한 허용 (권장)
- 옵션 B: 단일 세션만
- 옵션 C: 제한된 수

### 질문 5: 비밀번호 정책
- 옵션 A: 영문+숫자 필수 (권장)
- 옵션 B: 영문+숫자+특수문자 필수
- 옵션 C: 8자만 강제

---

## 6. 개선 제안

### 우선순위 높음
1. OpenSearch 인덱스 매핑 정의
2. 환경변수 목록 (JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES)
3. 초기 관리자 계정 생성 스크립트
4. 비밀번호 정책 명확화

### 우선순위 중간
1. 로그인 실패 제한 정책
2. 이메일 소문자 변환
3. 비활성/삭제 계정 시나리오
4. 인덱스 초기화 스크립트

---

## 10. 검토 질문 답변

### 질문 1: 초기 관리자 계정 생성
**선택한 옵션:**
- 옵션 C: 수동 삽입

**이유:**
- 초기관리자는 'admin'으로 고정 하고자 함

**구체적인 동작:**
admin : 관리자 계정

---

### 질문 2: 로그인 실패 제한
**선택한 옵션:**
- 옵션 B: 이메일 기반 제한

**이유:**
이메일 계정이 ID인 점을 기반하여 횟수제한이 ID에 디펜던시 하도록 구성

**구체적인 동작:**
로그인 실패시, 관리자가 추후 추가될 admin에서 로그인 제한을 풀어주거나 10분 뒤 다시 시도 하도록 제한

---

### 질문 3: 토큰 갱신 전략
**선택한 옵션:**
- 옵션 C: 재로그인 필수 (권장)

**이유:**
토큰이 종료되면 세션 종료 후 재로그인 시도를 통해 새로운 토큰 발급

---

### 질문 4: 동시 로그인 세션
**선택한 옵션:**
- 옵션 A: 무제한 허용 (권장)

**이유:**
현재는 무제한 허용옵션이지만, 추후 이 부분이 admin에서 제어되도록 구성
단 해당 제어되는 부분은 계정별은 아니고 global로 설정.

---

### 질문 5: 비밀번호 정책
**선택한 옵션:**
- 옵션 A: 영문+숫자 필수 (권장)

**이유:**
이 부분 또한 추후 admin에서 제어 가능하도록 구성 단 default 설정이 영문+숫자

---

## 11. 답변 기반 업데이트

### API 명세 확정


### 데이터 모델 확정


### 비기능 요구사항 확정


### 환경변수 목록 확정


### 초기 설정 스크립트


---

## 다음 단계

1. 섹션 10의 질문에 답변 작성
2. 섹션 11에 확정 내용 정리
3. /finalize-spec login 실행

**검토 완료:** 2026-01-30 17:30
