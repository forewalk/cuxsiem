# 9단계 개발 워크플로우 - 빠른 시작 가이드

## 🎯 개요

이 워크플로우는 Claude Code를 활용하여 기능 개발을 체계적으로 진행하는 9단계 프로세스입니다.

```
기획 → 검토 → 확정 → 계획 → 승인 → 개발 → 테스트 → 검토 → 문서화
```

## 🚀 5분 만에 시작하기

**중요:** 아래 `/` 로 시작하는 명령어들은 **Claude Code 대화창에 직접 입력**하는 슬래시 커맨드입니다. (bash 터미널이 아닙니다!)

### 1. 워크플로우 시작
**Claude에게 입력:**
```
/workflow-start email-verification
```
→ 9개의 단계별 문서 파일 자동 생성

### 2. 기획서 작성 (사람)
**직접 작성:**
`docs/workflows/email-verification/1_email-verification_spec.md` 파일 작성

### 3. AI 검토 요청
**Claude에게 입력:**
```
/review-spec email-verification
```
→ Claude가 기획서 검토 및 개선사항 제안

### 4. 기획서 확정
**Claude에게 입력:**
```
/finalize-spec email-verification
```
→ Claude와 대화하며 최종 기획서 확정

### 5. 개발 계획 생성
**Claude에게 입력:**
```
/create-dev-plan email-verification
```
→ Claude가 상세 개발 계획 자동 작성

### 6. 개발 계획 승인
**Claude에게 입력:**
```
/approve-dev-plan email-verification
```
→ 계획 검토 및 최종 승인

### 7. 개발 실행
**Claude에게 입력:**
```
/develop email-verification
```
→ Claude가 전체 코드 자동 구현 (Model, Schema, Repository, Service, Endpoint, Tests)

### 8. 테스트 실행
**Claude에게 입력:**
```
/test email-verification
```
→ Claude가 모든 테스트 실행 및 결과 문서화

### 9. 코드 검토 (사람)
**직접 검토:**
`.claude/templates/8_review_checklist.md` 체크리스트로 직접 검토

### 10. 기술 문서 생성
**Claude에게 입력:**
```
/create-docs email-verification
```
→ Claude가 포괄적인 기술 문서 자동 생성

---

## 📋 단계별 상세 가이드

### 1단계: 기획서 작성 (사람) ✍️

**역할:** 개발자/기획자

**명령어:** 없음 (수동 작성)

**작업:**
- `docs/workflows/{feature}/1_{feature}_spec.md` 작성
- 기능 목적, 요구사항, 사용자 시나리오 정의

**템플릿:** `.claude/templates/1_spec_template.md`

**팁:**
- 구체적으로 작성할수록 이후 단계가 수월합니다
- 비기능 요구사항(성능, 보안)도 꼭 포함하세요

---

### 2단계: 기획서 검토 (AI) 🤖

**역할:** Claude

**명령어:** `/review-spec {feature}`

**작업:**
- 요구사항 완전성 검증
- 기술적 실현 가능성 평가
- 데이터베이스 설계 초안 제안
- 보안/성능 고려사항 추가
- 명확화 필요 사항 질문

**출력:** `2_{feature}_spec_reviewed.md`

**팁:**
- Claude의 질문에 성실히 답변하세요
- 제안사항을 꼼꼼히 검토하세요

---

### 3단계: 기획서 확정 (사람 + AI) ✅

**역할:** 개발자 + Claude

**명령어:** `/finalize-spec {feature}`

**작업:**
- Claude의 검토 의견 반영
- 명확화 사항 해결
- 최종 기획서 확정

**출력:** `3_{feature}_spec_final.md`

**팁:**
- 이 문서가 개발의 기준이 됩니다
- 모호한 부분이 없도록 확실히 하세요

---

### 4단계: 개발 계획 작성 (AI) 📋

**역할:** Claude

**명령어:** `/create-dev-plan {feature}`

**작업:**
- 아키텍처 설계 (레이어별)
- 데이터베이스 스키마 설계
- API 엔드포인트 설계
- 구현 순서 및 체크리스트 작성

**출력:** `4_{feature}_dev_plan.md`

**자동 생성 내용:**
- SQLAlchemy 모델 구조
- Pydantic 스키마 구조
- Repository, Service, Endpoint 골격
- 테스트 계획

---

### 5단계: 개발 계획 확정 (사람) ✅

**역할:** 개발자

**명령어:** `/approve-dev-plan {feature}`

**작업:**
- 개발 계획 검토
- 수정 요청 (필요 시)
- 최종 승인

