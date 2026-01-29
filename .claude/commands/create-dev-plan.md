당신은 확정된 기획서를 바탕으로 상세한 개발 계획을 작성하는 시니어 개발자 역할입니다.

사용자가 `/create-dev-plan {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

1. **최종 기획서 읽기 및 분석**
   - `docs/workflows/{feature_name}/3_{feature_name}_spec_final.md` 읽기
   - 요구사항, 데이터 모델, API 요구사항 등 분석

2. **현재 코드베이스 파악**
   - `app/models/` 기존 모델 확인
   - `app/schemas/` 기존 스키마 확인
   - `app/repositories/`, `app/services/`, `app/api/v1/endpoints/` 구조 파악
   - `alembic/versions/` 최신 마이그레이션 확인
   - `requirements.txt` 현재 의존성 확인

3. **상세 개발 계획 수립**
   `.claude/templates/4_dev_plan_template.md` 템플릿을 기반으로 다음을 작성:

   **A. 아키텍처 설계**
   - 레이어별 컴포넌트 상세 설계
   - 파일 경로 및 클래스명 명시
   - 메서드 시그니처 정의

   **B. 데이터베이스 설계**
   - 테이블 스키마 SQL 작성
   - 컬럼 상세 정의 (타입, NULL 여부, 기본값, 인덱스)
   - CLAUDE.md의 네이밍 컨벤션 준수 (snake_case, plural, is_/has_ 접두사 등)
   - 외래키 관계 정의
   - 인덱스 전략 (WHERE 절에 자주 사용되는 컬럼)

   **C. API 설계**
   - 모든 엔드포인트 상세 명세
   - Request/Response 예시 (실제 JSON)
   - HTTP 상태 코드 및 에러 응답
   - 인증/인가 요구사항

   **D. 구현 상세**
   - Model, Schema, Repository, Service, Endpoint 코드 골격 제시
   - SQLAlchemy 모델 예시 코드
   - Pydantic 스키마 예시 코드
   - 주요 메서드 시그니처

   **E. 마이그레이션 계획**
   - Alembic 마이그레이션 생성 및 적용 절차
   - 롤백 계획

   **F. 의존성 관리**
   - 새로 필요한 패키지 목록 (있다면)
   - 버전 명시

   **G. 테스트 계획**
   - 테스트 파일 구조
   - 테스트 케이스 목록
   - 커버리지 목표

   **H. 구현 순서**
   - Phase 1-5로 구분
   - 각 Phase별 작업 항목 체크리스트
   - 예상 소요 시간

4. **개발 계획 문서 생성**
   - 플레이스홀더 치환:
     - `{FEATURE}` → 기능 이름
     - `{DATE}` → 오늘 날짜
     - `{feature}` → feature_name (kebab-case)
     - `{FeatureModel}` → Pascal case 모델명
     - `{table_name}` → snake_case plural 테이블명
     - `{features}` → API 엔드포인트 경로 (복수형)
   - `docs/workflows/{feature_name}/4_{feature_name}_dev_plan.md`에 저장

5. **사용자 안내**
   ```
   개발 계획서가 작성되었습니다! 📋

   📄 개발 계획서: docs/workflows/{feature_name}/4_{feature_name}_dev_plan.md

   🏗️  주요 내용:
   - 아키텍처 설계: [레이어 구조]
   - 데이터베이스: [테이블 수] 테이블, [인덱스 수] 인덱스
   - API: [엔드포인트 수] 엔드포인트
   - 예상 소요 시간: [예상 시간]

   📁 생성될 파일:
   - app/models/{feature}.py
   - app/schemas/{feature}.py
   - app/repositories/{feature}.py
   - app/services/{feature}.py
   - app/api/v1/endpoints/{feature}.py
   - alembic/versions/xxx_add_{feature}_table.py

   다음 단계:
   - 개발 계획서를 검토하세요
   - 수정이 필요하면 알려주세요
   - 승인하려면 `/approve-dev-plan {feature_name}` 명령을 실행하세요
   ```

**중요:**
- CLAUDE.md의 프로젝트 규칙을 철저히 따르세요
- 데이터베이스 네이밍 컨벤션 준수 (테이블: snake_case plural, 컬럼: snake_case, FK: {table}_id)
- 레이어 구조 (Model → Schema → Repository → Service → Endpoint) 준수
- FastAPI + async SQLAlchemy + PostgreSQL 환경에 맞는 코드 제시
- 구체적이고 실행 가능한 계획 작성
- 보안과 성능을 고려한 설계

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/4_{feature_name}_dev_plan.md
# 개발 계획서
한글 내용...
EOF
```
