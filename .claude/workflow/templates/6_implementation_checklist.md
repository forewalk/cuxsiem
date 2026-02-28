# {FEATURE} 기능 구현 체크리스트

**개발 시작일:** {START_DATE}
**개발자:** AI
**기반 문서:** `5_{feature}_dev_plan_final.md`
**상태:** 진행 중

---

## 📋 구현 진행 상황

### 전체 진행률
```
[██████████░░░░░░░░░░] 50% (5/10 완료)
```

---

## Phase 1: 기본 구조

### 1.1 Model 정의
- [ ] SQLAlchemy 모델 클래스 생성
  - 파일: `app/models/{feature}.py`
  - 클래스명: `{FeatureModel}`
  - 테이블명: `{table_name}`
  - 컬럼 정의 완료
  - 관계(Relationships) 정의
  - 인덱스 설정

**구현 내용:**
```python
# 생성된 모델 코드 개요
```

**완료 시간:**

---

### 1.2 Schema 정의
- [ ] Pydantic 스키마 클래스 생성
  - 파일: `app/schemas/{feature}.py`
  - `{Feature}Base`
  - `{Feature}Create`
  - `{Feature}Update`
  - `{Feature}Response`
  - Validator 함수 (필요 시)

**구현 내용:**
```python
# 생성된 스키마 코드 개요
```

**완료 시간:**

---

### 1.3 Alembic 마이그레이션
- [ ] 마이그레이션 파일 생성
  - 명령어: `alembic revision --autogenerate -m "add {feature} table"`
  - 파일 위치: `alembic/versions/{revision}_add_{feature}_table.py`
- [ ] 마이그레이션 검토
  - 테이블 생성 구문 확인
  - 인덱스 생성 확인
  - 제약조건 확인
- [ ] 마이그레이션 적용
  - 명령어: `alembic upgrade head`
  - 결과 확인

**마이그레이션 상태:**
```
Current revision:
Target revision:
Status:
```

**완료 시간:**

---

## Phase 2: 데이터 레이어

### 2.1 Repository 구현
- [ ] Repository 클래스 생성
  - 파일: `app/repositories/{feature}.py`
  - 클래스명: `{Feature}Repository`
- [ ] CRUD 메서드 구현
  - [ ] `create()`: 생성
  - [ ] `get_by_id()`: ID로 조회
  - [ ] `get_all()`: 전체 조회 (페이지네이션 포함)
  - [ ] `update()`: 수정
  - [ ] `delete()`: 삭제 (또는 soft delete)
- [ ] 추가 메서드 (필요 시)
  - [ ] `get_by_{field}()`: 특정 필드로 조회
  - [ ] 기타 커스텀 쿼리

**구현 내용:**
```python
# Repository 주요 메서드 시그니처
```

**완료 시간:**

---

### 2.2 Repository 단위 테스트
- [ ] 테스트 파일 생성
  - 파일: `tests/test_repositories/test_{feature}.py`
- [ ] 테스트 케이스 작성
  - [ ] `test_create_{feature}`: 생성 테스트
  - [ ] `test_get_{feature}_by_id`: 조회 테스트
  - [ ] `test_update_{feature}`: 수정 테스트
  - [ ] `test_delete_{feature}`: 삭제 테스트
  - [ ] 엣지 케이스 테스트
- [ ] 테스트 실행 및 통과 확인

**테스트 결과:**
```
PASSED: X/X tests
Coverage: X%
```

**완료 시간:**

---

## Phase 3: 비즈니스 로직

### 3.1 Service 구현
- [ ] Service 클래스 생성
  - 파일: `app/services/{feature}.py`
  - 클래스명: `{Feature}Service`
- [ ] 비즈니스 로직 메서드 구현
  - [ ] 생성 로직 (validation, transformation 포함)
  - [ ] 조회 로직
  - [ ] 수정 로직
  - [ ] 삭제 로직
- [ ] 에러 처리
  - [ ] 비즈니스 규칙 검증
  - [ ] 예외 상황 처리
  - [ ] 로깅

**구현 내용:**
```python
# Service 주요 메서드 시그니처
```

**완료 시간:**

---

### 3.2 Service 단위 테스트
- [ ] 테스트 파일 생성
  - 파일: `tests/test_services/test_{feature}.py`
- [ ] 테스트 케이스 작성
  - [ ] 정상 시나리오 테스트
  - [ ] 비즈니스 규칙 검증 테스트
  - [ ] 예외 상황 테스트
  - [ ] Mock을 활용한 격리 테스트
- [ ] 테스트 실행 및 통과 확인