**출력:** `5_{feature}_dev_plan_final.md`

**팁:**
- 데이터베이스 스키마를 꼼꼼히 확인하세요
- API 설계가 RESTful한지 확인하세요

---

### 6단계: 개발 실행 (AI) 💻

**역할:** Claude

**명령어:** `/develop {feature}`

**작업:**
- Model, Schema, Repository, Service, Endpoint 구현
- Alembic 마이그레이션 생성 및 적용
- 단위 테스트, 통합 테스트 작성
- Router 등록
- Lint 및 Type Check

**출력:**
- 구현된 코드 파일들
- `6_{feature}_implementation.md` (체크리스트)

**생성되는 파일:**
```
app/models/{feature}.py
app/schemas/{feature}.py
app/repositories/{feature}.py
app/services/{feature}.py
app/api/v1/endpoints/{feature}.py
alembic/versions/xxx_add_{feature}_table.py
tests/test_repositories/test_{feature}.py
tests/test_services/test_{feature}.py
tests/test_api/test_{feature}.py
```

**진행 상황:**
- Claude가 실시간으로 진행 상황을 알려줍니다
- Todo 리스트로 진행률 추적

---

### 7단계: 테스트 실행 (AI) 🧪

**역할:** Claude

**명령어:** `/test {feature}`

**작업:**
- 모든 단위 테스트 실행
- 모든 통합 테스트 실행
- 코드 커버리지 확인
- Lint 및 Type Check
- 성능 테스트
- 보안 테스트
- 회귀 테스트

**출력:** `7_{feature}_test_results.md`

**테스트 항목:**
- Repository 테스트
- Service 테스트
- API 엔드포인트 테스트
- 데이터베이스 마이그레이션 테스트
- 에러 처리 테스트

---

### 8단계: 개발 검토 (사람) 👀

**역할:** 개발자

**명령어:** 없음 (수동 검토)

**작업:**
- 코드 품질 검토
- 비즈니스 로직 검증
- 보안 취약점 점검
- 성능 확인

**체크리스트:** `.claude/templates/8_review_checklist.md`

**출력:** `8_{feature}_review.md`

**검토 항목:**
- [ ] 코드 스타일 및 가독성
- [ ] 아키텍처 준수
- [ ] 네이밍 컨벤션
- [ ] 에러 처리
- [ ] 비즈니스 로직
- [ ] 데이터베이스 설계
- [ ] API 설계
- [ ] 보안
- [ ] 성능
- [ ] 테스트 커버리지

---

### 9단계: 기술 문서 작성 (AI) 📚

**역할:** Claude

**명령어:** `/create-docs {feature}`

**작업:**
- 포괄적인 기술 문서 자동 생성
- 실제 구현 코드 기반
- 실행 가능한 예시 포함

**출력:** `9_{feature}_technical_doc.md`

**문서 내용:**
- 기능 개요 및 아키텍처
- 데이터베이스 설계 (실제 SQL)
- API 명세 (Request/Response 예시)
- 코드 예시 (전체 코드)
- 환경 설정 및 배포 가이드
- 테스트 가이드
- 운영 가이드 (모니터링, 트러블슈팅)
- 성능 최적화 팁
- 보안 고려사항

---

## 🎯 실전 예시

### 시나리오: 이메일 인증 기능 개발

**Claude Code 대화창에서 순서대로 입력:**

```
1. 워크플로우 시작
/workflow-start email-verification

2. 기획서 작성 (파일 직접 편집)
→ docs/workflows/email-verification/1_email-verification_spec.md 작성

3. AI 검토
/review-spec email-verification

4. 기획서 확정
/finalize-spec email-verification

5. 개발 계획 생성
/create-dev-plan email-verification

6. 개발 계획 승인
/approve-dev-plan email-verification

7. 개발 실행 (자동 코드 생성!)
/develop email-verification

8. 테스트 실행
/test email-verification

9. 코드 검토 (수동)
→ .claude/templates/8_review_checklist.md 참고

10. 기술 문서 생성
/create-docs email-verification
```

**예상 소요 시간:**
- 기획 단계 (1-3): 1-2시간
- 계획 단계 (4-5): 30분
- 개발 단계 (6-7): 2-4시간 (자동)
- 검토 단계 (8): 30분-1시간
- 문서화 (9): 30분 (자동)

**총 소요 시간:** 4-8시간 (수동: 20-40시간)

---

## 📂 생성되는 파일 구조

