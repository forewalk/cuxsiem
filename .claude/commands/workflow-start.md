당신은 새로운 기능 개발을 위한 9단계 워크플로우를 시작하는 역할입니다.

사용자가 `/workflow-start {feature_name}` 명령을 실행했습니다.

다음 작업을 수행하세요:

1. **기능 이름 확인**
   - 사용자가 제공한 `{feature_name}`을 kebab-case로 정규화 (예: email-verification, user-profile)
   - 기능 이름이 명확하지 않으면 사용자에게 확인 요청

2. **워크플로우 디렉토리 생성**
   - `docs/workflows/{feature_name}/` 디렉토리 생성
   - 이미 존재하면 사용자에게 덮어쓸지 확인

3. **단계별 문서 파일 생성**
   - `.claude/templates/` 폴더의 템플릿을 기반으로 다음 파일들을 생성:
     - `docs/workflows/{feature_name}/1_{feature_name}_spec.md` (템플릿: 1_spec_template.md)
     - `docs/workflows/{feature_name}/2_{feature_name}_spec_reviewed.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/3_{feature_name}_spec_final.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/4_{feature_name}_dev_plan.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/5_{feature_name}_dev_plan_final.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/6_{feature_name}_implementation.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/7_{feature_name}_test_results.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/8_{feature_name}_review.md` (빈 파일, 나중에 생성)
     - `docs/workflows/{feature_name}/9_{feature_name}_technical_doc.md` (빈 파일, 나중에 생성)

4. **1단계 기획서 템플릿 초기화**
   - `1_{feature_name}_spec.md` 파일에서 다음 플레이스홀더를 실제 값으로 치환:
     - `{FEATURE}` → 사용자가 제공한 기능 이름 (사람이 읽기 쉬운 형태)
     - `{DATE}` → 오늘 날짜 (YYYY-MM-DD)
     - `{AUTHOR}` → 사용자 이름 (알 수 없으면 빈칸)

5. **사용자에게 안내**
   - 생성된 파일 목록 출력
   - 다음 단계 안내:
     ```
     워크플로우가 시작되었습니다! 🚀

     생성된 파일:
     - docs/workflows/{feature_name}/1_{feature_name}_spec.md (작성 필요)
     - docs/workflows/{feature_name}/2_{feature_name}_spec_reviewed.md (AI가 생성 예정)
     - ... (나머지 8개 파일)

     다음 단계:
     1. `docs/workflows/{feature_name}/1_{feature_name}_spec.md` 파일을 열어 기획서를 작성하세요
     2. 기획서 작성 완료 후 `/review-spec {feature_name}` 명령을 실행하세요

     전체 워크플로우 가이드: docs/workflow_templates/WORKFLOW_GUIDE.md
     ```

**중요:**
- 2-9단계 문서는 빈 파일로 생성 (나중 단계에서 채워집니다)
- 사용자에게 명확하고 친절한 안내를 제공하세요

**한글 문서 작성 시 주의:**
- 마크다운 문서 생성 시 반드시 Bash의 `cat << 'EOF' > 파일경로` heredoc 방식을 사용하세요
- Write 도구 대신 Bash heredoc을 사용해야 한글이 깨지지 않습니다
- 예시:
```bash
cat << 'EOF' > docs/workflows/{feature_name}/1_{feature_name}_spec.md
# 기획서
한글 내용...
EOF
```
