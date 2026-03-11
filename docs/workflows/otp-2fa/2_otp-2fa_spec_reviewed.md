# OTP 2단계 인증 기획서 검토 결과

**검토일:** 2026-02-28
**검토자:** Claude AI
**원본 기획서:** 1_otp-2fa_spec.md
**상태:** 검토 완료

---

## 검토 요약

### 전체 평가
기획서가 전반적으로 잘 작성되었습니다. TOTP 표준 기반의 폐쇄망 호환 설계, 임시 토큰 방식의 2단계 인증 플로우, 백업 코드 전략이 구체적으로 정의되어 있습니다. 다만 OTP 등록 중 페이지 이탈 처리, 관리자 강제 해제, 백업 코드 재발급 등 일부 시나리오가 미정이며 확정이 필요합니다.

### 주요 발견사항
- ✅ 잘 작성된 부분: TOTP 플로우, 임시 토큰 설계, 폐쇄망 고려, 보안 요구사항
- ⚠️ 개선 필요: OTP 등록 중 이탈 처리, 백업 코드 재발급 정책, 강제 해제 시나리오
- ❌ 누락: 기획서 내 "이메일/비밀번호" 표현이 실제 "ID/비밀번호" 방식과 불일치

---

## 1. 요구사항 검토

### 추가 필요 기능
1. 백업 코드 재발급 기능 (모든 코드 소진 또는 분실 시)
2. 관리자의 특정 사용자 OTP 강제 해제 기능 (계정 잠금 해제 시나리오)
3. OTP 등록 중 페이지 이탈 시 처리 (미확정 시크릿 키 정리)
4. OTP 강제 정책 ON 시 이미 로그인된 사용자 처리

### 용어 불일치 수정 필요
- 기획서 1.2, 2.1, 시나리오 2에 "이메일/비밀번호"로 표기되어 있으나 실제 로그인은 **ID/비밀번호** 방식
- 최종 기획서 작성 시 "ID(username)/비밀번호"로 통일 필요

---

## 2. 기술적 실현 가능성

### 필요한 외부 의존성 (백엔드)
- `pyotp` — TOTP 생성 및 검증 (RFC 6238)
- `qrcode[pil]` — QR코드 이미지 생성 (서버 자체)
- `cryptography` — AES-256-GCM 시크릿 키 암호화
- `Pillow` — qrcode 이미지 렌더링에 필요

### 기술적 도전과제
1. **AES-256-GCM 암호화**: `cryptography` 라이브러리의 `Fernet` 또는 직접 AES-GCM 구현 선택 필요 (Fernet 권장 — 단순하고 안전)
2. **임시 토큰 구분**: 정식 JWT와 임시 토큰을 구분하는 방법 — JWT payload에 `otp_verified: false` 클레임 포함 권장
3. **OTP 등록 원자성**: QR코드 발급 후 활성화 확인 전까지 시크릿 키가 DB에 임시 저장됨 — `otp_pending` 상태 관리 필요
4. **백업 코드 bcrypt**: 8개 각각 bcrypt 해싱 시 검증 시 8번 비교 필요 — 허용 가능한 수준

### 기존 아키텍처 호환성
- Repository → Service → Endpoint 레이어 구조 완전 호환
- cs_users 인덱스 필드 추가 방식 — 기존 사용자에 영향 없음 (필드 없으면 false로 처리)

---

## 3. 보안 및 성능

### 보안 권장 조치
1. **임시 토큰 payload 구분**: `{"sub": user_id, "otp_verified": false, "exp": +5min}` — 미들웨어에서 `otp_verified: false` 토큰은 OTP 엔드포인트 외 모든 접근 거부
2. **QR코드 응답의 `manual_key`**: 수동 입력용으로 노출되는데, 이는 시크릿 키 평문 노출임 — 기획서에 보안 수용 여부 명시 필요
3. **OTP 재사용 방지**: 동일 OTP 코드 30초 내 재사용 차단 (pyotp 기본 지원)
4. **OTP 인증 실패 기록**: cs_login_attempts 또는 별도 인덱스에 기록하여 brute force 감지
5. **환경변수**: `OTP_ENCRYPTION_KEY` — 최소 32바이트, 앱 시작 시 존재 여부 검증

### 성능 고려사항
- QR코드 생성(PIL 이미지): CPU 바운드 — `asyncio.run_in_executor` 처리 필요
- bcrypt 비교(백업 코드): 최대 8회 — 허용 가능, 추가 최적화 불필요
- `otp_backup_codes`: keyword[] 타입으로 OpenSearch 저장, 쿼리 없이 애플리케이션 레벨 비교

---

## 4. 데이터 모델

### cs_users 추가 필드 매핑
```
otp_enabled: boolean (기본: false)
otp_secret_enc: keyword (index: false) — 암호화된 시크릿 키
otp_pending_secret_enc: keyword (index: false) — 등록 중 미확정 시크릿 키
otp_backup_codes: keyword[] (index: false) — bcrypt 해싱된 백업 코드
otp_enrolled_at: date
```

