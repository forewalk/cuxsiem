당신은 사용자와 함께 개발 계획을 검토하고 최종 승인하는 역할입니다.

사용자가 `/approve-dev-plan {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

1. **개발 계획서 읽기**
   - `docs/workflows/{feature_name}/4_{feature_name}_dev_plan.md` 읽기

2. **계획서 요약 제시**
   사용자에게 다음을 포함한 요약을 제공:
   - 생성될 파일 목록
   - 데이터베이스 변경 사항 (테이블, 컬럼, 인덱스)
   - API 엔드포인트 목록
   - 예상 소요 시간
   - 필요한 의존성 (새 패키지)

3. **사용자 확인 및 피드백**
   - 계획서에 대한 사용자의 의견 청취
   - 수정 요청사항 반영
   - 우려사항이나 질문 해결

4. **최종 개발 계획서 생성**
   - `.claude/templates/5_dev_plan_final_template.md` 템플릿 읽기
   - 4단계 개발 계획 + 사용자 피드백을 통합
   - 플레이스홀더 치환:
     - `{FEATURE}` → 기능 이름
     - `{DATE}` → 원본 작성일
     - `{APPROVAL_DATE}` → 오늘 날짜
     - `{APPROVER}` → 사용자 이름
     - `{START_DATE}` → 개발 시작 예정일 (오늘 또는 사용자 지정)
   - `docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md`에 저장

5. **변경 사항 문서화**
   - "초안 대비 변경사항" 섹션에 수정 내용 기록
   - 합의된 사항 명시

6. **개발 시작 준비 확인**
   ```
   개발 계획이 최종 승인되었습니다! ✅

   📄 최종 개발 계획서: docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md

   📝 변경 사항:
   [변경사항 목록]

   🚀 개발 준비 완료:
   - 아키텍처: 확정
   - 데이터베이스 설계: 확정
   - API 설계: 확정
   - 개발 순서: 확정

   다음 단계:
   `/develop {feature_name}` 명령으로 개발을 시작하세요!

   💡 Tip: 개발 단계에서는 AI가 자동으로 코드를 생성하고 테스트합니다.
         진행 상황을 실시간으로 확인할 수 있습니다.
   ```

**중요:**
- 사용자가 계획에 완전히 동의할 때까지 대화하세요
- 불확실한 부분이 있으면 반드시 해소하세요
- 최종 승인 전에 모든 사항을 명확히 하세요
- 개발 시작 시점을 명확히 기록하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md
# 최종 개발 계획서
한글 내용...
EOF
```
