# OTP 2단계 인증 기능 - 최종 기획서

**작성일:** 2026-02-28
**작성자:** 김장훈
**검토자:** Claude AI
**최종 확정일:** 2026-03-01
**버전:** 2.0
**상태:** 최종 확정

---

## 변경 이력 요약

### 검토 반영 사항 (5가지 질문 답변 확정)

| 항목 | 원안 | 최종안 | 선택 옵션 |
|------|------|--------|----------|
| 용어 표현 | 이메일/비밀번호 | ID/비밀번호 | - |
| OTP 등록 중 이탈 | 미정 | Pending 폐기 후 새 키 발급 | 옵션 B |
| 관리자 강제 해제 | 미정 | DELETE /admin/users/{id}/otp 추가 | 옵션 A |
| 백업 코드 재발급 | 검토 예정 | 미포함 (해제 후 재등록) | 옵션 B |
| OTP 실패 기록 | cs_login_attempts vs 별도 | cs_login_attempts 통합 | 옵션 A |
| manual_key 노출 | 검토 예정 | 응답에 포함 | 옵션 A |

### 주요 추가사항
- ✅ otp_pending_secret_enc 필드 추가 (등록 프로세스 원자성)
- ✅ 임시 토큰에 otp_verified: false 클레임 추가
- ✅ 관리자 사용자 OTP 강제 해제 시나리오 추가
- ✅ OTP 인증 실패 기록을 cs_login_attempts에 통합
- ✅ QR코드 응답에 manual_key 포함 (폐쇄망 환경 지원)

---

## 1. 개요

### 1.1 목적
cruxSIEM에 TOTP(Time-based One-Time Password) 기반 2단계 인증(2FA)을 추가하여 보안 관제 플랫폼의 계정 보안을 강화합니다.

### 1.2 배경
- SIEM 플랫폼은 민감한 보안 로그 및 이벤트 데이터를 다루므로 계정 탈취 시 피해가 큼
- 폐쇄망(내부망) 환경에서도 동작해야 하므로 외부 서버 의존 없이 구현
- Google Authenticator, Microsoft Authenticator 등 범용 TOTP 앱과 호환되는 RFC 6238 표준 사용
- 기존 로그인 플로우(ID/비밀번호)에 OTP 검증 단계를 추가

### 1.3 범위

**포함:**
- 사용자별 OTP 등록 (QR코드 스캔)
- OTP 활성화/비활성화
- 로그인 시 OTP 검증 단계 추가
- 백업 코드 발급 (OTP 앱 분실 시 대체)
- 관리자에서 전체 OTP 강제 활성화 정책 설정
- 관리자의 특정 사용자 OTP 강제 해제 (극단적 상황 대응)
- 폐쇄망 완전 지원 (외부 통신 없음)

**제외:**
- SMS/이메일 OTP (TOTP 앱 방식만 지원)
- Push 알림 방식 인증
- FIDO2/WebAuthn (향후 고려)
- OTP 앱 직접 배포
- 백업 코드 재발급 (해제 후 재등록으로 대체)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### 필수 기능 (Must Have)
1. TOTP 시크릿 키 생성 (pyotp.random_base32)
2. QR코드 생성 (서버에서 직접 생성, 외부 API 불사용)
   - QR코드 이미지 + manual_key(수동 입력용) 함께 제공
3. OTP 코드 검증 (±1 window, 30초 슬롯)
4. OTP 활성화 플로우 (QR스캔 → 코드 입력 → 확인)
5. 로그인 2단계: ID/비밀번호 통과 후 OTP 코드 입력 화면
6. 백업 코드 발급 (8자리 코드 8개, 1회성)
7. 관리자 설정: 전체 사용자 OTP 필수 여부 토글
8. 사용자 마이페이지: OTP 등록/해제 UI
9. 관리자의 특정 사용자 OTP 강제 해제 (신규, Q2 옵션 A)

---

## 3. 데이터 모델

### 3.1 OpenSearch 인덱스 추가 필드

#### cs_users
```
otp_enabled: boolean (기본: false)
otp_secret_enc: keyword (index: false) - AES-256 암호화된 시크릿 키
otp_pending_secret_enc: keyword (index: false) - 등록 중 미확정 시크릿 키
otp_backup_codes: keyword[] (index: false) - bcrypt 해싱된 백업 코드
otp_enrolled_at: date - OTP 등록 완료 시각
```

#### cs_sessions (신규 필드)
```
otp_verified: boolean (기본: false) - 정식 JWT 여부
```

#### cs_settings (신규 필드)
```
otp_required: boolean (기본: false) - OTP 필수 여부
otp_grace_period: integer (기본: 0) - OTP 유예 기간 (일)
```

#### cs_login_attempts (신규 필드)
```
otp_failure: boolean (기본: false) - OTP 인증 실패 여부
```

