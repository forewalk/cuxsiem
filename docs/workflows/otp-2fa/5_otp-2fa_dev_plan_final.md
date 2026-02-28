# OTP 2단계 인증 기능 - 최종 개발 계획서

**작성일:** 2026-03-01
**승인일:** 2026-03-01
**작성자:** Claude AI
**승인자:** 사용자
**기반:** 개발 계획 v1.0 (4_otp-2fa_dev_plan.md)
**버전:** 1.0 (최종)
**상태:** ✅ 승인됨 - 개발 준비 완료

---

## 목차
1. [개요](#개요)
2. [승인 내역](#승인-내역)
3. [아키텍처 설계](#아키텍처-설계)
4. [데이터베이스 설계](#데이터베이스-설계)
5. [API 설계](#api-설계)
6. [구현 상세](#구현-상세)
7. [구현 순서 (5 Phase)](#구현-순서-5-phase)
8. [의존성 관리](#의존성-관리)
9. [테스트 계획](#테스트-계획)
10. [보안 체크리스트](#보안-체크리스트)

---

## 개요

TOTP(Time-based One-Time Password) 기반 OTP 2단계 인증을 cruxSIEM에 추가하는 프로젝트입니다.

**핵심 목표:**
- 계정 보안 강화
- 폐쇄망(내부망) 완전 지원
- RFC 6238 표준 준수
- 백업 코드를 통한 복구 메커니즘

**주요 특징:**
- ✅ QR코드 + manual_key 생성 (폐쇄망용)
- ✅ AES-256-GCM 시크릿 암호화
- ✅ bcrypt 백업 코드 해싱
- ✅ 관리자 OTP 강제 해제 기능
- ✅ Pending secret 자동 폐기

---

## 승인 내역

### 승인된 설계 결정

| 항목 | 결정 | 사유 |
|------|------|------|
| 암호화 알고리즘 | AES-256-GCM | 업계 표준, 높은 보안 |
| 백업 코드 방식 | bcrypt 해싱 + 일회용 | 보안성, 사용편의성 |
| 백업 코드 재발급 | 미포함 | 해제 후 재등록으로 대체 |
| Pending Secret 처리 | 자동 폐기 | 보안 강화 |
| 토큰 전략 | otp_verified 클레임 | JWT 기반 상태 추적 |
| 관리자 강제 해제 | DELETE 엔드포인트 | 긴급 상황 대응 |

### 확인된 요구사항
- ✅ 6개 API 엔드포인트
- ✅ 4개 인덱스 필드 추가
- ✅ 5개 의존성 패키지
- ✅ 13개 테스트 케이스
- ✅ 5 Phase 구현 계획 (26시간)

---

## 아키텍처 설계

### 계층 구조

```
┌─────────────────────────────────────────┐
│  API Endpoints (auth.py - 6개)          │
│  ├─ POST /auth/otp/enroll              │
│  ├─ POST /auth/otp/verify-enroll       │
│  ├─ POST /auth/login/otp               │
│  ├─ POST /auth/login/otp/backup        │
│  ├─ DELETE /auth/otp                   │
│  └─ DELETE /admin/users/{id}/otp       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Service Layer (otp.py - 9개 메서드)   │
│  ├─ generate_secret()                  │
│  ├─ generate_qr_code()                 │
│  ├─ verify_code()                      │
│  ├─ enroll_otp()                       │
│  ├─ verify_and_confirm_enrollment()    │
│  ├─ verify_backup_code()               │
│  ├─ disable_otp()                      │
│  └─ admin_disable_otp()                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Repository Layer (user.py - 4개 메서드)│
│  ├─ update_otp_field()                 │
│  ├─ update_otp_config()                │
│  ├─ clear_otp_fields()                 │
│  └─ get_user_otp_status()              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  OpenSearch (4개 인덱스, 8개 필드)      │
│  ├─ cs_users (5개 필드)                │
│  ├─ cs_sessions (1개 필드)             │
│  ├─ cs_login_attempts (1개 필드)       │
│  └─ cs_settings (2개 필드)             │
└─────────────────────────────────────────┘
```

### 생성될 파일 구조

**백엔드 (6개 신규 + 2개 수정)**
```
backend/app/
├── utils/encryption.py (신규 - AES-256-GCM)
├── models/otp.py (신규 - OTPConfig, OTPStatus)
├── schemas/otp.py (신규 - 5개 스키마)
├── services/otp.py (신규 - OTPService)
├── repositories/user.py (수정 - 4개 메서드)
├── api/v1/endpoints/auth.py (수정 - 6개 엔드포인트)
└── scripts/migrate_otp_indices.py (신규 - 마이그레이션)

backend/tests/
├── services/test_otp_service.py (7개 테스트)
├── repositories/test_user_repository.py (3개 테스트)
└── api/test_auth_endpoints.py (3개 테스트)
```

**프론트엔드 (3개 신규 + i18n 4개)**
```
frontend/src/
├── services/otpService.ts (신규 - 6개 메서드)
├── components/auth/
│   ├── OTPEnrollModal.tsx (신규)
│   └── OTPLoginModal.tsx (신규)
└── locales/ (4개 파일 업데이트: ko, en, ja, cn)
```

---

## 데이터베이스 설계

### OpenSearch 인덱스 변경사항

#### cs_users 인덱스 (5개 필드 추가)

| 필드 | 타입 | 인덱싱 | 설명 |
|------|------|--------|------|
| `otp_enabled` | boolean | ✅ yes | OTP 활성화 여부 |
| `otp_secret_enc` | keyword | ❌ no | AES-256 암호화된 TOTP 시크릿 |
| `otp_pending_secret_enc` | keyword | ❌ no | 등록 중 미확정 시크릿 |
| `otp_backup_codes` | keyword[] | ❌ no | bcrypt 해싱된 백업 코드 배열 |
| `otp_enrolled_at` | date | ✅ yes | OTP 등록/갱신 시각 (ISO 8601) |

**인덱싱 전략:**
- `otp_enabled`: 활성 사용자 검색용 (빠른 조회)
- 민감 정보(`otp_secret_enc`, `otp_backup_codes`): 인덱싱 제외 (보안)
- `otp_enrolled_at`: 정렬 및 감사용

#### cs_sessions 인덱스 (1개 필드 추가)

| 필드 | 타입 | 설명 |
|------|------|------|
| `otp_verified` | boolean | 임시(false) / 정식(true) 토큰 구분 |

#### cs_login_attempts 인덱스 (1개 필드 추가)

| 필드 | 타입 | 설명 |
|------|------|------|
| `otp_failure` | boolean | OTP 검증 실패 여부 |

#### cs_settings 인덱스 (2개 필드 추가)

| 필드 | 타입 | 설명 |
|------|------|------|
| `otp_required` | boolean | 전체 사용자 OTP 필수 정책 |
| `otp_grace_period` | integer | OTP 필수화 유예 기간 (일) |

---

## API 설계

### 신규 엔드포인트 (6개)

#### 1. POST /api/v1/auth/otp/enroll
**OTP 등록 시작 (QR코드 발급)**

**요청:**
```json
{}
```

**응답 (200 OK):**
```json
{
  "qr_code_image": "data:image/png;base64,iVBORw0KGgo...",
  "manual_key": "JBSWY3DPEBLW64TMMQ6XAWBW",
  "enrollment_uri": "otpauth://totp/cruxSIEM:user@example.com?secret=...",
  "expires_in": 600
}
```

**에러:**
- 400: OTP already enabled
- 401: Unauthorized

---

#### 2. POST /api/v1/auth/otp/verify-enroll
**OTP 활성화 확인**

**요청:**
```json
{
  "code": "123456"
}
```

**응답 (200 OK):**
```json
{
  "backup_codes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2"
  ],
  "enrolled_at": "2026-03-01T10:30:45Z"
}
```

---

#### 3. POST /api/v1/auth/login/otp
**OTP 코드 검증 (로그인 2단계)**

**헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwib3RwX3ZlcmlmaWVkIjpmYWxzZSwiZXhwIjoxNjQwMDAwMzAwfQ.xxx
```

**요청:**
```json
{
  "code": "123456"
}
```

**응답 (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwib3RwX3ZlcmlmaWVkIjp0cnVlLCJleHAiOjE2NDAzNjAwMDB9.xxx",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

#### 4. POST /api/v1/auth/login/otp/backup
**백업 코드 검증 (로그인 2단계 대체)**

**헤더:**
```
Authorization: Bearer [임시토큰]
```

**요청:**
```json
{
  "backup_code": "A1B2C3D4"
}
```

**응답:** (3번 동일)

---

#### 5. DELETE /api/v1/auth/otp
**OTP 비활성화 (사용자 자가 해제)**

**요청:**
```json
{
  "code": "123456"
}
```
또는
```json
{
  "backup_code": "A1B2C3D4"
}
```

**응답 (200 OK):**
```json
{
  "message": "OTP has been disabled"
}
```

---

#### 6. DELETE /api/v1/admin/users/{user_id}/otp
**관리자 사용자 OTP 강제 해제**

**권한:** Admin only

**요청:** (비어있음)

**응답 (200 OK):**
```json
{
  "message": "User OTP has been forcibly disabled",
  "user_id": "user123"
}
```

---

## 구현 상세

### D.1 Model Layer
**파일:** `backend/app/models/otp.py`

```python
@dataclass
class OTPConfig:
    enabled: bool = False
    secret_enc: Optional[str] = None
    pending_secret_enc: Optional[str] = None
    backup_codes: List[str] = field(default_factory=list)
    enrolled_at: Optional[datetime] = None

@dataclass
class OTPStatus:
    enabled: bool
    enrolled_at: Optional[str] = None
    backup_codes_count: int = 0
    is_pending: bool = False
```

### D.2 Schema Layer
**파일:** `backend/app/schemas/otp.py`

5개 스키마:
- OTPEnrollResponse
- OTPVerifyEnrollRequest / Response
- OTPLoginRequest / Response
- BackupCodeLoginRequest
- OTPDisableRequest

### D.3 Service Layer
**파일:** `backend/app/services/otp.py`

9개 메서드:
- `generate_secret()` - pyotp.random_base32()
- `generate_qr_code()` - qrcode 라이브러리
- `verify_code()` - TOTP 검증 (±1 window)
- `enroll_otp()` - 등록 시작
- `verify_and_confirm_enrollment()` - 등록 완료
- `verify_backup_code()` - 백업 코드 검증 및 소비
- `disable_otp()` - OTP 비활성화
- `admin_disable_otp()` - 관리자 강제 해제
- `generate_backup_codes()` - 8개 × 8자리

### D.4 Repository Layer
**파일:** `backend/app/repositories/user.py` (추가 메서드)

4개 메서드:
- `update_otp_field()` - 단일 필드 업데이트
- `update_otp_config()` - 전체 설정 업데이트
- `clear_otp_fields()` - 모든 필드 삭제
- `get_user_otp_status()` - 상태 조회

### D.5 API Endpoint Layer
**파일:** `backend/app/api/v1/endpoints/auth.py` (추가)

6개 엔드포인트 + JWT 통합

### D.6 암호화 유틸리티
**파일:** `backend/app/utils/encryption.py`

```python
class AESEncryption:
    def encrypt(self, plaintext: str) -> str:
        # nonce(12) + ciphertext + tag → base64

    def decrypt(self, encrypted: str) -> str:
        # base64 → nonce + ciphertext → plaintext
```

---

## 구현 순서 (5 Phase)

### Phase 1: 암호화 + 모델 (4시간)
**목표:** 기본 틀 완성

- [ ] `backend/app/utils/encryption.py` - AES-256-GCM
- [ ] `backend/app/models/otp.py` - OTPConfig, OTPStatus
- [ ] `backend/app/schemas/otp.py` - 5개 스키마
- [ ] `requirements.txt` 업데이트
- [ ] 단위 테스트: 암호화 로직

**완료 기준:**
- AES 양방향 암호화 작동
- base32 시크릿 생성
- Pydantic 스키마 검증

---

### Phase 2: OTP 서비스 로직 (6시간)
**목표:** 핵심 비즈니스 로직

- [ ] `backend/app/services/otp.py` - OTPService (9개 메서드)
  - [ ] 시크릿 생성
  - [ ] QR코드 + manual_key 생성
  - [ ] TOTP 검증 (±1 window)
  - [ ] 백업 코드 생성/검증
  - [ ] Pending 관리
- [ ] 서비스 계층 테스트 (7개)

**완료 기준:**
- TOTP 생성/검증 작동
- QR코드 base64 인코딩
- bcrypt 해싱 검증
- 테스트 커버리지 > 80%

---

### Phase 3: Repository + 마이그레이션 (5시간)
**목표:** 데이터 계층 완성

- [ ] `backend/app/repositories/user.py` - 4개 메서드
- [ ] `backend/scripts/migrate_otp_indices.py` - 마이그레이션
- [ ] OpenSearch 인덱스 매핑 적용
- [ ] Repository 테스트 (3개)

**완료 기준:**
- OpenSearch 필드 추가 확인
- Update 쿼리 성공
- 마이그레이션 롤백 검증

---

### Phase 4: API 엔드포인트 (6시간)
**목표:** 외부 인터페이스 구현

- [ ] `backend/app/api/v1/endpoints/auth.py` - 6개 엔드포인트
- [ ] JWT `otp_verified` 클레임 추가
- [ ] `cs_login_attempts` `otp_failure` 필드
- [ ] 에러 핸들링 (400, 401, 403, 404)
- [ ] 최대 시도 횟수 초과 시 계정 잠금
- [ ] API 테스트 (3개)
- [ ] Swagger 자동 생성

**완료 기준:**
- 모든 엔드포인트 201/200 응답
- JWT 검증 작동
- 로그인 시도 기록

---

### Phase 5: 프론트엔드 UI (5시간)
**목표:** 사용자 인터페이스 완성

- [ ] `frontend/src/services/otpService.ts` - 6개 메서드
- [ ] `OTPEnrollModal.tsx` - QR + manual_key + 코드 입력
- [ ] `OTPLoginModal.tsx` - OTP/백업코드 탭
- [ ] MyPage OTP 관리 섹션
- [ ] i18n 키 추가 (4개 파일)
- [ ] `npx tsc --noEmit` 컴파일 확인

**완료 기준:**
- 모달 반응성 (모바일)
- 코드 복사/다운로드
- 폐쇄망 manual_key 입력
- i18n 표시 완벽
- 타입 안정성

---

## 의존성 관리

### 새 패키지 (5개)

```bash
pip install \
  pyotp==2.8.0 \
  qrcode[pil]==7.4.2 \
  cryptography==41.0.0 \
  Pillow==10.0.0 \
  bcrypt==4.0.1
```

### 환경변수

```bash
# .env 또는 시스템 환경변수
OTP_ENCRYPTION_KEY=<32바이트 이상의 키>
OTP_ISSUER=cruxSIEM
OTP_TOKEN_EXPIRY=300
OTP_MAX_ATTEMPTS=5
OTP_TIME_WINDOW=2
```

---

## 테스트 계획

### 13개 테스트 케이스

**Service Layer (7개)**
1. `test_generate_secret` - 시크릿 생성 및 base32 형식
2. `test_enroll_otp` - 등록 시작 (QR + manual_key)
3. `test_verify_and_confirm_enrollment` - 등록 완료 (유효)
4. `test_verify_enrollment_invalid_code` - 등록 실패 (무효)
5. `test_generate_backup_codes` - 8개 × 8자리 생성
6. `test_verify_backup_code_and_consume` - 검증 및 소비
7. `test_disable_otp` - 비활성화 (필드 삭제)

**Repository Layer (3개)**
8. `test_update_otp_field` - 단일 필드 업데이트
9. `test_update_otp_config` - 전체 설정 업데이트
10. `test_clear_otp_fields` - 모든 필드 삭제

**API Endpoint Layer (3개)**
11. `test_post_otp_enroll` - GET /auth/otp/enroll
12. `test_post_otp_login` - POST /auth/login/otp (JWT)
13. `test_delete_admin_otp` - DELETE /admin/users/{id}/otp (권한)

### 테스트 파일 구조

```
backend/tests/
├── services/test_otp_service.py (pytest, 7개)
├── repositories/test_user_repository.py (pytest, 3개)
└── api/test_auth_endpoints.py (pytest, 3개)
```

---

## 보안 체크리스트

- [ ] `OTP_ENCRYPTION_KEY` 32바이트 이상 검증
- [ ] 시크릿 키 평문 저장 금지 (AES-256 필수)
- [ ] 백업 코드 bcrypt 해싱 필수
- [ ] OTP 실패 기록 `cs_login_attempts` 작성
- [ ] 최대 시도 횟수(OTP_MAX_ATTEMPTS=5) 초과 시 계정 잠금
- [ ] 임시 토큰 만료 300초 설정
- [ ] JWT 클레임 `otp_verified` 검증
- [ ] Admin OTP 강제 해제 감사 로그
- [ ] TOTP 시간 윈도우 ±1 슬롯 설정

---

## 타임라인

| Phase | 작업 | 시간 | 누적 | 예상 완료 |
|-------|------|------|------|----------|
| 1 | 암호화 + 모델 | 4시간 | 4시간 | Day 1 AM |
| 2 | 서비스 로직 | 6시간 | 10시간 | Day 1 PM |
| 3 | Repository + 마이그레이션 | 5시간 | 15시간 | Day 2 AM |
| 4 | API 엔드포인트 | 6시간 | 21시간 | Day 2 PM |
| 5 | 프론트엔드 UI | 5시간 | 26시간 | Day 3 AM |
| **버퍼** | 의존성/토큰 통합 | +2~3시간 | 28~29시간 | Day 3 |

---

## 다음 단계

✅ **최종 개발 계획서 승인 완료**

🚀 **개발 시작 준비:**
- 모든 설계 확정
- 아키텍처 검증
- 의존성 목록 확인
- 테스트 계획 수립

📝 **개발 진행:**
1. Phase 1부터 Phase 5까지 순차 진행
2. 각 Phase마다 테스트 작성 및 검증
3. 진행 상황 실시간 추적
4. 이슈 발생 시 즉시 보고

---

**최종 승인 일시:** 2026-03-01
**개발 시작:** 2026-03-01
**예상 완료:** 2026-03-03

이 계획서를 기반으로 개발을 진행합니다.
