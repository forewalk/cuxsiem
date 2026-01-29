# 9단계 개발 워크플로우 가이드

이 문서는 Claude Code를 활용한 체계적인 기능 개발 프로세스를 안내합니다.

## 📋 워크플로우 개요

```
1단계 (사람) → 2단계 (AI) → 3단계 (사람+AI) → 4단계 (AI) → 5단계 (사람)
   ↓              ↓              ↓                ↓              ↓
기획서 작성    기획서 검토    기획서 확정      개발계획 작성   개발계획 확정

   ↓
6단계 (AI) → 7단계 (AI) → 8단계 (사람) → 9단계 (AI)
   ↓              ↓              ↓              ↓
 개발 실행      테스트 실행    개발 검토      문서화
```

## 🚀 빠른 시작

### 새 기능 개발 시작하기

```bash
# 1. 워크플로우 시작 (feature 이름으로 폴더 구조 자동 생성)
/workflow-start {feature_name}

# 예시: 이메일 인증 기능 개발
/workflow-start email-verification
```

이 명령어는 다음을 자동으로 생성합니다:
- `docs/workflows/{feature_name}/` 디렉토리
- 9개의 단계별 문서 파일 (템플릿 기반)

## 📝 단계별 상세 가이드

### 1단계: 기획서 작성 (사람)

**담당:** 개발자/기획자
**문서:** `docs/workflows/{feature}/1_{feature}_spec.md`
**템플릿:** `.claude/templates/1_spec_template.md`

**작업 내용:**
- 기능의 목적과 배경 작성
- 요구사항 정의
- 성공 기준 명시
- 제약사항 및 고려사항 작성

**예시:**
```markdown
# 이메일 인증 기능 기획서

## 1. 목적
사용자 가입 시 이메일 주소의 유효성을 검증하여...

## 2. 요구사항
- 사용자가 가입하면 인증 이메일 발송
- 이메일 링크 클릭 시 인증 완료
...
```

---

### 2단계: 기획서 검토 (AI)

**담당:** Claude
**명령어:** `/review-spec {feature}`
**입력:** `1_{feature}_spec.md`
**출력:** `2_{feature}_spec_reviewed.md`

**Claude가 수행하는 검토:**
- ✅ 요구사항 완전성 검증
- ✅ 모호한 부분 식별 및 질문
- ✅ 기술적 실현 가능성 평가
- ✅ 누락된 시나리오 제안
- ✅ 보안/성능 고려사항 추가

**실행 방법:**
```bash
/review-spec email-verification
```

---

### 3단계: 기획서 확정 (사람 + AI)

**담당:** 개발자 + Claude
**명령어:** `/finalize-spec {feature}`
**입력:** `2_{feature}_spec_reviewed.md` + 사용자 피드백
**출력:** `3_{feature}_spec_final.md`

**작업 내용:**
- Claude의 검토 의견 확인
- 필요한 수정사항 반영
- 최종 기획서 승인

**실행 방법:**
```bash
/finalize-spec email-verification
```

Claude가 대화형으로 질문하며 최종 기획서를 확정합니다.

---

### 4단계: 개발 계획서 작성 (AI)

**담당:** Claude
**명령어:** `/create-dev-plan {feature}`
**입력:** `3_{feature}_spec_final.md`
**출력:** `4_{feature}_dev_plan.md`

**Claude가 생성하는 내용:**
- 📁 파일 구조 설계 (models, schemas, repositories, services, endpoints)
- 🗄️ 데이터베이스 스키마 설계
- 🔄 API 엔드포인트 설계
- 📦 필요한 의존성 패키지
- 🔗 기존 코드와의 통합 방안
- 📋 구현 순서 및 체크리스트

**실행 방법:**
```bash
/create-dev-plan email-verification
```

---

### 5단계: 개발 계획 확정 (사람)

**담당:** 개발자
**명령어:** `/approve-dev-plan {feature}`
**입력:** `4_{feature}_dev_plan.md` + 사용자 피드백
**출력:** `5_{feature}_dev_plan_final.md`

**작업 내용:**
- 개발 계획 검토
- 수정 요청 사항 전달
- 최종 승인

**실행 방법:**
```bash
# 계획서 확인 후
/approve-dev-plan email-verification
```

---

### 6단계: 개발 실행 (AI)

**담당:** Claude
**명령어:** `/develop {feature}`
**입력:** `5_{feature}_dev_plan_final.md`
**출력:** 코드 구현 + `6_{feature}_implementation.md`

**Claude가 수행하는 작업:**
1. ✅ 데이터베이스 모델 생성
2. ✅ Pydantic 스키마 작성
3. ✅ Repository 레이어 구현
4. ✅ Service 레이어 구현
5. ✅ API 엔드포인트 구현
6. ✅ Alembic 마이그레이션 생성
7. ✅ 의존성 업데이트

**실행 방법:**
```bash
/develop email-verification
```

Claude가 체크리스트를 보여주며 단계별로 진행합니다.

---

### 7단계: 테스트 실행 (AI)

**담당:** Claude
**명령어:** `/test {feature}`
**입력:** 구현된 코드
**출력:** `7_{feature}_test_results.md`