### 3.2 임시 토큰 구조
```
임시 토큰: {"sub": user_id, "otp_verified": false, "exp": +5min}
정식 토큰: {"sub": user_id, "otp_verified": true, "exp": +session_duration}
```

---

## 4. API 명세

### 4.1 신규 API

#### POST /api/v1/auth/otp/enroll
OTP 등록 시작 (QR코드 발급)
- 응답: qr_code_image, manual_key, enrollment_uri

#### POST /api/v1/auth/otp/verify-enroll
OTP 활성화 확인
- 요청: code (6자리)
- 응답: backup_codes (8개)

#### POST /api/v1/auth/login/otp
OTP 코드 검증 (로그인 2단계)
- 헤더: Authorization (임시토큰, otp_verified: false)
- 요청: code (6자리)
- 응답: access_token (정식 토큰)

#### POST /api/v1/auth/login/otp/backup
백업 코드 검증 (로그인 2단계 대체)
- 요청: backup_code (8자리)
- 응답: access_token

#### DELETE /api/v1/auth/otp
OTP 비활성화
- 요청: code (6자리 또는 backup_code)

#### DELETE /api/v1/admin/users/{user_id}/otp (신규, Q2 옵션 A)
관리자 사용자 OTP 강제 해제
- 설명: 폰 분실 + 백입력 코드 분실 시 극단적 상황 대응

### 4.2 기존 API 수정

#### POST /api/v1/auth/login
OTP 등록 사용자: {"otp_required": true, "temp_token": "...", ...}

---

## 5. 주요 시나리오

### 시나리오 1: OTP 최초 등록
1. /otp/enroll 호출 → otp_pending_secret_enc 저장
2. QR코드 + manual_key 반환
3. /otp/verify-enroll 호출 → otp_secret_enc 저장, pending 폐기

### 시나리오 2: OTP 로그인
1. 로그인 → 임시 토큰 (otp_verified: false)
2. /login/otp 호출 → 정식 토큰 (otp_verified: true)

### 시나리오 3: 등록 중 이탈 (Q5 옵션 B)
1. /otp/enroll 호출 → pending 저장
2. 사용자 이탈
3. 재방문 시 /otp/enroll 호출 → 기존 pending 폐기, 새 키 발급

### 시나리오 4: 관리자 강제 해제 (Q2 옵션 A)
1. DELETE /admin/users/{id}/otp 호출
2. otp_enabled=false, 모든 OTP 필드 제거
3. 감사 로그 기록

---

## 6. 보안 요구사항

### 확정사항
- ✅ manual_key 응답에 포함 (Q1 옵션 A) - 폐쇄망 편의성
- ✅ 임시 토큰에 otp_verified: false 클레임 (필수)
- ✅ OTP 실패 기록을 cs_login_attempts 통합 (Q4 옵션 A)
- ✅ OTP 등록 중 이탈 시 pending 폐기 (Q5 옵션 B) - 보안 강화
- ✅ 관리자 사용자 OTP 강제 해제 기능 (Q2 옵션 A)

---

## 7. 성공 기준

### 완료 조건
- [ ] TOTP 시크릿 키 생성 및 QR코드 API 구현
- [ ] 임시 토큰 구조 구현 (otp_verified 클레임)
- [ ] OTP 활성화/비활성화 플로우
- [ ] 로그인 2단계 OTP 검증
- [ ] 백업 코드 발급 및 검증
- [ ] 관리자 OTP 강제 정책
- [ ] 관리자 사용자 OTP 강제 해제 API (신규)
- [ ] otp_pending_secret_enc 이탈 처리 (신규)
- [ ] 프론트엔드 UI/UX 구현
- [ ] 폐쇄망 동작 검증
- [ ] 단위 테스트 (커버리지 > 80%)

---

## 8. 환경변수

- OTP_ENCRYPTION_KEY: AES 암호화 키 (최소 32바이트)
- OTP_ISSUER: QR코드 발급자명 (기본: "cruxSIEM")
- OTP_TOKEN_EXPIRY: 임시 토큰 유효기간 (기본: 300초)
- OTP_MAX_ATTEMPTS: 최대 시도 횟수 (기본: 5)
- OTP_TIME_WINDOW: 시간 윈도우 (기본: 2)

---

## 변경 이력

| 날짜 | 버전 | 상태 | 변경사항 |
|-----|------|------|----------|
| 2026-02-28 | 1.0 | 초안 | 기획서 작성 |
| 2026-02-28 | 1.1 | 검토 | 5가지 질문 제안 |
| 2026-03-01 | 2.0 | **최종 확정** | 5가지 답변 반영 완료 |

---

**최종 확정:** 2026-03-01 ✅

이 문서는 개발 단계의 기준이 됩니다.
