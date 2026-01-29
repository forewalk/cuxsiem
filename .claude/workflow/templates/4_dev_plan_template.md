# {FEATURE} 기능 개발 계획서

**작성일:** {DATE}
**작성자:** Claude AI
**기반 문서:** `3_{feature}_spec_final.md`
**상태:** 초안

---

## 📋 개발 개요

### 목표
<!-- 최종 기획서를 기반으로 한 개발 목표 -->


### 개발 범위
-

### 예상 개발 기간
- 예상 소요 시간:

---

## 1. 아키텍처 설계

### 1.1 레이어 구조
```
Endpoint (API Router)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Model (SQLAlchemy ORM)
```

### 1.2 컴포넌트 설계

#### Models (app/models/)
- 파일: `{feature}.py`
- 클래스: `{FeatureModel}`
- 역할: 데이터베이스 테이블 정의

#### Schemas (app/schemas/)
- 파일: `{feature}.py`
- 클래스:
  - `{Feature}Base`: 공통 필드
  - `{Feature}Create`: 생성 시 사용
  - `{Feature}Update`: 수정 시 사용
  - `{Feature}Response`: 응답용
- 역할: 요청/응답 데이터 검증

#### Repositories (app/repositories/)
- 파일: `{feature}.py`
- 클래스: `{Feature}Repository`
- 메서드:
  - `create()`: 데이터 생성
  - `get_by_id()`: ID로 조회
  - `get_all()`: 전체 조회
  - `update()`: 수정
  - `delete()`: 삭제
- 역할: 데이터베이스 CRUD 작업

#### Services (app/services/)
- 파일: `{feature}.py`
- 클래스: `{Feature}Service`
- 메서드:
  - [비즈니스 로직 메서드]
- 역할: 비즈니스 로직 처리

#### Endpoints (app/api/v1/endpoints/)
- 파일: `{feature}.py`
- 라우터: `router = APIRouter()`
- 엔드포인트:
  - `POST /api/v1/{features}`: 생성
  - `GET /api/v1/{features}`: 목록 조회
  - `GET /api/v1/{features}/{id}`: 단건 조회
  - `PUT /api/v1/{features}/{id}`: 수정
  - `DELETE /api/v1/{features}/{id}`: 삭제
- 역할: HTTP 요청/응답 처리

---

## 2. 데이터베이스 설계

### 2.1 테이블 스키마

```sql
CREATE TABLE {table_name} (
    id BIGINT PRIMARY KEY,
    -- 필드 정의

    -- 표준 타임스탬프
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

### 2.2 컬럼 상세

| 컬럼명 | 타입 | Null | 기본값 | 설명 | 인덱스 |
|--------|------|------|--------|------|--------|
| id | BIGINT | NO | AUTO_INCREMENT | PK | PRIMARY |
| | | | | | |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 생성일시 | |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 수정일시 | |
| deleted_at | TIMESTAMP | YES | NULL | 삭제일시 (soft delete) | |

### 2.3 인덱스 전략

```sql
-- Primary Key
ALTER TABLE {table_name} ADD CONSTRAINT pk_{table_name} PRIMARY KEY (id);

-- Foreign Keys (if any)
ALTER TABLE {table_name} ADD CONSTRAINT fk_{table_name}_{ref_table}
    FOREIGN KEY (ref_id) REFERENCES {ref_table}(id);

-- Indexes
CREATE INDEX idx_{table_name}_{column} ON {table_name}({column});
```

### 2.4 관계 (Relationships)
<!-- 다른 테이블과의 관계 -->
-

---

## 3. API 설계

### 3.1 엔드포인트 명세

#### 1. 생성 API
```
POST /api/v1/{features}
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "field1": "value1",
  "field2": "value2"
}

Response (201 Created):
{
  "id": 1,
  "field1": "value1",
  "field2": "value2",
  "created_at": "2025-11-21T00:00:00Z"
}

Error Responses:
- 400: Validation Error
- 401: Unauthorized
- 500: Internal Server Error
```

#### 2. 조회 API (목록)
```
GET /api/v1/{features}?page=1&size=20
Authorization: Bearer <token>

Response (200 OK):
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

#### 3. 조회 API (단건)
```
GET /api/v1/{features}/{id}
Authorization: Bearer <token>

Response (200 OK):
{
  "id": 1,
  ...
}

Error Responses:
- 404: Not Found
```

#### 4. 수정 API
```
PUT /api/v1/{features}/{id}
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "field1": "updated_value"
}

Response (200 OK):
{
  "id": 1,
  "field1": "updated_value",
  "updated_at": "2025-11-21T01:00:00Z"
}
```

#### 5. 삭제 API
```
DELETE /api/v1/{features}/{id}
Authorization: Bearer <token>

Response (204 No Content)

Error Responses:
- 404: Not Found
```

