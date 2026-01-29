당신은 확정된 개발 계획을 바탕으로 실제 코드를 구현하는 시니어 풀스택 개발자 역할입니다.

사용자가 `/develop {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

## 1. 준비 단계

**A. 문서 읽기**
- `docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md` (최종 개발 계획)

**B. 구현 체크리스트 생성**
- `.claude/templates/6_implementation_checklist.md` 템플릿 읽기
- `docs/workflows/{feature_name}/6_{feature_name}_implementation.md`에 복사
- 플레이스홀더 치환하여 초기화

**C. Todo List 생성**
- TodoWrite 도구를 사용하여 구현 단계별 할 일 목록 생성
- Phase 1-5의 모든 작업 항목을 todo로 등록

## 2. Phase 1: 기본 구조 구현

**A. Model 정의 (app/models/{feature}.py)**
- SQLAlchemy 모델 클래스 작성
- 테이블명: snake_case, plural (예: users, order_items)
- 컬럼: snake_case (예: created_at, is_active, user_id)
- Primary Key: id (BIGINT)
- Foreign Key: {table}_id 형식
- 타임스탬프: created_at, updated_at, deleted_at
- 관계(Relationships) 정의
- 인덱스 설정

**B. Schema 정의 (app/schemas/{feature}.py)**
- Pydantic 스키마 클래스 작성
- `{Feature}Base`: 공통 필드
- `{Feature}Create`: 생성용 (필수 필드)
- `{Feature}Update`: 수정용 (모두 Optional)
- `{Feature}Response`: 응답용 (id, timestamps 포함)
- Validator 함수 (필요 시)
- Config: `from_attributes = True`

**C. Alembic 마이그레이션**
```bash
# 마이그레이션 생성
alembic revision --autogenerate -m "add {feature} table"

# 마이그레이션 파일 검토
# - 테이블 생성 구문 확인
# - 인덱스 생성 확인
# - 제약조건 확인

# 마이그레이션 적용
alembic upgrade head
```

## 3. Phase 2: 데이터 레이어 구현

**A. Repository 구현 (app/repositories/{feature}.py)**
```python
class {Feature}Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict):
        # 데이터 생성 로직
        pass

    async def get_by_id(self, id: int) -> Optional[Model]:
        # ID로 조회 (deleted_at이 NULL인 것만)
        pass

    async def get_all(self, skip: int = 0, limit: int = 100):
        # 전체 조회 (페이지네이션)
        pass

    async def update(self, id: int, data: dict):
        # 수정 로직
        pass

    async def delete(self, id: int):
        # Soft delete 또는 Hard delete
        pass
```

**B. Repository 테스트**
- `tests/test_repositories/test_{feature}.py` 작성
- 모든 CRUD 메서드 테스트
- pytest 실행하여 통과 확인

## 4. Phase 3: 비즈니스 로직 구현

**A. Service 구현 (app/services/{feature}.py)**
```python
class {Feature}Service:
    def __init__(self, repository: {Feature}Repository):
        self.repository = repository

    async def create_{feature}(self, data: {Feature}Create):
        # 비즈니스 규칙 검증
        # Repository 호출
        # 응답 반환
        pass
```

**B. Service 테스트**
- `tests/test_services/test_{feature}.py` 작성
- 비즈니스 로직 테스트
- Mock을 사용한 격리 테스트
- pytest 실행하여 통과 확인

## 5. Phase 4: API 레이어 구현

**A. Endpoint 구현 (app/api/v1/endpoints/{feature}.py)**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/{features}", tags=["{features}"])

@router.post("/", response_model={Feature}Response, status_code=201)
async def create_{feature}(
    data: {Feature}Create,
    db: AsyncSession = Depends(get_db)
):
    # Service 호출
    # 응답 반환
    pass

@router.get("/", response_model=List[{Feature}Response])
async def get_{features}(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    # 목록 조회
    pass

@router.get("/{id}", response_model={Feature}Response)
async def get_{feature}(id: int, db: AsyncSession = Depends(get_db)):
    # 단건 조회
    # 404 처리
    pass

@router.put("/{id}", response_model={Feature}Response)
async def update_{feature}(
    id: int,
    data: {Feature}Update,
    db: AsyncSession = Depends(get_db)
):
    # 수정
    # 404 처리
    pass

@router.delete("/{id}", status_code=204)
async def delete_{feature}(id: int, db: AsyncSession = Depends(get_db)):
    # 삭제
    # 404 처리
    pass
```

**B. Router 등록**
- `app/api/v1/endpoints/__init__.py` 수정
```python
from .{feature} import router as {feature}_router

api_router.include_router(
    {feature}_router,
    prefix="/{features}",
    tags=["{features}"]
)
```

**C. API 테스트**
- `tests/test_api/test_{feature}.py` 작성
- 모든 엔드포인트 테스트
- 정상 케이스 + 에러 케이스 (400, 404, 500)
- pytest 실행하여 통과 확인

## 6. Phase 5: 통합 및 검증

**A. 전체 테스트 실행**
```bash
# 모든 테스트 실행
pytest

# 커버리지 확인
pytest --cov=app --cov-report=html
```

**B. 코드 품질 검증**
```bash
# Lint 검사
flake8 app/

# 타입 체크
mypy app/
```

**C. 수동 테스트**
- 서버 실행: `python -m app.main`
- Swagger UI 접속: `http://localhost:8000/docs`
- 각 API 수동 테스트

**D. 의존성 업데이트 (필요 시)**
```bash
# requirements.txt에 새 패키지 추가
echo "new-package==version" >> requirements.txt

# 설치
pip install -r requirements.txt
```

## 7. 진행 상황 추적

**실시간 업데이트:**
- 각 작업 완료 시 TodoWrite로 상태 업데이트
- `6_{feature_name}_implementation.md` 파일에 진행 상황 기록
- 발생한 이슈 및 해결 방법 문서화

## 8. 구현 완료

**A. 최종 확인**
- [ ] 모든 파일 생성 완료
- [ ] 모든 테스트 통과
- [ ] Lint 및 Type Check 통과
- [ ] API 문서 자동 생성 확인

**B. 사용자 안내**
```
개발이 완료되었습니다! 🎉

📁 생성된 파일:
- app/models/{feature}.py ✅
- app/schemas/{feature}.py ✅
- app/repositories/{feature}.py ✅
- app/services/{feature}.py ✅
- app/api/v1/endpoints/{feature}.py ✅
- alembic/versions/xxx_add_{feature}_table.py ✅
- tests/test_repositories/test_{feature}.py ✅
- tests/test_services/test_{feature}.py ✅
- tests/test_api/test_{feature}.py ✅

✅ 테스트 결과:
- 단위 테스트: XX/XX 통과
- 통합 테스트: XX/XX 통과
- 커버리지: XX%

✅ 코드 품질:
- Lint: 통과
- Type Check: 통과

🌐 API 문서:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

다음 단계:
`/test {feature_name}` 명령으로 전체 테스트를 다시 실행하세요!
```

**중요:**
- CLAUDE.md의 모든 규칙을 철저히 따르세요
- 각 레이어의 책임을 명확히 분리하세요
- 에러 처리를 꼼꼼히 구현하세요
- 테스트를 작성하며 개발하세요 (TDD)
- 진행 상황을 실시간으로 사용자에게 알려주세요
- 문제 발생 시 즉시 사용자에게 알리고 해결 방안 논의하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/6_{feature_name}_implementation.md
# 제목
한글 내용...
EOF
```
