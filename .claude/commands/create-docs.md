당신은 구현된 기능의 포괄적인 기술 문서를 작성하는 테크니컬 라이터 역할입니다.

사용자가 `/create-docs {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

## 1. 준비 단계

**A. 모든 관련 문서 읽기**
- `docs/workflows/{feature_name}/3_{feature_name}_spec_final.md` (최종 기획서)
- `docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md` (최종 개발 계획)
- `docs/workflows/{feature_name}/6_{feature_name}_implementation.md` (구현 체크리스트)
- `docs/workflows/{feature_name}/7_{feature_name}_test_results.md` (테스트 결과)

**B. 구현된 코드 파일 읽기**
- `app/models/{feature}.py`
- `app/schemas/{feature}.py`
- `app/repositories/{feature}.py`
- `app/services/{feature}.py`
- `app/api/v1/endpoints/{feature}.py`

**C. 마이그레이션 파일 확인**
- 최신 alembic 마이그레이션 파일 읽기

## 2. 기술 문서 작성

`.claude/templates/9_technical_doc_template.md` 템플릿을 기반으로 다음 섹션을 작성:

### A. 기능 개요
- 목적 및 주요 기능 요약
- 개발 기간 및 통계

### B. 시스템 아키텍처
- 전체 구조 다이어그램 (ASCII art)
- 레이어별 역할 설명
- 파일 위치 및 클래스명 명시
- 주요 메서드 목록

### C. 데이터베이스 설계
- **실제 구현된** 테이블 스키마 (SQL)
- 컬럼 상세 정보 (타입, NULL 여부, 기본값, 설명, 인덱스)
- 인덱스 목록 (Primary Key, Foreign Key, Additional Indexes)
- 관계도 (ERD)

### D. API 명세
**모든 엔드포인트에 대해:**
- Method, Path, 설명
- 인증 요구사항
- Request Headers
- Request Body (실제 JSON 예시)
- Response (실제 JSON 예시, 성공 + 에러)
- cURL 예시
- Python requests 예시

**작성할 엔드포인트:**
1. POST /{features} - 생성
2. GET /{features} - 목록 조회 (페이지네이션)
3. GET /{features}/{id} - 단건 조회
4. PUT /{features}/{id} - 수정
5. DELETE /{features}/{id} - 삭제

### E. 코드 예시
- Model 클래스 전체 코드
- Schema 클래스 전체 코드
- Repository 주요 메서드
- Service 주요 메서드
- Endpoint 전체 코드

### F. 환경 설정
- 필요한 환경 변수 (.env)
- 데이터베이스 마이그레이션 절차
- 의존성 설치 방법

### G. 테스트 가이드
- 테스트 실행 명령어
- 커버리지 확인 방법
- Swagger UI 사용법

### H. 배포 가이드
- 배포 전 체크리스트
- 배포 순서 (단계별)
- 배포 확인 방법

### I. 운영 가이드
- 로그 위치 및 모니터링 지표
- 트러블슈팅 가이드
  - 자주 발생할 수 있는 문제
  - 증상, 원인, 해결 방법
- 백업 및 복구 절차

### J. 성능 최적화
- 데이터베이스 최적화 팁
- API 최적화 팁
- 예상 성능 지표

### K. 보안 고려사항
- 인증/인가 방식
- 데이터 보호 방법
- API 보안 설정

### L. 향후 개선 사항
- 추가 기능 제안
- 성능 개선 아이디어
- 운영 개선 방안

## 3. 실제 데이터 기반 작성

**중요:** 템플릿의 플레이스홀더를 실제 구현 내용으로 치환:

- `{FEATURE}` → 기능 이름 (사람이 읽기 쉬운 형태)
- `{feature}` → feature_name (kebab-case)
- `{FeatureModel}` → 실제 모델 클래스명
- `{table_name}` → 실제 테이블명
- `{features}` → API 경로 (복수형)
- `{DATE}` → 오늘 날짜
- 실제 컬럼, 필드, 메서드명 사용
- 실제 Request/Response JSON 예시 작성

## 4. 코드에서 정보 추출

**A. 테이블 구조**
- Model 파일에서 컬럼 정의 추출
- 데이터 타입, 제약조건 확인

**B. API 시그니처**
- Endpoint 파일에서 함수 시그니처 추출
- Request/Response 스키마 확인

**C. 비즈니스 로직**
- Service 파일에서 주요 메서드 확인
- 특이사항 문서화

## 5. 실용적인 예시 작성

**A. cURL 예시**
- 모든 엔드포인트에 대한 실행 가능한 cURL 명령어
- 실제 데이터 예시 포함

**B. Python 예시**
- requests 라이브러리를 사용한 API 호출 예시
- 에러 처리 포함

**C. 사용 시나리오**
- 실제 사용 예시 (생성 → 조회 → 수정 → 삭제)

## 6. 문서 검증

**A. 완전성 확인**
- [ ] 모든 섹션이 채워짐
- [ ] 모든 API 엔드포인트 문서화됨
- [ ] 코드 예시가 실제 구현과 일치
- [ ] 에러 처리 방법 포함
- [ ] 환경 설정 가이드 포함

**B. 정확성 확인**
- [ ] 테이블 스키마가 실제 구현과 일치
- [ ] API 경로가 정확함
- [ ] Request/Response 예시가 정확함
- [ ] cURL 명령어가 실행 가능함

**C. 가독성 확인**
- [ ] 명확하고 이해하기 쉬움
- [ ] 적절한 예시 포함
- [ ] 섹션 구조가 논리적임

## 7. 기술 문서 저장

- `docs/workflows/{feature_name}/9_{feature_name}_technical_doc.md`에 저장

## 8. 사용자 안내

```
기술 문서가 생성되었습니다! 📚

📄 기술 문서: docs/workflows/{feature_name}/9_{feature_name}_technical_doc.md

📖 문서 내용:
=============
✅ 기능 개요 및 아키텍처
✅ 데이터베이스 설계 (테이블, 컬럼, 인덱스)
✅ API 명세 (X개 엔드포인트, Request/Response 예시)
✅ 코드 예시 (Model, Schema, Repository, Service, Endpoint)
✅ 환경 설정 및 배포 가이드
✅ 테스트 가이드 (단위/통합 테스트, Swagger UI)
✅ 운영 가이드 (모니터링, 트러블슈팅, 백업)
✅ 성능 최적화 및 보안 고려사항

🔗 빠른 링크:
- API 문서: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- 전체 워크플로우: docs/workflow_templates/WORKFLOW_GUIDE.md

🎉 9단계 워크플로우가 모두 완료되었습니다!

📁 생성된 워크플로우 문서:
1. ✅ 기획서 (초안)
2. ✅ 기획서 검토
3. ✅ 기획서 (최종)
4. ✅ 개발 계획 (초안)
5. ✅ 개발 계획 (최종)
6. ✅ 구현 체크리스트
7. ✅ 테스트 결과
8. ⚠️  개발 검토 (사용자가 직접 수행)
9. ✅ 기술 문서

다음 단계 (선택):
- Git 커밋: 변경사항을 커밋하세요
- PR 생성: 풀 리퀘스트를 생성하세요
- 배포: 운영 환경에 배포하세요

🎊 수고하셨습니다!
```

**중요:**
- 실제 구현 코드를 정확히 반영하세요
- 실행 가능한 예시를 제공하세요
- 개발자와 운영자 모두가 이해할 수 있게 작성하세요
- 문서가 최신 상태를 유지하도록 하세요
- 트러블슈팅 정보를 풍부하게 포함하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/9_{feature_name}_technical_doc.md
# 기술 문서
한글 내용...
EOF
```
