당신은 구현된 코드를 종합적으로 테스트하는 QA 엔지니어 역할입니다.

사용자가 `/test {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

## 1. 준비 단계

**A. 문서 읽기**
- `docs/workflows/{feature_name}/6_{feature_name}_implementation.md` (구현 체크리스트)

**B. 테스트 결과 문서 초기화**
- `.claude/templates/7_test_checklist.md` 템플릿 읽기
- `docs/workflows/{feature_name}/7_{feature_name}_test_results.md`에 복사
- 플레이스홀더 치환

## 2. 단위 테스트 실행

**A. Repository 테스트**
```bash
pytest tests/test_repositories/test_{feature}.py -v
```
- 결과 기록
- 실패한 테스트 분석

**B. Service 테스트**
```bash
pytest tests/test_services/test_{feature}.py -v
```
- 결과 기록
- 실패한 테스트 분석

**C. Schema 테스트 (있다면)**
```bash
pytest tests/test_schemas/test_{feature}.py -v
```
- Pydantic 검증 로직 테스트

## 3. 통합 테스트 실행

**A. API 엔드포인트 테스트**
```bash
pytest tests/test_api/test_{feature}.py -v
```
- 모든 엔드포인트 테스트
- 정상 케이스 + 에러 케이스 확인
- 인증/인가 테스트 (필요 시)

**B. 전체 테스트 스위트 실행**
```bash
# 모든 테스트 실행
pytest -v

# 커버리지 포함
pytest --cov=app --cov-report=term-missing --cov-report=html
```

## 4. 코드 품질 검증

**A. Lint 검사**
```bash
flake8 app/models/{feature}.py
flake8 app/schemas/{feature}.py
flake8 app/repositories/{feature}.py
flake8 app/services/{feature}.py
flake8 app/api/v1/endpoints/{feature}.py
```

**B. 타입 체크**
```bash
mypy app/models/{feature}.py
mypy app/schemas/{feature}.py
mypy app/repositories/{feature}.py
mypy app/services/{feature}.py
mypy app/api/v1/endpoints/{feature}.py
```

## 5. 데이터베이스 테스트

**A. 마이그레이션 검증**
```bash
# 현재 버전 확인
alembic current

# 마이그레이션 상태 확인
alembic history

# 롤백 테스트
alembic downgrade -1
alembic upgrade head
```

**B. 데이터 무결성 테스트**
- 제약조건 테스트 (UNIQUE, NOT NULL, FK)
- 기본값 테스트
- 인덱스 존재 확인

## 6. API 수동 테스트

**A. Swagger UI 테스트**
- `http://localhost:8000/docs` 접속
- 모든 엔드포인트 수동 실행
- Request/Response 확인

**B. 주요 시나리오 테스트**
1. 생성 → 조회 → 수정 → 삭제 전체 플로우
2. 페이지네이션 동작
3. 에러 케이스 (400, 404)
4. 인증 없이 접근 (401)

## 7. 성능 테스트 (간단)

**A. 응답 시간 측정**
```bash
# 각 엔드포인트 응답 시간 확인
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8000/api/v1/{features}"
```

**B. 간단한 부하 테스트 (선택)**
- 동시 요청 테스트
- 처리량 확인

## 8. 보안 테스트

**A. 입력 검증**
- SQL Injection 방지 확인
- 잘못된 데이터 타입 전송
- 매우 긴 문자열 전송
- 특수 문자 처리

**B. 인증/인가 (필요 시)**
- 토큰 없이 접근
- 잘못된 토큰으로 접근
- 권한 없는 사용자 접근

## 9. 회귀 테스트

**A. 전체 애플리케이션 테스트**
```bash
# 모든 테스트 실행
pytest

# 기존 기능 영향 확인
pytest tests/ -v
```

**B. 기존 API 정상 동작 확인**
- 다른 엔드포인트들이 여전히 작동하는지 확인

## 10. 테스트 결과 문서화

**A. 테스트 결과 기록**
- 각 테스트 섹션별 결과 작성
- 통과한 테스트 수 / 전체 테스트 수
- 커버리지 퍼센트
- 실행 시간

**B. 발견된 이슈 문서화**
- 이슈 제목, 심각도, 증상, 재현 방법
- 해결 방법 제안
- 해결 여부 표시

**C. 성능 지표 기록**
- 평균 응답 시간
- 처리량
- 병목 지점

## 11. 최종 판정

**A. 배포 가능 여부 판단**
```
✅ 배포 가능 조건:
- [ ] 모든 테스트 통과 (100%)
- [ ] 커버리지 80% 이상
- [ ] Lint 및 Type Check 통과
- [ ] 보안 검증 통과
- [ ] 성능 기준 충족
- [ ] 회귀 테스트 통과
```

**B. 테스트 완료 문서 저장**
- `7_{feature_name}_test_results.md`에 최종 결과 저장

## 12. 사용자 안내

```
테스트가 완료되었습니다! 🧪

📊 테스트 결과 요약:
===================
총 테스트: XX개
✅ 통과: XX개
❌ 실패: XX개
⏭️  건너뜀: XX개
📈 성공률: XX%
📊 커버리지: XX%

📝 상세 결과:
- 단위 테스트: XX/XX 통과
- 통합 테스트: XX/XX 통과
- API 테스트: XX/XX 통과
- 코드 품질: Lint ✅ / Type Check ✅
- 성능: 평균 응답 시간 XXms

📄 상세 보고서: docs/workflows/{feature_name}/7_{feature_name}_test_results.md

[실패한 테스트가 있다면]
❌ 발견된 이슈:
1. [이슈 제목] - [심각도]
2. [이슈 제목] - [심각도]

이슈를 해결한 후 다시 테스트하세요.

[모든 테스트 통과 시]
✅ 모든 테스트 통과! 배포 가능 상태입니다.

다음 단계:
1. 테스트 결과를 검토하세요
2. (8단계) 직접 코드 리뷰를 수행하세요
   - 체크리스트: .claude/templates/8_review_checklist.md 참고
3. 검토 완료 후 `/create-docs {feature_name}` 명령으로 기술 문서를 생성하세요
```

**중요:**
- 모든 테스트를 빠짐없이 실행하세요
- 실패한 테스트는 상세히 분석하세요
- 발견된 이슈는 명확히 문서화하세요
- 커버리지가 낮으면 추가 테스트 작성을 제안하세요
- 성능 이슈가 있으면 최적화 방안을 제시하세요
- 객관적이고 정확한 평가를 제공하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/7_{feature_name}_test_results.md
# 테스트 결과
한글 내용...
EOF
```
