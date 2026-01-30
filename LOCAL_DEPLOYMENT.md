# 로컬 배포 가이드 (Login 기능)

이 가이드는 CruxSIEM Login 기능을 로컬 환경에서 실행하는 방법을 설명합니다.

## 📋 필수 요구사항

- **Python:** 3.13+
- **Node.js:** 18+ (프론트엔드)
- **OpenSearch:** ns1.cruxdata.co.kr:11723 (원격 연결)

## 🚀 빠른 시작 (2개 터미널)

### Terminal 1: 백엔드 실행

```bash
# 1. 백엔드 디렉토리 이동
cd backend

# 2. 가상환경 활성화 (이미 설정되어 있다고 가정)
# Windows:
# python -m venv venv
# venv\Scripts\activate
# Linux/Mac:
# python -m venv venv
# source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 백엔드 시작 (포트 8000)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Terminal 2: 프론트엔드 실행

```bash
# 1. 프론트엔드 디렉토리 이동
cd frontend

# 2. 의존성 설치
npm install

# 3. 프론트엔드 시작 (포트 5173)
npm run dev
```

Expected output:
```
  VITE v7.2.4  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## 🌐 접속 정보

### 로그인 페이지
- **URL:** http://localhost:5173/login
- **테스트 계정:** admin@example.com / password123

### Swagger API 문서
- **URL:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 대시보드
- **URL:** http://localhost:5173/dashboard (로그인 후)

---

## 📝 테스트 흐름

### 1. 로그인 테스트

**URL:** http://localhost:5173/login

```
이메일: admin@example.com
비밀번호: password123
Remember Me: [체크/미체크]
로그인 버튼 클릭
```

**예상 동작:**
1. 이메일/비밀번호 유효성 검증
2. 백엔드로 로그인 요청
3. JWT 토큰 발급
4. 대시보드로 리다이렉트

### 2. Swagger로 API 테스트

**1. 로그인 엔드포인트 테스트**
```
POST /api/v1/auth/login

Request:
{
  "email": "admin@example.com",
  "password": "password123",
  "remember_me": false
}

Response (200 OK):
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "user-123",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-01-30T00:00:00",
    "last_login_at": null
  }
}
```

**2. 현재 사용자 조회**
```
GET /api/v1/auth/me
Authorization: Bearer {access_token}

Response (200 OK):
{
  "id": "user-123",
  "email": "admin@example.com",
  "name": "Admin",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-01-30T00:00:00",
  "last_login_at": "2026-01-30T12:34:56"
}
```

**3. 로그아웃**
```
POST /api/v1/auth/logout
Authorization: Bearer {access_token}

Response (204 No Content):
[빈 응답]
```

---

## 🧪 유효성 검증

### 이메일 검증

| 입력 | 결과 | 상태 |
|------|------|------|
| admin@example.com | ✅ 유효 | 200 OK |
| not-an-email | ❌ 검증 실패 | 422 |
| (빈칸) | ❌ 필수 필드 | 422 |

### 비밀번호 검증

| 입력 | 조건 | 결과 | 상태 |
|------|------|------|------|
| password123 | 8자, 영문+숫자 | ✅ 유효 | 200 OK |
| short | 8자 미만 | ❌ 검증 실패 | 422 |
| passwordabc | 숫자 없음 | ❌ 검증 실패 | 422 |
| 123456789 | 영문자 없음 | ❌ 검증 실패 | 422 |

### 로그인 시도 제한

```
1-4회: 일반 401 Unauthorized
5회: 429 Too Many Requests
   "로그인 시도 횟수를 초과했습니다. 10분 후 다시 시도하세요."
```

---

## 🔧 문제 해결

### Backend 포트 이미 사용 중

```bash
# 다른 포트에서 실행
python -m uvicorn app.main:app --reload --port 8001
```

### Frontend 포트 이미 사용 중

```bash
# vite.config.ts에서 포트 변경 또는:
npm run dev -- --port 5174
```

### OpenSearch 연결 실패

