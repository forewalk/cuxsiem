# ROADMAP

기능 개발 로드맵. 완료된 항목은 `[x]`로 표시.

---

## Phase 1: 기반 구축

- [x] 백엔드 기본 구조 (FastAPI + opensearch-py)
- [x] 프론트엔드 기본 구조 (React + TypeScript + Vite + MUI)
- [x] OpenSearch 개발서버 연동
- [x] 프로젝트 문서 정비 (INSTALL, GIT_GUIDE, DEPLOY, ARCHITECTURE)
- [x] 로그인/인증 기능
- [ ] 스토리북 (Storybook) - UI 컴포넌트 개발 및 문서화

## Phase 2: 핵심 기능

### 사용자 관리
- [x] 사용자 CRUD
- [x] 권한 관리 (인덱스 이름 화이트리스트)
- [x] 메뉴별 권한 제어
- [x] 패스워드 정책 관리

### 디스커버 (로그 검색)
- [ ] 타임라인 뷰
- [x] 실시간 로그 스트리밍
- [ ] 검색 쿼리 빌더

### 대시보드
- [x] 대시보드 레이아웃 구성
- [x] 위젯 오브젝트 협의 및 구현
- [ ] 대시보드 저장/공유

## Phase 3: 보안 분석

### Process Tree
- [ ] 어택라인 (Attack Line) 뷰
- [ ] 타임라인 뷰
- [ ] 프로세스 계층 시각화

### SIEM 위험도 스코어
- [ ] 스코어링 시나리오 구성
- [ ] 위험도 대시보드

### 알림 기능
- [ ] 웹훅 연동
- [ ] 화면 하단 알림 (관리자 권한 체크)
- [ ] 알림 시나리오 구성

## Phase 4: 연동 및 부가 기능

### 결제 기능
- [ ] 결제 합의 통보 알림
- [ ] 인사 시스템 연동 방식 결정 및 구현

### 개인화 (Personalization)
- [ ] 개인화 설정 (대시보드 위치/크기, 구조 레이아웃, 이름 등)

### UI/UX 테마
- [x] 다크 모드 (Dark Mode)
- [x] 라이트 모드 (Light Mode)
- [ ] 픽셀 모드 (Pixel Mode) - 레트로/너드 스타일 테마
  - [ ] 픽셀 아트 스타일 폰트 적용 (8bit/16bit 폰트)
  - [ ] 도트 그래픽 UI 컴포넌트 (버튼, 아이콘, 테이블)
  - [ ] 픽셀 아트 데이터 시각화 (그래프, 차트)
  - [ ] 레트로 게임 스타일 색상 팔레트 (CRT, VGA, Commodore 64 등)
  - [ ] 픽셀 아트 애니메이션 효과 (로딩, 트랜지션)

### 배포 및 자동화
- [ ] 초기 설정 자동화 스크립트/쉘
  - [ ] OpenSearch 설치 자동화
  - [ ] 기본 인덱스 생성 (cs_users, cs_sessions, cs_login_attempts, cs_dashboards, cs_alerts, cs_code 등)
  - [ ] 기본 관리자 계정 생성 (administrator)
  - [ ] 초기 설정값 적용 (패스워드 정책, 고급 설정 등)
  - [ ] 헬스 체크 및 검증 스크립트
  - [ ] One-command 배포 스크립트 (./scripts/init.sh)

---

## 디자인 리소스

| 파일 | 내용 |
|------|------|
| `docs/figma/login/login.svg` | 로그인 화면 디자인 |
| `docs/figma/resolver/attackline.svg` | 어택라인 디자인 |
| `docs/figma/resolver/precesstree.svg` | 프로세스 트리 디자인 |
| `docs/figma/resolver/processtree_exp.png` | 프로세스 트리 예시 1 |
| `docs/figma/resolver/processtree_exp2.png` | 프로세스 트리 예시 2 |
