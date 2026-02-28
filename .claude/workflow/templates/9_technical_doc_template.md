# {FEATURE} 기능 기술 문서

**작성일:** {DATE}
**작성자:** AI
**버전:** 1.0
**상태:** 최종

---

## 📖 문서 개요

이 문서는 `{FEATURE}` 기능의 기술적인 구현 상세와 사용 방법을 설명합니다.

### 대상 독자
- 개발자
- 운영 담당자
- 시스템 관리자

---

## 1. 기능 개요

### 1.1 목적


### 1.2 주요 기능
-
-

### 1.3 개발 기간
- 시작일:
- 완료일:
- 총 소요 기간:

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Endpoint   │  ← app/api/v1/endpoints/{feature}.py
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Service     │  ← app/services/{feature}.py
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  ← app/repositories/{feature}.py
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

### 2.2 레이어별 역할

#### Endpoint (API 레이어)
- **위치:** `app/api/v1/endpoints/{feature}.py`
- **역할:** HTTP 요청/응답 처리, 인증/인가
- **주요 함수:**
  - `create_{feature}()`: POST 요청 처리
  - `get_{features}()`: GET 목록 요청 처리
  - `get_{feature}()`: GET 단건 요청 처리
  - `update_{feature}()`: PUT 요청 처리
  - `delete_{feature}()`: DELETE 요청 처리

#### Service (비즈니스 로직 레이어)
- **위치:** `app/services/{feature}.py`
- **역할:** 비즈니스 규칙 검증, 데이터 가공
- **주요 메서드:**
  - [비즈니스 로직 메서드 목록]

#### Repository (데이터 액세스 레이어)
- **위치:** `app/repositories/{feature}.py`
- **역할:** 데이터베이스 CRUD 작업
- **주요 메서드:**
  - `create()`: 데이터 생성
  - `get_by_id()`: ID로 조회
  - `get_all()`: 전체 조회
  - `update()`: 수정
  - `delete()`: 삭제

#### Model (데이터 모델 레이어)
- **위치:** `app/models/{feature}.py`
- **역할:** 데이터베이스 테이블 정의

#### Schema (데이터 검증 레이어)
- **위치:** `app/schemas/{feature}.py`
- **역할:** 요청/응답 데이터 검증 및 직렬화

---

## 3. 데이터베이스 설계

### 3.1 테이블 스키마

#### `{table_name}` 테이블

```sql
CREATE TABLE {table_name} (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    -- 컬럼 정의

    -- 표준 타임스탬프
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

### 3.2 컬럼 상세

| 컬럼명 | 타입 | Null | 기본값 | 설명 | 인덱스 |
|--------|------|------|--------|------|--------|
| id | BIGINT | NO | AUTO_INCREMENT | Primary Key | PRIMARY |
| | | | | | |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 생성일시 | |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 수정일시 | |
| deleted_at | TIMESTAMP | YES | NULL | 삭제일시 (soft delete) | |

### 3.3 인덱스

```sql
-- Primary Key
pk_{table_name} (id)

-- Foreign Keys (if any)
fk_{table_name}_{ref_table} ({ref_id})

-- Additional Indexes
idx_{table_name}_{column} ({column})
```

### 3.4 관계도 (ERD)

```
[Other Table] ──┬ {relationship} ──┤ [{table_name}]
```

---

## 4. API 명세

### 4.1 Base URL
```
http://localhost:8000/api/v1
```

### 4.2 인증
대부분의 엔드포인트는 JWT 인증이 필요합니다.

```http
Authorization: Bearer <your_jwt_token>
```

---

### 4.3 엔드포인트 목록

#### 1. 생성 (Create)

**Endpoint:** `POST /api/v1/{features}`

**설명:** 새로운 {feature} 생성

**인증:** Required

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "field1": "value1",
  "field2": "value2",
  "created_at": "2025-11-21T12:00:00Z",
  "updated_at": "2025-11-21T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: 잘못된 요청 데이터
  ```json
  {
    "detail": "Validation error message"
  }
  ```
- `401 Unauthorized`: 인증 실패
- `500 Internal Server Error`: 서버 오류

**cURL 예시:**
```bash
curl -X POST http://localhost:8000/api/v1/{features} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