```
확인사항:
1. OpenSearch 서버 상태: ns1.cruxdata.co.kr:11723
2. 방화벽 포트 개방 확인
3. .env 파일의 OpenSearch 설정 확인
```

### CORS 에러

```
확인사항:
1. 백엔드: CORS_ORIGINS 설정에 http://localhost:5173 포함
2. API 요청: Authorization 헤더 포함
```

---

## 📊 성능 검증

### 응답 시간 확인

브라우저 개발자 도구 (F12) → Network 탭에서:

| 엔드포인트 | 목표 | 예상 시간 |
|-----------|------|---------|
| POST /auth/login | <200ms | ~50ms |
| GET /auth/me | <100ms | ~40ms |
| POST /auth/logout | <100ms | ~30ms |

---

## 🔐 보안 검증

### JWT 토큰 검증

```bash
# 토큰 내용 확인 (jwt.io 사용)
# Authorization 헤더에서 access_token 복사
# https://jwt.io에 붙여넣기

예상 Payload:
{
  "sub": "user-123",      # user_id
  "exp": 1675000000,      # 만료 시간
  "iat": 1674913600       # 발급 시간
}
```

### 비밀번호 보안

```
✅ bcrypt 해싱 (salt: 12)
✅ 평문 저장 안됨
✅ 토큰 해시 저장 (SHA256)
```

---

## 📱 프론트엔드 기능 테스트

### 1. 로그인 페이지

- [ ] 폼 유효성 검증 메시지 표시
- [ ] Remember Me 체크박스 동작
- [ ] 에러 메시지 표시
- [ ] 로딩 상태 표시
- [ ] 스타일이 올바르게 렌더링됨

### 2. 대시보드

- [ ] 로그인 후 자동 리다이렉트
- [ ] 사용자 정보 표시 (이름, 역할)
- [ ] 로그아웃 버튼 동작
- [ ] 로그아웃 후 로그인 페이지로 이동

### 3. 보안

- [ ] 미인증 상태에서 대시보드 접근 불가
- [ ] 로그아웃 후 토큰 삭제
- [ ] 만료된 토큰 자동 처리

---

## 🛠️ 개발 환경 설정

### VSCode Extensions (권장)

```
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ES7+ React/Redux/React-Native snippets
- Thunder Client (API 테스트)
```

### 디버깅

#### 백엔드 디버깅

```python
# app/services/auth.py에 breakpoint 추가
def login(...):
    breakpoint()  # 여기서 일시 중단
    ...
```

#### 프론트엔드 디버깅

```bash
# package.json에서:
"dev": "vite --debug"
```

---

## 📚 API 엔드포인트 완전 목록

### 인증

| Method | Endpoint | Auth | 설명 |
|--------|----------|------|------|
| POST | /api/v1/auth/login | ❌ | 로그인 |
| POST | /api/v1/auth/logout | ✅ | 로그아웃 |
| GET | /api/v1/auth/me | ✅ | 현재 사용자 |

### 상태 코드

| 코드 | 설명 | 예시 |
|------|------|------|
| 200 | OK | 로그인 성공 |
| 204 | No Content | 로그아웃 성공 |
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 비활성 계정 |
| 404 | Not Found | 리소스 없음 |
| 422 | Unprocessable Entity | 검증 실패 |
| 429 | Too Many Requests | 시도 횟수 초과 |
| 500 | Server Error | 서버 에러 |

---

## 🧹 정리

```bash
# 프로세스 종료
Ctrl + C  # 각 터미널에서

# 의존성 재설치
pip install -r requirements.txt --force-reinstall
npm install --force

# 캐시 삭제
rm -rf node_modules package-lock.json
pip cache purge
```

---

## 📞 지원

문제 발생 시:
1. 로그 메시지 확인 (터미널 출력)
2. 브라우저 개발자 도구 (F12) → Console 탭
3. Network 탭에서 API 요청 확인

---

**마지막 업데이트:** 2026-01-30
**상태:** ✅ 프로덕션 준비 완료

