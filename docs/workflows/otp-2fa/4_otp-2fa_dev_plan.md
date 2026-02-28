# OTP 2단계 인증 기능 - 개발 계획서

**작성일:** 2026-03-01
**작성자:** Claude AI
**기반:** 최종 기획서 v2.0
**버전:** 1.0
**상태:** 검토 대기중

---

## 목차
1. [A. 아키텍처 설계](#a-아키텍처-설계)
2. [B. 데이터베이스 설계](#b-데이터베이스-설계)
3. [C. API 설계](#c-api-설계)
4. [D. 구현 상세](#d-구현-상세)
5. [E. 마이그레이션 계획](#e-마이그레이션-계획)
6. [F. 의존성 관리](#f-의존성-관리)
7. [G. 테스트 계획](#g-테스트-계획)
8. [H. 구현 순서](#h-구현-순서)

---

## A. 아키텍처 설계

### A.1 레이어 구조

```
┌─────────────────────────────────────────┐
│         API Endpoints (auth.py)         │
│  - POST /api/v1/auth/otp/enroll        │
│  - POST /api/v1/auth/otp/verify-enroll │
│  - POST /api/v1/auth/login/otp         │
│  - POST /api/v1/auth/login/otp/backup  │
│  - DELETE /api/v1/auth/otp             │
│  - DELETE /api/v1/admin/users/{id}/otp │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Service Layer (otp.py)             │
│  - OTPService (핵심 로직)               │
│    • generate_secret()                  │
│    • verify_code()                      │
│    • generate_backup_codes()            │
│    • enroll_user()                      │
│    • revoke_otp()                       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│   Repository Layer (user.py)            │
│  - UserRepository                       │
│    • update_otp_fields()               │
│    • get_by_id()                       │
│    • get_deleted_users()               │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│   OpenSearch (cs_users 인덱스)         │
│  - otp_enabled                          │
│  - otp_secret_enc                       │
│  - otp_pending_secret_enc               │
│  - otp_backup_codes                     │
│  - otp_enrolled_at                      │
└─────────────────────────────────────────┘
```

### A.2 핵심 설계 결정

1. **암호화 방식**
   - 시크릿 키: AES-256-GCM (데이터베이스 저장 시)
   - 백업 코드: bcrypt 해싱 (일회용 검증)
   - 환경변수 `OTP_ENCRYPTION_KEY` (32바이트 이상)

2. **토큰 전략**
   - 임시 토큰: `{"sub": user_id, "otp_verified": false, "exp": +300초}`
   - 정식 토큰: `{"sub": user_id, "otp_verified": true, "exp": +session_duration}`
   - JWT 클레임으로 OTP 검증 상태 추적

3. **백업 코드**
   - 8개 × 8자리 코드
   - bcrypt로 해싱 후 저장
   - 1회 사용 후 소비 (배열에서 제거)
   - 백업 코드 재발급 없음 (해제 후 재등록)

4. **Pending Secret 처리**
   - 등록 시작: `otp_pending_secret_enc` 저장
   - 등록 완료: `otp_secret_enc` 저장, pending 삭제
   - 재등록 중 이탈: 기존 pending 폐기, 새 키 발급

---

## B. 데이터베이스 설계

### B.1 OpenSearch 인덱스 변경

#### cs_users 인덱스 추가 필드

| 필드명 | 타입 | 설명 | 제약조건 |
|--------|------|------|---------|
| `otp_enabled` | boolean | OTP 활성화 여부 | index=true (빠른 검색) |
| `otp_secret_enc` | keyword | AES-256 암호화된 TOTP 시크릿 | index=false (민감 정보) |
| `otp_pending_secret_enc` | keyword | 등록 중 미확정 시크릿 | index=false |
| `otp_backup_codes` | keyword[] | bcrypt 해싱된 백업 코드 배열 | index=false |
| `otp_enrolled_at` | date | OTP 최초 등록/갱신 시각 | ISO 8601 형식 |

#### 다른 인덱스 추가 필드

- **cs_sessions**: `otp_verified` (boolean) - 정식 토큰 여부
- **cs_login_attempts**: `otp_failure` (boolean) - OTP 검증 실패 기록
- **cs_settings**: `otp_required` (boolean), `otp_grace_period` (integer)

---

## C. API 설계

### C.1 신규 API 엔드포인트 (6개)

#### 1. POST /api/v1/auth/otp/enroll
- **설명**: OTP 등록 시작 (QR코드 발급)
- **응답**: qr_code_image, manual_key, enrollment_uri, expires_in (600초)

#### 2. POST /api/v1/auth/otp/verify-enroll
- **설명**: OTP 활성화 확인
- **요청**: code (6자리)
- **응답**: backup_codes (8개), enrolled_at

#### 3. POST /api/v1/auth/login/otp
- **설명**: OTP 코드 검증 (로그인 2단계)
- **헤더**: Authorization (임시토큰)
- **요청**: code (6자리)
- **응답**: access_token (정식 토큰)

#### 4. POST /api/v1/auth/login/otp/backup
- **설명**: 백업 코드 검증 (로그인 2단계 대체)
- **요청**: backup_code (8자리)
- **응답**: access_token

#### 5. DELETE /api/v1/auth/otp
- **설명**: OTP 비활성화 (사용자 자가 해제)
- **요청**: code 또는 backup_code

#### 6. DELETE /api/v1/admin/users/{user_id}/otp
- **설명**: 관리자 사용자 OTP 강제 해제
- **권한**: Admin만 가능

---

## D. 구현 상세

### D.1 Model Layer
**backend/app/models/otp.py**
- OTPConfig: enabled, secret_enc, pending_secret_enc, backup_codes, enrolled_at
- OTPStatus: enabled, enrolled_at, backup_codes_count, is_pending

### D.2 Schema Layer
**backend/app/schemas/otp.py**
- OTPEnrollResponse
- OTPVerifyEnrollRequest/Response
- OTPLoginRequest/Response
- BackupCodeLoginRequest
- OTPDisableRequest

### D.3 Service Layer
**backend/app/services/otp.py**

주요 메서드:
- `generate_secret()` - 새로운 TOTP 시크릿 생성
- `generate_qr_code()` - QR코드 + manual_key 생성
- `verify_code()` - OTP 검증 (±1 window, 30초 슬롯)
- `generate_backup_codes()` - 8개 × 8자리 백업 코드
- `enroll_otp()` - 등록 시작
- `verify_and_confirm_enrollment()` - 등록 완료
- `verify_backup_code()` - 백업 코드 검증 및 소비
- `disable_otp()` - OTP 비활성화
- `admin_disable_otp()` - 관리자 강제 해제

### D.4 Repository Layer
**backend/app/repositories/user.py (추가)**
- `update_otp_field()` - 단일 OTP 필드 업데이트
- `update_otp_config()` - OTP 설정 전체 업데이트
- `clear_otp_fields()` - 모든 OTP 필드 삭제
- `get_user_otp_status()` - OTP 상태 조회

### D.5 API Endpoint Layer
**backend/app/api/v1/endpoints/auth.py (추가)**
- 6개 OTP 관련 엔드포인트 구현
- JWT otp_verified 클레임 추가
- 에러 핸들링 (400, 401, 403, 404)

### D.6 암호화 유틸리티
**backend/app/utils/encryption.py**
- AESEncryption: AES-256-GCM 암호화/복호화
- `encrypt()` - 평문을 base64(nonce+ciphertext) 형식으로 암호화
- `decrypt()` - 암호문 복호화

---

## E. 마이그레이션 계획

**마이그레이션 방식**: OpenSearch 인덱스 매핑 추가
- 스크립트: `backend/scripts/migrate_otp_indices.py`
- 실행: `python -m backend.scripts.migrate_otp_indices`
- 롤백: OpenSearch 백업/복구 (`_snapshot` API)

---

## F. 의존성 관리

### F.1 새로 추가할 패키지

| 패키지 | 버전 | 설명 |
|--------|------|------|
| pyotp | 2.8.0+ | TOTP 구현 (RFC 6238) |
| qrcode | 7.4.2+ | QR코드 생성 |
| cryptography | 41.0.0+ | AES-256-GCM 암호화 |
| Pillow | 10.0.0+ | 이미지 처리 (QR코드) |
| bcrypt | 4.0.1+ | 백업 코드 해싱 |

### F.2 설치

```bash
pip install pyotp==2.8.0 qrcode[pil]==7.4.2 cryptography==41.0.0 Pillow==10.0.0 bcrypt==4.0.1
```

---

## G. 테스트 계획

### G.1 테스트 케이스 (13개)

**Service Layer (7개)**
1. `test_generate_secret` - 시크릿 생성 및 base32 형식 검증
2. `test_enroll_otp` - 등록 시작 (QR코드 + manual_key)
3. `test_verify_and_confirm_enrollment` - 등록 완료 (유효 코드)
4. `test_verify_enrollment_invalid_code` - 등록 실패 (무효 코드)
5. `test_generate_backup_codes` - 8개 × 8자리 백업 코드 생성
6. `test_verify_backup_code_and_consume` - 백업 코드 검증 및 소비
7. `test_disable_otp` - OTP 비활성화 (모든 필드 삭제)

**Repository Layer (3개)**
8. `test_update_otp_field` - 단일 필드 업데이트
9. `test_update_otp_config` - 설정 전체 업데이트
10. `test_clear_otp_fields` - 모든 필드 삭제

**API Endpoint Layer (3개)**
11. `test_post_otp_enroll` - POST /auth/otp/enroll 응답
12. `test_post_otp_login` - POST /auth/login/otp JWT 검증
13. `test_delete_admin_otp` - DELETE /admin/users/{id}/otp 권한 확인

### G.2 테스트 파일 구조
```
backend/tests/
├── services/test_otp_service.py (7개 테스트)
├── repositories/test_user_repository.py (3개 테스트)
└── api/test_auth_endpoints.py (3개 테스트)
```

---

## H. 구현 순서

### Phase 1: 암호화 + 모델 (4시간)
- [ ] AES-256-GCM 암호화 유틸리티 (`backend/app/utils/encryption.py`)
- [ ] OTPConfig, OTPStatus 모델 (`backend/app/models/otp.py`)
- [ ] 요청/응답 스키마 5개 (`backend/app/schemas/otp.py`)
- [ ] `requirements.txt`에 의존성 추가
- [ ] 단위 테스트: 암호화 로직

**체크리스트:**
- [ ] AES 암호화/복호화 양방향 작동
- [ ] base32 시크릿 형식 확인
- [ ] 스키마 Pydantic 검증

---

### Phase 2: OTP 서비스 로직 (6시간)
- [ ] OTPService 클래스 (`backend/app/services/otp.py`)
  - [ ] `generate_secret()` - pyotp.random_base32()
  - [ ] `generate_qr_code()` - qrcode 라이브러리
  - [ ] `verify_code()` - TOTP 검증 (±1 window)
  - [ ] `generate_backup_codes()` - 8개 × 8자리
  - [ ] `enroll_otp()` - pending secret 저장
  - [ ] `verify_and_confirm_enrollment()` - 정식 저장
  - [ ] `verify_backup_code()` - bcrypt 비교 및 소비
  - [ ] `disable_otp()`, `admin_disable_otp()`
- [ ] 서비스 계층 테스트 (7개)

**체크리스트:**
- [ ] TOTP 코드 생성/검증 작동
- [ ] QR코드 base64 인코딩
- [ ] bcrypt 해싱 확인
- [ ] 타임 윈도우 검증
- [ ] 테스트 커버리지 > 80%

---

### Phase 3: Repository + 마이그레이션 (5시간)
- [ ] UserRepository OTP 메서드 추가
  - [ ] `update_otp_field()`
  - [ ] `update_otp_config()`
  - [ ] `clear_otp_fields()`
  - [ ] `get_user_otp_status()`
- [ ] OpenSearch 마이그레이션 (`backend/scripts/migrate_otp_indices.py`)
- [ ] 인덱스 매핑 확인
- [ ] Repository 테스트 (3개)

**체크리스트:**
- [ ] OpenSearch 필드 추가 확인
- [ ] Update 쿼리 성공
- [ ] 마이그레이션 롤백 검증
- [ ] 암호화된 데이터 저장

---

### Phase 4: API 엔드포인트 (6시간)
- [ ] 6개 API 엔드포인트 구현 (`backend/app/api/v1/endpoints/auth.py`)
- [ ] JWT 토큰에 `otp_verified` 클레임 추가
- [ ] `cs_login_attempts` 기록에 `otp_failure` 필드
- [ ] 에러 핸들링 (400, 401, 403, 404)
- [ ] 최대 시도 횟수(OTP_MAX_ATTEMPTS=5) 초과 시 계정 잠금
- [ ] API 테스트 (3개)
- [ ] Swagger 문서 자동 생성

**체크리스트:**
- [ ] 모든 엔드포인트 201/200 응답
- [ ] JWT 클레임 검증
- [ ] 로그인 시도 기록

---

### Phase 5: 프론트엔드 UI (5시간)
- [ ] otpService.ts 작성 (`frontend/src/services/otpService.ts`)
  - [ ] `enrollOTP()`
  - [ ] `verifyEnrollment()`
  - [ ] `loginWithOTP()`
  - [ ] `loginWithBackupCode()`
  - [ ] `disableOTP()`
  - [ ] `adminDisableOTP()`
- [ ] OTPEnrollModal 컴포넌트 (QR + manual_key + 코드 입력)
- [ ] OTPLoginModal 컴포넌트 (OTP/백업코드 탭)
- [ ] MyPage OTP 관리 섹션
- [ ] i18n 키 추가 (4개 파일: ko, en, ja, cn)
- [ ] TypeScript 컴파일 확인 (`npx tsc --noEmit`)

**체크리스트:**
- [ ] 모달 반응성 (모바일)
- [ ] 코드 복사/다운로드
- [ ] 폐쇄망 환경 manual_key 입력
- [ ] 에러 메시지 i18n
- [ ] 타입 안정성

---

## 예상 소요 시간

| Phase | 작업 | 예상 시간 | 누적 |
|-------|------|---------|------|
| 1 | 암호화 + 모델 | 4시간 | 4시간 |
| 2 | 서비스 로직 | 6시간 | 10시간 |
| 3 | Repository + 마이그레이션 | 5시간 | 15시간 |
| 4 | API 엔드포인트 | 6시간 | 21시간 |
| 5 | 프론트엔드 UI | 5시간 | 26시간 |
| **합계** | | | **26시간** |

**버퍼**: 의존성 문제, 토큰 통합 등 +2~3시간 추가 → 총 28~29시간

---

## 보안 체크리스트

- [ ] `OTP_ENCRYPTION_KEY` 환경변수 32바이트 이상
- [ ] 시크릿 키 평문 저장 금지 (AES-256 필수)
- [ ] 백업 코드 bcrypt 해싱 필수
- [ ] OTP 실패 기록 `cs_login_attempts`
- [ ] 최대 시도 횟수(OTP_MAX_ATTEMPTS=5) 초과 시 계정 잠금
- [ ] 임시 토큰 만료 300초 설정
- [ ] JWT 클레임 `otp_verified` 검증
- [ ] Admin OTP 강제 해제 감사 로그
- [ ] TOTP 시간 윈도우 ±1 슬롯 설정

---

**작성 완료:** 2026-03-01
**다음 단계:** `/approve-dev-plan otp-2fa` 명령으로 개발 계획 승인