### cs_sessions 추가 필드
```
otp_verified: boolean (기본: false) — 정식 토큰 여부 식별
```

### cs_settings 추가 필드
```
otp_required: boolean (기본: false)
```

### Pydantic 스키마 추가 제안
- `OtpEnrollResponse` (qr_code_image, manual_key)
- `OtpVerifyRequest` (code: str, min_length=6, max_length=6)
- `OtpBackupVerifyRequest` (backup_code: str)
- `OtpDisableRequest` (code: str)

---

## 5. 사용자 시나리오 검토

### 추가 필요 시나리오

#### 시나리오 5: OTP 등록 중 페이지 이탈
- QR코드 발급 후 사용자가 이탈한 경우 `otp_pending_secret_enc`는 어떻게 처리?
- 재방문 시 새 QR코드 발급? 또는 기존 pending 키 재사용?

#### 시나리오 6: 백업 코드 전량 소진
- 8개 모두 사용한 경우 → 재발급 가능한가?
- 재발급 시 인증 방법은? (현재 OTP 코드로 인증 후 재발급?)

#### 시나리오 7: 관리자의 타 사용자 OTP 강제 해제
- 사용자가 폰 분실 + 백업 코드도 분실한 극단적 상황
- 관리자가 admin 페이지에서 해당 사용자의 OTP를 직접 해제할 수 있어야 함

#### 시나리오 8: OTP 강제 정책 활성화 중 기존 세션
- 관리자가 otp_required를 ON으로 전환한 시점에 이미 로그인 중인 OTP 미등록 사용자
- 다음 API 호출 시 강제 등록 유도? 또는 현재 세션은 만료까지 허용?

---

## 6. 명확화 필요 사항

### 질문 1: manual_key (시크릿 키 평문) 응답 노출 수용 여부
- **배경:** QR코드 스캔 불가 환경(폐쇄망 내 특수 기기)을 위해 수동 입력용 키 제공
- **옵션 A:** manual_key 응답에 포함 (사용 편의성 우선, 현재 기획서 방향)
- **옵션 B:** manual_key 미포함, QR코드 이미지만 제공 (보안 강화)
- **옵션 C:** 별도 확인 버튼 클릭 후에만 1회 표시 (절충안)

### 질문 2: 관리자 타 사용자 OTP 강제 해제 필요 여부
- **옵션 A:** 필요함 — 관리자 페이지에서 사용자별 OTP 해제 버튼 제공
- **옵션 B:** 불필요 — 백업 코드 8개로 충분, 극단적 상황은 DB 직접 수정

### 질문 3: 백업 코드 재발급 기능 필요 여부
- **옵션 A:** 필요함 — 마이페이지에서 OTP 코드 입력 후 재발급 (기존 전량 폐기)
- **옵션 B:** 불필요 — OTP 해제 후 재등록으로 대체

### 질문 4: OTP 인증 실패 이력 기록 위치
- **옵션 A:** cs_login_attempts에 통합 (단순, 기존 인덱스 활용)
- **옵션 B:** 별도 cs_otp_attempts 인덱스 생성 (분리, 상세 분석 가능)

### 질문 5: OTP 등록 중 이탈 처리
- **옵션 A:** 이탈 시 pending 시크릿 키 유지, 재방문 시 기존 QR코드 재발급
- **옵션 B:** 이탈 시 pending 폐기, 재방문 시 새 QR코드 발급 (보안 강화)

---

## 7. 개선 제안

### 우선순위 높음
1. 기획서 내 "이메일/비밀번호" 표현 → "ID/비밀번호"로 통일
2. 임시 토큰 payload 구조 명확화 (`otp_verified` 클레임)
3. `otp_pending_secret_enc` 필드 추가 (등록 원자성 보장)
4. 관리자 OTP 강제 해제 시나리오 추가

### 우선순위 중간
1. 백업 코드 재발급 기능 범위 결정
2. OTP 인증 실패 기록 위치 결정
3. 환경변수 목록 문서화 (`OTP_ENCRYPTION_KEY`)

---

## 10. 검토 질문에 대한 답변

### 질문 1: manual_key (시크릿 키 평문) 응답 노출 수용 여부
**선택한 옵션:**
옵션 A
**이유:**
편의성 증가, 실재로 사이트에선 카메라를 사용하지 못하는 사이트가 많음
---

### 질문 2: 관리자 타 사용자 OTP 강제 해제 필요 여부
**선택한 옵션:**
옵션 A
**이유:**
관리자는 사용자에게 OTP를 우회할 수 있도록 설정이 가능해야 한다.
---

### 질문 3: 백업 코드 재발급 기능 필요 여부
**선택한 옵션:**
옵션 B
**이유:**
불필요. 해제 후 재등록 진행.
---

