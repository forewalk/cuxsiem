# {FEATURE} 기능 테스트 결과

**테스트 실행일:** {DATE}
**테스터:** AI
**개발 문서:** `6_{feature}_implementation.md`
**상태:** 완료

---

## 📊 테스트 요약

### 전체 결과
```
총 테스트: X개
통과: X개
실패: 0개
건너뜀: 0개
성공률: 100%
```

### 커버리지
```
전체 커버리지: X%
모델: X%
스키마: X%
Repository: X%
Service: X%
Endpoint: X%
```

---

## 1. 단위 테스트 결과

### 1.1 Model 테스트
**파일:** `tests/test_models/test_{feature}.py`

#### 테스트 케이스
- [ ] `test_{feature}_model_creation`: 모델 인스턴스 생성
- [ ] `test_{feature}_model_fields`: 필드 타입 및 제약조건
- [ ] `test_{feature}_model_relationships`: 관계 설정

**결과:**
```
PASSED: X/X tests
실행 시간: X초
```

**상세:**
```python
# 테스트 출력 로그
```

---

### 1.2 Schema 테스트
**파일:** `tests/test_schemas/test_{feature}.py`

#### 테스트 케이스
- [ ] `test_{feature}_create_schema_validation`: 생성 스키마 검증
- [ ] `test_{feature}_update_schema_validation`: 수정 스키마 검증
- [ ] `test_{feature}_response_schema`: 응답 스키마 직렬화
- [ ] `test_invalid_data`: 잘못된 데이터 검증

**결과:**
```
PASSED: X/X tests
실행 시간: X초
```

**상세:**
```python
# 테스트 출력 로그
```

---

### 1.3 Repository 테스트
**파일:** `tests/test_repositories/test_{feature}.py`

#### 테스트 케이스
- [ ] `test_create_{feature}`: 데이터 생성
- [ ] `test_get_{feature}_by_id`: ID로 조회
- [ ] `test_get_all_{features}`: 전체 조회
- [ ] `test_get_all_with_pagination`: 페이지네이션
- [ ] `test_update_{feature}`: 데이터 수정
- [ ] `test_delete_{feature}`: 데이터 삭제
- [ ] `test_get_nonexistent_{feature}`: 존재하지 않는 데이터 조회

**결과:**
```
PASSED: X/X tests
실행 시간: X초
```

**상세:**
```python
# 테스트 출력 로그
```

---

### 1.4 Service 테스트
**파일:** `tests/test_services/test_{feature}.py`

#### 테스트 케이스
- [ ] `test_create_{feature}_service`: 생성 로직
- [ ] `test_create_{feature}_validation`: 비즈니스 규칙 검증
- [ ] `test_get_{feature}_service`: 조회 로직
- [ ] `test_update_{feature}_service`: 수정 로직
- [ ] `test_delete_{feature}_service`: 삭제 로직
- [ ] `test_business_logic_error_handling`: 에러 처리

**결과:**
```
PASSED: X/X tests
실행 시간: X초
```

**상세:**
```python
# 테스트 출력 로그
```

---

## 2. 통합 테스트 결과

### 2.1 API 엔드포인트 테스트
**파일:** `tests/test_api/test_{feature}.py`

#### 테스트 케이스
- [ ] `test_create_{feature}_endpoint`: POST /{features}
- [ ] `test_create_{feature}_invalid_data`: 잘못된 데이터로 생성 시도
- [ ] `test_get_{features}_endpoint`: GET /{features}
- [ ] `test_get_{features}_with_pagination`: 페이지네이션
- [ ] `test_get_{feature}_by_id_endpoint`: GET /{features}/{id}
- [ ] `test_get_nonexistent_{feature}`: 404 에러 테스트
- [ ] `test_update_{feature}_endpoint`: PUT /{features}/{id}
- [ ] `test_update_nonexistent_{feature}`: 존재하지 않는 데이터 수정
- [ ] `test_delete_{feature}_endpoint`: DELETE /{features}/{id}
- [ ] `test_delete_nonexistent_{feature}`: 존재하지 않는 데이터 삭제

**결과:**
```
PASSED: X/X tests
실행 시간: X초
```

**상세:**
```bash
# API 테스트 출력 로그
```

---

### 2.2 인증/인가 테스트 (해당 시)
**파일:** `tests/test_api/test_{feature}_auth.py`

#### 테스트 케이스
- [ ] `test_create_without_auth`: 인증 없이 생성 시도
- [ ] `test_access_with_invalid_token`: 잘못된 토큰으로 접근
- [ ] `test_access_with_insufficient_permissions`: 권한 부족

**결과:**
```
PASSED: X/X tests
```

---

## 3. 데이터베이스 테스트

### 3.1 마이그레이션 테스트
- [ ] `alembic upgrade head`: 마이그레이션 적용 성공
- [ ] 테이블 생성 확인
- [ ] 인덱스 생성 확인
- [ ] 제약조건 확인
- [ ] `alembic downgrade -1`: 롤백 테스트

**결과:**
```
Migration: SUCCESS
Rollback: SUCCESS
```

**마이그레이션 상세:**
```sql
-- 생성된 테이블 구조
SHOW CREATE TABLE {table_name};
```

---

### 3.2 데이터 무결성 테스트
- [ ] 유니크 제약조건 테스트
- [ ] NOT NULL 제약조건 테스트
- [ ] 외래키 제약조건 테스트 (해당 시)
- [ ] 기본값 테스트

