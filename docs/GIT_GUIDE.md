# Git 작업 가이드

이 문서는 cruxSIEM 프로젝트의 Git 작업 가이드입니다.

## Git 설정

### 초기 설정

```bash
git config --global user.name "이름"
git config --global user.email "이메일"
```

### 저장소 클론

```bash
git clone http://cruxdata.co.kr:9090/cruxsiem/web.git
cd web
```

---

## 브랜치 전략

```
main          ← 프로덕션 배포 (분기별 버전)
 ↑
develop       ← 개발 통합 (기본 작업 베이스)
 ↑
feature/*     ← 기능 개발 브랜치
hotfix/*      → main (긴급 수정)
```

| 브랜치 | 용도 | 베이스 | 머지 대상 |
|--------|------|--------|-----------|
| `main` | 프로덕션 배포 | - | - |
| `develop` | 개발 통합 | main | main |
| `feature/{기능명}` | 기능 개발 | develop | develop |
| `hotfix/{이슈}` | 긴급 수정 | main | main + develop |

---

## 기능 개발 워크플로우

### 1. 기능 브랜치 생성

```bash
# develop 브랜치 최신화
git checkout develop
git pull origin develop

# feature 브랜치 생성
git checkout -b feature/{기능명}

# 예시
git checkout -b feature/login
git checkout -b feature/log-search
git checkout -b feature/dashboard
```

> 기능명은 kebab-case로 작성합니다.

### 2. 개발 진행 및 커밋

작업 단위로 자주 커밋합니다.

```bash
# 변경사항 확인
git status
git diff

# 파일 단위 스테이징 (권장)
git add backend/app/services/auth.py
git add frontend/src/pages/LoginPage.tsx

# 커밋
git commit -m "feat: 로그인 API 엔드포인트 구현"
```

### 3. 원격에 푸시

```bash
# 최초 푸시 (upstream 설정)
git push -u origin feature/{기능명}

# 이후 푸시
git push
```

### 4. 코드 리뷰 및 검증

기능 개발이 완료되면:

1. GitLab에서 **Merge Request** 생성
   - Source: `feature/{기능명}`
   - Target: `develop`
2. 리뷰어가 코드 검토
3. 테스트 통과 확인

### 5. develop에 머지

**방법 A: Merge Request (권장)**

GitLab 웹에서 MR 승인 후 머지합니다.

**방법 B: 로컬 머지**

```bash
git checkout develop
git pull origin develop
git merge feature/{기능명}
git push origin develop
```

### 6. feature 브랜치 정리

```bash
# 로컬 브랜치 삭제
git branch -d feature/{기능명}

# 원격 브랜치 삭제
git push origin --delete feature/{기능명}
```

---

## 커밋 메시지 컨벤션

```
{타입}: {설명}
```

| 타입 | 용도 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat: 로그 검색 API 구현` |
| `fix` | 버그 수정 | `fix: 토큰 만료 시간 오류 수정` |
| `docs` | 문서 수정 | `docs: API 문서 업데이트` |
| `style` | 코드 포맷팅 | `style: import 정렬` |
| `refactor` | 리팩토링 | `refactor: Repository 레이어 분리` |
| `test` | 테스트 | `test: 인증 서비스 단위 테스트 추가` |
| `chore` | 빌드/설정 | `chore: FastAPI 버전 업데이트` |

상세 커밋 예시:

```bash
git commit -m "feat: 대시보드 위젯 컴포넌트 구현

- WidgetCard MUI 컴포넌트 추가
- DataGrid를 활용한 로그 테이블 구현
- 실시간 업데이트 훅 작성"
```

---

## 9단계 워크플로우와 Git 통합

```bash
# 1. 기능 브랜치 생성
git checkout develop && git pull origin develop
git checkout -b feature/log-search

# 2-5. 기획 및 계획 단계
git add docs/workflows/log-search/
git commit -m "docs: 로그 검색 기획서 및 개발 계획"
git push

# 6. 구현
git add backend/app/services/log_search.py
git commit -m "feat: 로그 검색 서비스 구현"

git add frontend/src/pages/LogSearchPage.tsx
git commit -m "feat: 로그 검색 페이지 UI 구현"

# 7. 테스트
git add tests/
git commit -m "test: 로그 검색 테스트 추가"

# 8-9. 리뷰 및 문서
git add docs/workflows/log-search/9_*
git commit -m "docs: 로그 검색 기술 문서 완료"

# 10. develop 머지 (MR 또는 로컬)
git checkout develop && git pull origin develop
git merge feature/log-search
git push origin develop
```

---

## 자주 사용하는 명령어

### 상태 확인

```bash
git status                      # 현재 상태
git branch                      # 로컬 브랜치 목록
git branch -a                   # 전체 브랜치 목록
git log --oneline -10           # 최근 커밋 10개
```

### 변경사항 관리

```bash
git stash                       # 변경사항 임시 저장
git stash pop                   # 임시 저장 복원
git checkout -- {파일}          # 특정 파일 변경 취소
git reset HEAD {파일}           # 스테이징 취소
```

### 브랜치 관리

```bash
git checkout -b feature/{이름}  # 브랜치 생성 + 이동
git branch -d feature/{이름}    # 로컬 브랜치 삭제
git push origin --delete feature/{이름}  # 원격 브랜치 삭제
git fetch origin                # 원격 정보 갱신
```

---

## 충돌 해결

```bash
# 1. 충돌 파일 확인
git status

# 2. 충돌 파일 수동 편집
#    <<<<<<< HEAD      (현재 브랜치)
#    =======
#    >>>>>>> feature/*  (머지 대상)
#    마커를 제거하고 올바른 내용으로 수정

# 3. 해결 후 커밋
git add {충돌파일}
git commit -m "merge: 충돌 해결"
```

---

## 주의사항

- `main` 브랜치에 직접 커밋하지 않습니다
- `develop`에 직접 커밋은 최소화하고, feature 브랜치를 통해 머지합니다
- 이미 push한 커밋은 `--amend`하지 않습니다
- `--force` push는 사용하지 않습니다
- `.env` 파일은 커밋하지 않습니다

## 참고 문서

- [CLAUDE.md](../CLAUDE.md) / [GEMINI.md](../GEMINI.md) -- 개발 가이드
- [INSTALL.md](./INSTALL.md) -- 환경 설치 가이드
- [DEPLOY.md](./DEPLOY.md) -- 배포 가이드
- [ARCHITECTURE.md](./ARCHITECTURE.md) -- 아키텍처