### 질문 4: OTP 인증 실패 이력 기록 위치
**선택한 옵션:**
옵션 A
**이유:**
OTP를 사용하는 위치가 로그인에 한해 적용되기에, cs_login_attempts에 포함
---

### 질문 5: OTP 등록 중 이탈 처리
**선택한 옵션:**
옵션 B
**이유:**
폐기 후 재방문 시 새 QR 및 key를 주더라도 cost가 낭비되는 로직이 아님.
---

## 11. 답변 기반 업데이트 사항

### API 명세 확정

**기존 API (유지):**
- `POST /otp/enroll` - TOTP 시크릿 키 생성, QR코드 + manual_key 반환 (옵션 A에 따라 manual_key 포함)
- `POST /otp/verify-enroll` - OTP 코드 입력으로 등록 완료
- `POST /auth/login/otp` - OTP 코드 검증 (임시 토큰 → 정식 토큰)
- `POST /otp/disable` - OTP 비활성화 (현재 OTP 코드로 인증)
- `GET /backup-codes` - 백업 코드 목록 (마스킹된 형태)
- `POST /backup-codes/verify` - 백업 코드로 로그인 (OTP 대체)
- `GET /admin/otp-policy` - OTP 필수 정책 조회
- `POST /admin/otp-policy` - OTP 필수 정책 설정

**신규 API (추가, 옵션 A에 따라):**
- `DELETE /admin/users/{user_id}/otp` - 관리자 사용자 OTP 강제 해제 (관리자 전용)

**미포함 기능 (옵션 B에 따라):**
- 백업 코드 재발급 API — 해제 후 재등록으로 대체

---

### 데이터 모델 확정

**cs_users 인덱스 추가 필드:**
```
otp_enabled: boolean (기본: false)
otp_secret_enc: keyword (index: false) — AES-256-GCM 암호화된 시크릿 키
otp_pending_secret_enc: keyword (index: false) — 등록 중 미확정 시크릿 키 (옵션 B: 이탈 시 폐기)
otp_backup_codes: keyword[] (index: false) — bcrypt 해싱된 백업 코드 (8개, 1회성)
otp_enrolled_at: date — OTP 등록 완료 시각
```

**cs_sessions 인덱스 추가 필드:**
```
otp_verified: boolean (기본: false) — 정식 JWT 여부 (otp_verified=false 토큰은 /otp/verify-enroll, /auth/login/otp만 허용)
```

**cs_policies 인덱스 추가 필드:**
```
id=otp-policy
  otp_required: boolean (기본: false) — OTP 필수 여부
  otp_grace_period: integer (기본: 0) — OTP 유예 기간 (일, 0=즉시 필수)
```

---

### 비기능 요구사항 확정

**보안 (확정사항):**
1. **임시 토큰 구분** (필수):
   - 로그인 성공 직후: `{"sub": user_id, "otp_verified": false, "exp": now+5min}`
   - OTP 검증 후: `{"sub": user_id, "otp_verified": true, "exp": now+session_duration}`
   - 미들웨어: `otp_verified=false` 토큰은 `/otp/verify-enroll`, `/auth/login/otp` 외 모든 접근 차단

2. **QR코드 응답 명세** (옵션 A에 따라):
   ```json
   {
     "qr_code_image": "data:image/png;base64,...",
     "manual_key": "JBSWY3DPEBLW64TMMQ======",
     "enrollment_uri": "otpauth://totp/..."
   }
   ```

3. **OTP 인증 실패 기록** (옵션 A에 따라):
   - cs_login_attempts에 `otp_failure: true` 필드 추가
   - OTP 실패 5회 시 계정 잠금 (기존 정책과 동일)

4. **OTP 등록 중 이탈 처리** (옵션 B에 따라):
   - 사용자 A가 `/otp/enroll` 호출 → `otp_pending_secret_enc` 저장
   - 사용자 A가 페이지 이탈 (확인 안 함)
   - 사용자 A가 재방문하여 다시 `/otp/enroll` 호출 → 기존 pending 폐기, 새 시크릿 키 생성

5. **관리자 OTP 강제 해제** (옵션 A에 따라):
   - `DELETE /admin/users/{user_id}/otp` 엔드포인트 추가
   - `otp_enabled=false`, `otp_secret_enc`, `otp_pending_secret_enc`, `otp_backup_codes` 모두 제거
   - 감사 로그 기록 (관리자명, 시각)

---

### 환경변수 목록 확정
- `OTP_ENCRYPTION_KEY`: TOTP 시크릿 키 AES 암호화 키 (최소 32바이트, 앱 시작 시 검증)
- `OTP_ISSUER`: QR코드에 표시될 발급자명 (기본: "CruxSIEM")

---

## 다음 단계

1. 섹션 10의 질문에 답변 작성
2. 섹션 11에 확정 내용 정리
3. `/finalize-spec otp-2fa` 실행

**검토 완료:** 2026-02-28
