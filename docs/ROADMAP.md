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
- [ ] 픽셀 모드 (Pixel Mode) - [고급 설정]에서 활성화 가능한 레트로/너드 스타일 테마
  - [ ] 픽셀 아트 스타일 폰트 적용 (Press Start 2P, DotGothic16)
  - [ ] MUI 전역 테마 오버라이드 (Border-image, box-shadow 활용)
  - [ ] 도트 그래픽 UI 컴포넌트 및 차트 커스텀 렌더링
  - [ ] 픽셀 아트 애니메이션 효과 (로딩, 트랜지션)

### 솔루션 라이선스 관리
- [ ] 라이선스 관리 아키텍처 설계
  - [ ] Elasticsearch 스타일의 JSON 라이선스 파일 규격 정의
  - [ ] Epoch 타임스탬프 기반 발급/시작/만료일 검증 로직
- [ ] 라이선스 유효성 체크 및 제어
  - [ ] 시스템 부팅 시 및 주기적 라이선스 상태 검사 (Background task)
  - [ ] 라이선스 만료 시 로그인 제한 및 경고 메시지 노출 (Auth Middleware 연동)
  - [ ] 기기 식별 또는 노드 수 제한 검토 (`max_nodes`)
- [ ] 라이선스 관리 UI (고급 설정)
  - [ ] 현재 라이선스 정보 조회 (발급 대상, 만료일, 상태)
  - [ ] 신규 라이선스 파일 업로드 기능

### 배포 및 자동화 (데모 및 운영 준비)
- [ ] 인프라 구성 자동화 (.ini 설정 기반)
  - [ ] Kafka Topic 구조 생성 자동화
  - [ ] Vector 설치 및 파이프라인 구성 자동화
  - [ ] OpenSearch 설치 및 클러스터 구성 자동화
- [ ] OpenSearch 초기 설정 자동화
  - [ ] 시스템 인덱스(`cs_*`) 스키마 및 매핑 정의
  - [ ] 인덱스 템플릿(`_index_template`) 및 SLM(Snapshot Lifecycle Management) 정책 생성
  - [ ] 기본 데이터(사용자, 코드, 설정 등) 인입
- [ ] 통합 설치 쉘 스크립트 구축 (./scripts/setup.sh)
  - [ ] 환경 검증 및 헬스 체크
  - [ ] One-command 데모 환경 배포

### 개인화 (Personalization)
- [ ] 개인화 설정 (대시보드 위치/크기, 구조 레이아웃, 이름 등)

---

## 디자인 리소스

| 파일 | 내용 |
|------|------|
| `docs/figma/login/login.svg` | 로그인 화면 디자인 |
| `docs/figma/resolver/attackline.svg` | 어택라인 디자인 |
| `docs/figma/resolver/precesstree.svg` | 프로세스 트리 디자인 |
| `docs/figma/fixelmode/pixel_mode(1).jpg` | 픽셀 모드 대시보드 시안 1 |
| `docs/figma/fixelmode/pixel_mode(2).jpg` | 픽셀 모드 대시보드 시안 2 |