---

## 4. 구현 상세

### 4.1 Model 구현 예시

```python
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class {FeatureModel}(Base):
    __tablename__ = "{table_name}"

    id = Column(BigInteger, primary_key=True, index=True)
    # TODO: 필드 정의

    # 표준 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
```

### 4.2 Schema 구현 예시

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class {Feature}Base(BaseModel):
    # 공통 필드

class {Feature}Create({Feature}Base):
    # 생성 시 필요한 필드
    pass

class {Feature}Update(BaseModel):
    # 수정 가능한 필드 (모두 Optional)
    pass

class {Feature}Response({Feature}Base):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

### 4.3 Repository 구현 예시

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

class {Feature}Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict):
        # TODO: 구현
        pass

    async def get_by_id(self, id: int) -> Optional[{FeatureModel}]:
        # TODO: 구현
        pass

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[{FeatureModel}]:
        # TODO: 구현
        pass
```

### 4.4 Service 구현 예시

```python
from app.repositories.{feature} import {Feature}Repository
from app.schemas.{feature} import {Feature}Create, {Feature}Update

class {Feature}Service:
    def __init__(self, repository: {Feature}Repository):
        self.repository = repository

    async def create_{feature}(self, data: {Feature}Create):
        # TODO: 비즈니스 로직
        pass
```

### 4.5 Endpoint 구현 예시

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.{feature} import {Feature}Service
from app.repositories.{feature} import {Feature}Repository
from app.schemas.{feature} import {Feature}Create, {Feature}Response

router = APIRouter(prefix="/{features}", tags=["{features}"])

@router.post("/", response_model={Feature}Response, status_code=201)
async def create_{feature}(
    data: {Feature}Create,
    db: AsyncSession = Depends(get_db)
):
    # TODO: 구현
    pass
```

---

## 5. 마이그레이션 계획

### 5.1 Alembic 마이그레이션 생성

```bash
# 마이그레이션 파일 생성
alembic revision --autogenerate -m "add {feature} table"

# 마이그레이션 적용
alembic upgrade head
```

### 5.2 마이그레이션 내용
- 테이블 생성
- 인덱스 추가
- 외래키 제약조건 추가

---

## 6. 의존성 관리

### 6.1 필요한 패키지
<!-- requirements.txt에 추가할 패키지 -->

```
# 이미 설치된 패키지
fastapi
sqlalchemy
asyncpg
pydantic
alembic

# 추가 필요 패키지 (있다면)
# package-name==version
```

---

## 7. 테스트 계획

### 7.1 단위 테스트
- Repository 레이어 테스트
- Service 레이어 테스트
- Schema 검증 테스트

### 7.2 통합 테스트
- API 엔드포인트 테스트
- 데이터베이스 연동 테스트

### 7.3 테스트 커버리지 목표
- 최소 80% 이상

---

## 8. 보안 고려사항

### 8.1 인증/인가
- JWT 토큰 검증
- 권한 확인

### 8.2 데이터 검증
- Pydantic 스키마 검증
- SQL Injection 방지 (SQLAlchemy ORM 사용)

### 8.3 에러 처리
- 민감 정보 노출 방지
- 적절한 HTTP 상태 코드 반환

---

## 9. 성능 최적화

### 9.1 데이터베이스
- 적절한 인덱스 설정
- N+1 쿼리 방지 (eager loading)
- 커넥션 풀 설정

### 9.2 API
- 페이지네이션 적용
- 응답 캐싱 (필요 시)

---

## 10. 구현 순서

### Phase 1: 기본 구조 (1-2 hours)
- [ ] 1. Model 정의
- [ ] 2. Schema 정의
- [ ] 3. Alembic 마이그레이션 생성 및 적용

### Phase 2: 데이터 레이어 (1-2 hours)
- [ ] 4. Repository 구현
- [ ] 5. Repository 단위 테스트

### Phase 3: 비즈니스 로직 (1-2 hours)
- [ ] 6. Service 구현
- [ ] 7. Service 단위 테스트

### Phase 4: API 레이어 (1-2 hours)
- [ ] 8. Endpoint 구현
- [ ] 9. API 통합 테스트

### Phase 5: 통합 및 검증 (1 hour)
- [ ] 10. 전체 통합 테스트
- [ ] 11. 린트 및 타입 체크
- [ ] 12. 문서화

---

## 11. 롤백 계획

### 11.1 마이그레이션 롤백
```bash
alembic downgrade -1
```

### 11.2 배포 롤백
- 이전 버전으로 복구 절차

---

## 12. 다음 단계

✅ 5단계: 개발 계획 승인 (`/approve-dev-plan {feature}`)

---

**문서 상태:** 초안 (검토 대기)
**승인 후:** 개발 시작 가능