**Python 예시:**
```python
import requests

url = "http://localhost:8000/api/v1/{features}"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "field1": "value1",
    "field2": "value2"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

#### 2. 목록 조회 (List)

**Endpoint:** `GET /api/v1/{features}`

**설명:** {feature} 목록 조회 (페이지네이션)

**인증:** Required

**Query Parameters:**
- `page` (optional, default: 1): 페이지 번호
- `size` (optional, default: 20): 페이지 크기

**Request:**
```http
GET /api/v1/{features}?page=1&size=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "field1": "value1",
      "created_at": "2025-11-21T12:00:00Z"
    },
    {
      "id": 2,
      "field1": "value2",
      "created_at": "2025-11-21T12:05:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "size": 20,
  "pages": 5
}
```

**cURL 예시:**
```bash
curl -X GET "http://localhost:8000/api/v1/{features}?page=1&size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 3. 단건 조회 (Get)

**Endpoint:** `GET /api/v1/{features}/{id}`

**설명:** 특정 {feature} 조회

**인증:** Required

**Path Parameters:**
- `id` (required): {feature} ID

**Response (200 OK):**
```json
{
  "id": 1,
  "field1": "value1",
  "field2": "value2",
  "created_at": "2025-11-21T12:00:00Z",
  "updated_at": "2025-11-21T12:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: {feature}를 찾을 수 없음
  ```json
  {
    "detail": "{Feature} not found"
  }
  ```

**cURL 예시:**
```bash
curl -X GET http://localhost:8000/api/v1/{features}/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### 4. 수정 (Update)

**Endpoint:** `PUT /api/v1/{features}/{id}`

**설명:** {feature} 정보 수정

**인증:** Required

**Request Body:**
```json
{
  "field1": "updated_value"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "field1": "updated_value",
  "field2": "value2",
  "updated_at": "2025-11-21T13:00:00Z"
}
```

**cURL 예시:**
```bash
curl -X PUT http://localhost:8000/api/v1/{features}/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"field1": "updated_value"}'
```

---

#### 5. 삭제 (Delete)

**Endpoint:** `DELETE /api/v1/{features}/{id}`

**설명:** {feature} 삭제 (Soft Delete)

**인증:** Required

**Response (204 No Content):**
(응답 본문 없음)

**Error Responses:**
- `404 Not Found`: {feature}를 찾을 수 없음

**cURL 예시:**
```bash
curl -X DELETE http://localhost:8000/api/v1/{features}/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 코드 예시

### 5.1 Model (app/models/{feature}.py)

```python
from sqlalchemy import Column, BigInteger, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class {FeatureModel}(Base):
    __tablename__ = "{table_name}"

    id = Column(BigInteger, primary_key=True, index=True)
    # 필드 정의

    # 표준 타임스탬프
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
```

### 5.2 Schema (app/schemas/{feature}.py)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class {Feature}Base(BaseModel):
    field1: str = Field(..., description="Field 1 description")

class {Feature}Create({Feature}Base):
    pass

class {Feature}Update(BaseModel):
    field1: Optional[str] = None

class {Feature}Response({Feature}Base):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

---

## 6. 환경 설정

### 6.1 환경 변수

`.env` 파일에 다음 설정 추가 (필요 시):

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/goodnak

# 추가 설정 (있다면)
# FEATURE_SETTING=value
```

### 6.2 데이터베이스 마이그레이션

```bash
# 마이그레이션 적용
alembic upgrade head

# 롤백 (필요 시)
alembic downgrade -1
```

---

## 7. 테스트

### 7.1 단위 테스트 실행

```bash
# Repository 테스트
pytest tests/test_repositories/test_{feature}.py

# Service 테스트
pytest tests/test_services/test_{feature}.py

# API 테스트
pytest tests/test_api/test_{feature}.py
```

### 7.2 전체 테스트 실행

```bash
# 모든 테스트 실행
pytest

# 커버리지 포함
pytest --cov=app --cov-report=html
```

### 7.3 수동 테스트

#### Swagger UI
브라우저에서 접속:
```
http://localhost:8000/docs
```

#### ReDoc
```
http://localhost:8000/redoc
```

---

## 8. 배포 가이드

### 8.1 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 준비
- [ ] 롤백 계획 수립

### 8.2 배포 순서

1. **코드 배포**
   ```bash
   git pull origin main
   ```

2. **의존성 설치**
   ```bash
   pip install -r requirements.txt
   ```