**Claude가 수행하는 테스트:**
- 🧪 단위 테스트 작성 및 실행
- 🔗 통합 테스트 작성 및 실행
- 🐛 린트 검사 (flake8, mypy)
- 📊 테스트 커버리지 확인
- ✅ 모든 테스트 통과 확인

**실행 방법:**
```bash
/test email-verification
```

---

### 8단계: 개발 검토 (사람)

**담당:** 개발자
**템플릿:** `.claude/templates/8_review_checklist.md`
**입력:** 구현된 코드 + 테스트 결과
**출력:** `8_{feature}_review.md`

**검토 체크리스트:**
- [ ] 코드 품질 확인
- [ ] 비즈니스 로직 검증
- [ ] 보안 취약점 검토
- [ ] 성능 확인
- [ ] 문서화 적절성 확인

**검토 완료 후:**
```bash
# 수정 필요 시
"6단계로 돌아가서 {수정사항} 반영해줘"

# 승인 시
"검토 완료, 다음 단계 진행"
```

---

### 9단계: 기술 문서 작성 (AI)

**담당:** Claude
**명령어:** `/create-docs {feature}`
**입력:** 전체 구현 코드 + 테스트 결과
**출력:** `9_{feature}_technical_doc.md`

**Claude가 생성하는 문서:**
- 📖 기능 개요
- 🏗️ 아키텍처 설명
- 🔌 API 사용 가이드 (예제 포함)
- 🗄️ 데이터베이스 스키마 문서
- 🚀 배포 가이드
- 🔧 운영 가이드 (모니터링, 트러블슈팅)

**실행 방법:**
```bash
/create-docs email-verification
```

---

## 🎯 실전 예시: 이메일 인증 기능 개발

```bash
# 1단계: 워크플로우 시작
/workflow-start email-verification

# 2단계: 기획서 작성 (사람)
# docs/workflows/email-verification/1_email-verification_spec.md 작성

# 3단계: AI 검토 요청
/review-spec email-verification

# 4단계: 기획서 확정
/finalize-spec email-verification

# 5단계: 개발 계획 생성
/create-dev-plan email-verification

# 6단계: 개발 계획 승인
/approve-dev-plan email-verification

# 7단계: 개발 실행
/develop email-verification

# 8단계: 테스트
/test email-verification

# 9단계: 검토 (사람이 직접 코드 리뷰)

# 10단계: 기술 문서 생성
/create-docs email-verification
```

## 📂 생성되는 파일 구조

```
goodnak_api/
├── .claude/
│   ├── commands/
│   │   ├── workflow-start.md       # 워크플로우 시작
│   │   ├── review-spec.md          # 2단계 커맨드
│   │   ├── finalize-spec.md        # 3단계 커맨드
│   │   ├── create-dev-plan.md      # 4단계 커맨드
│   │   ├── approve-dev-plan.md     # 5단계 커맨드
│   │   ├── develop.md              # 6단계 커맨드
│   │   ├── test.md                 # 7단계 커맨드
│   │   └── create-docs.md          # 9단계 커맨드
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
└── docs/
    └── workflows/
        └── {feature_name}/
            ├── 1_{feature}_spec.md
            ├── 2_{feature}_spec_reviewed.md
            ├── 3_{feature}_spec_final.md
            ├── 4_{feature}_dev_plan.md
            ├── 5_{feature}_dev_plan_final.md
            ├── 6_{feature}_implementation.md
            ├── 7_{feature}_test_results.md
            ├── 8_{feature}_review.md
            └── 9_{feature}_technical_doc.md
```

## 💡 팁 & 베스트 프랙티스

### 1. 기획 단계에서 충분한 시간 투자
- 1-3단계를 꼼꼼히 진행하면 개발 단계에서 재작업 최소화

### 2. 단계별 문서 버전 관리
- Git으로 각 단계별 문서 변경사항 추적
- 브랜치 전략: `feature/{feature-name}`

### 3. 반복적 개선
- 8단계 검토 후 문제 발견 시 해당 단계로 돌아가기
- 완벽을 추구하기보다 점진적 개선

### 4. 문서 재사용
- 유사한 기능 개발 시 이전 문서 참고
- 템플릿 지속적 개선

### 5. Claude와의 효과적인 협업
- 구체적인 피드백 제공
- 한 번에 하나의 단계에 집중
- 불확실한 부분은 질문으로 명확히

## 🔧 커스터마이징

### 템플릿 수정
`.claude/templates/` 폴더의 템플릿을 프로젝트에 맞게 수정 가능

### 워크플로우 단계 추가/제거
필요에 따라 단계 추가하거나 병합 가능

### 슬래시 커맨드 커스터마이징
`.claude/commands/` 폴더의 커맨드 수정 가능

## 📞 문제 해결

**Q: 특정 단계를 건너뛰고 싶어요**
A: 가능하지만 권장하지 않습니다. 각 단계는 다음 단계의 품질을 보장합니다.

**Q: 여러 기능을 동시에 개발하려면?**
A: 각 기능마다 별도의 워크플로우 폴더를 생성하세요.

**Q: 기존 진행중인 기능에 워크플로우를 적용하려면?**
A: `/workflow-start {feature}` 실행 후 현재 상태에 맞는 단계부터 문서 작성

---

**마지막 업데이트:** 2025-11-21
**버전:** 1.0.0
