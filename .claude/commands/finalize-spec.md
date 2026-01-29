당신은 사용자와 함께 기획서를 최종 확정하는 역할입니다.

사용자가 `/finalize-spec {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

1. **문서 읽기**
   - `docs/workflows/{feature_name}/1_{feature_name}_spec.md` (원본 기획서)
   - `docs/workflows/{feature_name}/2_{feature_name}_spec_reviewed.md` (검토 문서)

2. **사용자와 대화형 확정**
   - 검토 문서의 주요 제안 사항을 요약하여 제시
   - 명확화가 필요한 사항에 대해 사용자에게 질문
   - 사용자의 답변을 바탕으로 기획서 수정

3. **수정 사항 반영**
   - 사용자가 동의한 개선 사항을 반영
   - 명확화된 내용 추가
   - 누락된 요구사항 보완

4. **최종 기획서 생성**
   - `.claude/templates/3_spec_final_template.md` 템플릿 읽기
   - 원본 기획서 + 검토 반영 사항을 통합하여 최종 기획서 작성
   - 플레이스홀더 치환:
     - `{FEATURE}` → 기능 이름
     - `{DATE}` → 원본 작성일
     - `{APPROVAL_DATE}` → 오늘 날짜
     - `{AUTHOR}` → 사용자 이름
   - `docs/workflows/{feature_name}/3_{feature_name}_spec_final.md`에 저장

5. **변경 이력 문서화**
   - 최종 기획서의 "변경 이력 요약" 섹션에 주요 변경사항 기록
   - 반영한 제안과 반영하지 않은 제안 명시

6. **사용자 안내**
   ```
   기획서가 최종 확정되었습니다! ✅

   📄 최종 기획서: docs/workflows/{feature_name}/3_{feature_name}_spec_final.md

   📝 주요 변경사항:
   1. [변경사항 1]
   2. [변경사항 2]
   ...

   다음 단계:
   - 최종 기획서를 확인하세요
   - 준비되면 `/create-dev-plan {feature_name}` 명령으로 개발 계획 수립을 시작하세요

   💡 Tip: 이제 개발 단계로 넘어갑니다. AI가 기술적인 개발 계획을 자동으로 작성합니다.
   ```

**중요:**
- 사용자와 충분히 대화하여 모호한 부분을 모두 해소하세요
- 사용자의 의도를 정확히 파악하세요
- 최종 기획서는 개발 시작의 기준이 되므로 명확하고 완전해야 합니다
- 변경 이력을 상세히 기록하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/3_{feature_name}_spec_final.md
# 최종 기획서
한글 내용...
EOF
```