```
goodnak_api/
├── .claude/
│   ├── commands/
│   │   ├── workflow-start.md
│   │   ├── review-spec.md
│   │   ├── finalize-spec.md
│   │   ├── create-dev-plan.md
│   │   ├── approve-dev-plan.md
│   │   ├── develop.md
│   │   ├── test.md
│   │   └── create-docs.md
│   └── templates/
│       ├── 1_spec_template.md
│       ├── 2_spec_review_template.md
│       ├── 3_spec_final_template.md
│       ├── 4_dev_plan_template.md
│       ├── 5_dev_plan_final_template.md
│       ├── 6_implementation_checklist.md
│       ├── 7_test_checklist.md
│       ├── 8_review_checklist.md
│       └── 9_technical_doc_template.md
├── docs/
│   ├── workflow_templates/
│   │   ├── WORKFLOW_GUIDE.md (상세 가이드)
│   │   └── WORKFLOW_README.md (이 문서)
│   └── workflows/
│       └── {feature_name}/
│           ├── 1_{feature}_spec.md
│           ├── 2_{feature}_spec_reviewed.md
│           ├── 3_{feature}_spec_final.md
│           ├── 4_{feature}_dev_plan.md
│           ├── 5_{feature}_dev_plan_final.md
│           ├── 6_{feature}_implementation.md
│           ├── 7_{feature}_test_results.md
│           ├── 8_{feature}_review.md
│           └── 9_{feature}_technical_doc.md
└── app/
    ├── models/{feature}.py
    ├── schemas/{feature}.py
    ├── repositories/{feature}.py
    ├── services/{feature}.py
    └── api/v1/endpoints/{feature}.py
```

---

## 💡 베스트 프랙티스

### 1. 기획 단계에서 충분한 시간 투자
- 1-3단계를 꼼꼼히 하면 개발 단계가 훨씬 수월합니다
- 모호한 부분이 없도록 Claude와 충분히 대화하세요

### 2. 단계를 건너뛰지 마세요
- 각 단계는 다음 단계의 품질을 보장합니다
- 급하더라도 프로세스를 따르세요

### 3. 문서를 버전 관리하세요
```bash
git add docs/workflows/{feature}/
git commit -m "docs: add {feature} workflow documentation"
```

### 4. Claude의 제안을 비판적으로 검토하세요
- AI가 항상 완벽하지는 않습니다
- 의심스러운 부분은 질문하세요

### 5. 테스트를 소홀히 하지 마세요
- 7단계 테스트는 반드시 통과해야 합니다
- 커버리지 80% 이상을 목표로 하세요

---

## 🔧 커스터마이징

### 템플릿 수정
`.claude/templates/` 폴더의 템플릿을 프로젝트에 맞게 수정 가능

### 단계 추가/제거
필요에 따라 워크플로우 조정 가능

### 슬래시 커맨드 수정
`.claude/commands/` 폴더의 커맨드 수정 가능

---

## 🆘 문제 해결

### Q: 워크플로우를 중간에 중단했다가 다시 시작할 수 있나요?
A: 네! 언제든지 원하는 단계부터 다시 시작할 수 있습니다.

### Q: 여러 기능을 동시에 개발하려면?
A: 각 기능마다 별도의 워크플로우를 시작하세요.

**Claude에게 입력:**
```
/workflow-start feature-a
/workflow-start feature-b
```

### Q: 기존 진행중인 기능에 워크플로우를 적용하려면?
A: `/workflow-start {feature}` 실행 후 현재 상태에 맞는 단계부터 진행하세요.

### Q: Claude가 제안한 코드가 마음에 들지 않으면?
A: 언제든지 수정을 요청할 수 있습니다. 구체적으로 어떤 부분을 어떻게 바꾸고 싶은지 알려주세요.

---

## 📚 추가 리소스

- **상세 가이드:** `docs/workflow_templates/WORKFLOW_GUIDE.md`
- **프로젝트 규칙:** `CLAUDE.md`
- **API 문서:** `http://localhost:8000/docs`

---

## 🎊 마치며

이 워크플로우는 Claude Code와 함께 효율적으로 개발하기 위한 프레임워크입니다.

**장점:**
- ✅ 체계적인 개발 프로세스
- ✅ 자동화된 코드 생성
- ✅ 완벽한 문서화
- ✅ 높은 코드 품질
- ✅ 시간 절약 (70-80%)

**시작하세요 (Claude에게 입력):**
```
/workflow-start my-awesome-feature
```

행운을 빕니다! 🚀

---

**버전:** 1.0.0
**마지막 업데이트:** 2025-11-21
**작성자:** Claude Code Team