**결과:**
```
PASSED: All constraints working correctly
```

---

## 4. 성능 테스트

### 4.1 응답 시간 테스트
```
POST /{features}: Xms (목표: <200ms)
GET /{features}: Xms (목표: <100ms)
GET /{features}/{id}: Xms (목표: <50ms)
PUT /{features}/{id}: Xms (목표: <200ms)
DELETE /{features}/{id}: Xms (목표: <100ms)
```

**결과:** ✅ 모든 엔드포인트가 목표 응답 시간 내에 응답

---

### 4.2 부하 테스트 (간단)
```
동시 사용자: 10명
총 요청: 100개
평균 응답 시간: Xms
최대 응답 시간: Xms
에러율: 0%
```

**결과:** ✅ 정상 동작

---

## 5. 보안 테스트

### 5.1 입력 검증
- [ ] SQL Injection 방지 확인
- [ ] XSS 방지 확인 (해당 시)
- [ ] 입력 길이 제한 확인
- [ ] 특수 문자 처리 확인

**결과:** ✅ 모든 검증 통과

---

### 5.2 인증/인가
- [ ] JWT 토큰 검증
- [ ] 권한 확인
- [ ] CORS 설정 확인 (해당 시)

**결과:** ✅ 보안 요구사항 충족

---

## 6. 에러 처리 테스트

### 6.1 HTTP 상태 코드
- [ ] 200 OK: 성공적인 GET 요청
- [ ] 201 Created: 성공적인 POST 요청
- [ ] 204 No Content: 성공적인 DELETE 요청
- [ ] 400 Bad Request: 잘못된 요청 데이터
- [ ] 401 Unauthorized: 인증 실패
- [ ] 404 Not Found: 리소스 없음
- [ ] 500 Internal Server Error: 서버 에러

**결과:** ✅ 모든 상태 코드 적절히 반환

---

### 6.2 에러 메시지
- [ ] 에러 메시지가 명확함
- [ ] 민감한 정보 노출되지 않음
- [ ] JSON 형식으로 구조화됨

**예시 에러 응답:**
```json
{
  "detail": "Error message"
}
```

---

## 7. 코드 품질 검증

### 7.1 Lint 검사
```bash
$ flake8 app/

결과: No errors
```

---

### 7.2 타입 체크
```bash
$ mypy app/

결과: No errors
```

---

### 7.3 테스트 커버리지
```bash
$ pytest --cov=app --cov-report=html

결과:
Total coverage: X%

상세:
- app/models/{feature}.py: X%
- app/schemas/{feature}.py: X%
- app/repositories/{feature}.py: X%
- app/services/{feature}.py: X%
- app/api/v1/endpoints/{feature}.py: X%
```

**커버리지 리포트:** `htmlcov/index.html`

---

## 8. 회귀 테스트

### 8.1 기존 기능 영향 확인
- [ ] 전체 테스트 스위트 실행
- [ ] 기존 API 엔드포인트 정상 동작 확인
- [ ] 데이터베이스 기존 테이블 영향 없음

**결과:**
```bash
$ pytest

PASSED: XXX/XXX tests
```

---

## 9. 엣지 케이스 테스트

### 9.1 경계값 테스트
- [ ] 최소값 입력
- [ ] 최대값 입력
- [ ] 빈 문자열
- [ ] NULL 값 (허용되는 경우)

**결과:** ✅ 모든 경계값 처리 정상

---

### 9.2 동시성 테스트
- [ ] 동일 리소스 동시 수정
- [ ] 동시 생성 요청
- [ ] 데이터베이스 락 처리

**결과:** ✅ 동시성 이슈 없음

---

## 10. 문서화 확인

### 10.1 API 문서 자동 생성
- [ ] Swagger UI 접속: `http://localhost:8000/docs`
- [ ] ReDoc 접속: `http://localhost:8000/redoc`
- [ ] 모든 엔드포인트 표시됨
- [ ] Request/Response 스키마 정확함

**결과:** ✅ API 문서 정상 생성

---

## 11. 발견된 이슈 및 해결

### 이슈 1: [이슈 제목]
**심각도:** Low / Medium / High
**발견 시간:**
**증상:**
**재현 방법:**
**해결 방법:**
**해결 여부:** ✅ 해결 / ⚠️ 미해결

---

## 12. 테스트 환경

### 환경 정보
```
Python: 3.x
FastAPI: x.x.x
PostgreSQL: 15
OS: Darwin/Linux
```

### 데이터베이스
```
Host: localhost
Port: 5432
Database: goodnak_test
```

---

## 13. 최종 결론

### 테스트 결과 요약
✅ **모든 테스트 통과**

### 품질 지표
- 테스트 커버리지: X% (목표: 80% 이상)
- 성능: 목표 응답 시간 내
- 보안: 요구사항 충족
- 코드 품질: Lint 및 Type Check 통과

### 배포 준비 상태
- [x] 모든 테스트 통과
- [x] 코드 품질 검증 완료
- [x] 문서화 완료
- [x] 보안 검증 완료

**✅ 배포 가능 상태**

---

## 14. 다음 단계

**8단계:** 개발 검토 (사람이 직접 코드 리뷰)

**검토 체크리스트:** `.claude/templates/8_review_checklist.md` 참고

---

**테스트 완료 시간:** {COMPLETION_TIME}
**테스트 소요 시간:** {DURATION}