3. **마이그레이션 적용**
   ```bash
   alembic upgrade head
   ```

4. **서버 재시작**
   ```bash
   # 개발 환경
   python -m app.main

   # 운영 환경 (예시)
   supervisorctl restart goodnak_api
   ```

5. **배포 확인**
   - 헬스 체크 엔드포인트 확인
   - 주요 API 동작 확인
   - 로그 모니터링

---

## 9. 운영 가이드

### 9.1 모니터링

#### 로그 위치
```bash
# 애플리케이션 로그
/var/log/goodnak/app.log

# 에러 로그
/var/log/goodnak/error.log
```

#### 주요 모니터링 지표
- API 응답 시간
- 에러율
- 데이터베이스 커넥션 수
- 메모리 사용량

### 9.2 트러블슈팅

#### 문제 1: API 응답 느림
**증상:** API 응답 시간이 2초 이상

**원인:**
- 데이터베이스 쿼리 비효율
- N+1 쿼리 문제
- 인덱스 누락

**해결 방법:**
1. 쿼리 실행 계획 확인
   ```sql
   EXPLAIN ANALYZE SELECT * FROM {table_name} WHERE ...;
   ```
2. 필요 시 인덱스 추가
3. Eager loading 적용

---

#### 문제 2: 마이그레이션 실패
**증상:** `alembic upgrade head` 실패

**원인:**
- 기존 데이터와 충돌
- 제약조건 위반

**해결 방법:**
1. 현재 마이그레이션 상태 확인
   ```bash
   alembic current
   ```
2. 문제 있는 마이그레이션 확인
3. 수동으로 데이터 정리 후 재시도
4. 필요 시 롤백 후 재적용
   ```bash
   alembic downgrade -1
   alembic upgrade head
   ```

---

### 9.3 백업 및 복구

#### 데이터 백업
```bash
# {table_name} 테이블 백업
pg_dump -U postgres -t {table_name} goodnak > {table_name}_backup.sql
```

#### 데이터 복구
```bash
psql -U postgres goodnak < {table_name}_backup.sql
```

---

## 10. 성능 최적화

### 10.1 데이터베이스 최적화
- 적절한 인덱스 사용
- 쿼리 최적화 (N+1 방지)
- 커넥션 풀 설정

### 10.2 API 최적화
- 응답 캐싱 (필요 시)
- 페이지네이션
- 필드 선택 조회 (필요 시)

### 10.3 예상 성능 지표
- 평균 응답 시간: < 100ms
- 처리량: > 1000 req/sec
- 동시 사용자: > 100

---

## 11. 보안 고려사항

### 11.1 인증/인가
- JWT 토큰 기반 인증
- 권한 검사 구현
- 토큰 만료 시간 설정

### 11.2 데이터 보호
- SQL Injection 방지 (ORM 사용)
- XSS 방지 (입력 검증)
- 민감 정보 암호화

### 11.3 API 보안
- HTTPS 사용 (운영 환경)
- CORS 설정
- Rate Limiting (필요 시)

---

## 12. 향후 개선 사항

### 12.1 기능 개선
- [ ] 추가 기능 1
- [ ] 추가 기능 2

### 12.2 성능 개선
- [ ] 캐싱 레이어 추가
- [ ] 비동기 처리 개선

### 12.3 운영 개선
- [ ] 모니터링 대시보드 구축
- [ ] 알림 시스템 연동

---

## 13. 참고 자료

### 관련 문서
- 기획서: `docs/workflows/{feature}/3_{feature}_spec_final.md`
- 개발 계획서: `docs/workflows/{feature}/5_{feature}_dev_plan_final.md`
- 테스트 결과: `docs/workflows/{feature}/7_{feature}_test_results.md`

### 외부 문서
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [SQLAlchemy 공식 문서](https://docs.sqlalchemy.org/)
- [Pydantic 공식 문서](https://docs.pydantic.dev/)

---

## 14. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|-----|------|----------|--------|
| {DATE} | 1.0 | 초안 작성 | Claude AI |

---

## 15. 문의 및 지원

기술적 문의사항은 다음을 참고하세요:
- 프로젝트 README: `README.md`
- API 문서: `http://localhost:8000/docs`
- 개발 가이드: `CLAUDE.md`

---

**문서 상태:** ✅ 최종
**최종 수정일:** {DATE}
**버전:** 1.0