**테스트 결과:**
```
PASSED: X/X tests
Coverage: X%
```

**완료 시간:**

---

## Phase 4: API 레이어

### 4.1 Endpoint 구현
- [ ] Router 파일 생성
  - 파일: `app/api/v1/endpoints/{feature}.py`
  - Router 설정: `APIRouter(prefix="/{features}", tags=["{features}"])`
- [ ] 엔드포인트 구현
  - [ ] `POST /{features}`: 생성
  - [ ] `GET /{features}`: 목록 조회
  - [ ] `GET /{features}/{id}`: 단건 조회
  - [ ] `PUT /{features}/{id}`: 수정
  - [ ] `DELETE /{features}/{id}`: 삭제
- [ ] 의존성 주입 설정
  - [ ] `get_db()` 의존성
  - [ ] 인증 의존성 (필요 시)
- [ ] 에러 응답 처리
  - [ ] HTTP 상태 코드
  - [ ] 에러 메시지 구조화

**구현 내용:**
```python
# Endpoint 시그니처
```

**완료 시간:**

---

### 4.2 Router 등록
- [ ] `app/api/v1/endpoints/__init__.py` 수정
  - Router import
  - `api_router.include_router()` 추가

**완료 시간:**

---

### 4.3 API 통합 테스트
- [ ] 테스트 파일 생성
  - 파일: `tests/test_api/test_{feature}.py`
- [ ] 테스트 케이스 작성
  - [ ] `test_create_{feature}`: POST 테스트
  - [ ] `test_get_{features}`: GET 목록 테스트
  - [ ] `test_get_{feature}`: GET 단건 테스트
  - [ ] `test_update_{feature}`: PUT 테스트
  - [ ] `test_delete_{feature}`: DELETE 테스트
  - [ ] 인증/인가 테스트
  - [ ] 에러 케이스 테스트 (400, 404, 500)
- [ ] 테스트 실행 및 통과 확인

**테스트 결과:**
```
PASSED: X/X tests
All endpoints working correctly
```

**완료 시간:**

---

## Phase 5: 통합 및 검증

### 5.1 전체 통합 테스트
- [ ] 엔드 투 엔드 테스트 실행
  - [ ] 실제 시나리오 기반 테스트
  - [ ] 여러 API를 연계한 워크플로우 테스트
- [ ] 데이터 일관성 검증
- [ ] 성능 테스트 (간단한 부하 테스트)

**테스트 결과:**
```
Integration tests: PASSED
Performance: Acceptable
```

**완료 시간:**

---

### 5.2 코드 품질 검증
- [ ] 린트 검사
  - 명령어: `flake8 app/`
  - 결과: No errors
- [ ] 타입 체크
  - 명령어: `mypy app/`
  - 결과: No errors
- [ ] 테스트 커버리지 확인
  - 명령어: `pytest --cov=app`
  - 목표: 80% 이상

**검증 결과:**
```
Lint: PASSED
Type Check: PASSED
Coverage: X%
```

**완료 시간:**

---

### 5.3 수동 테스트
- [ ] Postman/Insomnia로 API 수동 테스트
- [ ] 예외 상황 수동 검증
- [ ] 로그 확인

**완료 시간:**

---

## 추가 작업

### 의존성 업데이트 (필요 시)
- [ ] `requirements.txt` 업데이트
- [ ] 새 패키지 설치 확인

### 설정 변경 (필요 시)
- [ ] `.env.example` 업데이트
- [ ] `CLAUDE.md` 업데이트

---

## 이슈 및 해결 내역

### 이슈 1: [이슈 제목]
**발생 시간:**
**증상:**
**원인:**
**해결 방법:**
**해결 시간:**

---

## 개발 완료 요약

### 생성된 파일 목록
```
app/models/{feature}.py
app/schemas/{feature}.py
app/repositories/{feature}.py
app/services/{feature}.py
app/api/v1/endpoints/{feature}.py
alembic/versions/{revision}_add_{feature}_table.py
tests/test_repositories/test_{feature}.py
tests/test_services/test_{feature}.py
tests/test_api/test_{feature}.py
```

### 수정된 파일 목록
```
app/api/v1/endpoints/__init__.py
requirements.txt (필요 시)
```

### 통계
- **총 코드 라인 수:**
- **총 테스트 케이스 수:**
- **테스트 커버리지:**
- **개발 소요 시간:**

---

## 다음 단계

✅ 7단계: 테스트 실행 (`/test {feature}`)

---

**구현 완료 시간:** {COMPLETION_TIME}
**상태:** 완료 / 진행 중
