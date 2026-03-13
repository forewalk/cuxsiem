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
- [x] OTP 2FA (TOTP 기반, 백업 코드 지원)
- [x] 세션 관리 (만료 시간, 다중 세션 제어)
- [x] 고급 설정 (로그스트리밍 크기/주기, 세션 시간, OTP 강제 등록 등)

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

### Rules 엔진 (알림/액션/룰 통합 설계)
> 알림(Notification) · 액션(Action) · 룰(Rule)은 "탐지 → 웹훅/통보" 흐름이 유사하나 목적이 다름.
> 단일 엔진으로 병합할지 분리할지 아키텍처 결정 필요.
- [ ] 룰 엔진 아키텍처 설계 (분리 vs 병합 결정)
  - [ ] Rule: 탐지 조건 정의 (필드 매칭, 임계값, 시간 윈도우)
  - [ ] Action: 탐지 시 수행 동작 (웹훅, 이메일, 스크립트 실행 등)
  - [ ] Notification: 사용자 알림 채널 (화면, 이메일, 슬랙 등)
- [x] 웹훅 연동
- [x] 화면 하단 알림 (관리자 권한 체크)
- [x] 알림 시나리오 구성

## Phase 4: 연동 및 부가 기능

### 결제 기능
- [ ] 결제 합의 통보 알림
- [ ] 인사 시스템 연동 방식 결정 및 구현

### 개인화 (Personalization)
- [ ] 개인화 설정 (대시보드 위치/크기, 구조 레이아웃, 이름 등)

### UI/UX 테마
- [x] 다크 모드 (Dark Mode)
- [x] 라이트 모드 (Light Mode)
- [x] 픽셀 모드 (Pixel Mode) - [고급 설정]에서 활성화 가능한 레트로/너드 스타일 테마
  - [x] 픽셀 아트 스타일 폰트 적용 (DotGothic16 — 경량화로 Press Start 2P 제외)
  - [x] MUI 전역 테마 오버라이드 (border-radius: 0, box-shadow 활용)
  - [ ] 도트 그래픽 UI 컴포넌트 및 차트 커스텀 렌더링
  - [x] 픽셀 아트 애니메이션 효과 (마우스 트레일러, CRT Scanline, 마르키 전광판)

### 솔루션 라이선스 관리
- [ ] 라이선스 관리 아키텍처 설계
  - [ ] Elasticsearch 스타일의 JSON 라이선스 파일 규격 정의
  - [ ] Epoch 타임스탬프 기반 발급/시작/만료일 검증 로직
- [ ] 라이선스 유효성 체크 및 제어
  - [ ] 시스템 부팅 시 및 주기적 라이선스 상태 검사 (Background task)
  - [ ] 라이선스 만료 임박 알림 (D-30부터 하루 1회, 화면 하단 알림 채널 활용)
  - [ ] 라이선스 만료 시 로그인 제한 및 경고 메시지 노출 (Auth Middleware 연동)
  - [ ] 기기 식별 또는 노드 수 제한 검토 (`max_nodes`)
- [ ] 라이선스 관리 UI (고급 설정)
  - [ ] 현재 라이선스 정보 조회 (발급 대상, 만료일, 상태)
  - [ ] 신규 라이선스 파일 업로드 기능

### 서비스 모니터링 (Heartbeat)
> Elastic Heartbeat 기반으로 HTTP/TCP 상태 체크 및 인증서 만료 모니터링.
> 자체 프로세스 헬스 체크와 외부 서비스 체크를 통합 관리.
- [ ] Heartbeat 에이전트 연동 및 OpenSearch 수집 파이프라인 구성
- [ ] HTTP/TCP 업타임 체크 (외부 서비스 체크 리스트 관리 UI)
- [ ] SSL/TLS 인증서 만료 기한 모니터링 및 임박 알림
- [ ] 자체 프로세스 헬스 체크 (백엔드, OpenSearch, Kafka, Vector)
- [ ] 모니터링 결과 대시보드 위젯 연동

### 배포 및 자동화 (데모 및 운영 준비)
- [ ] 인프라 구성 자동화 (.ini 설정 기반)
  - [ ] Kafka Topic 구조 생성 자동화
  - [ ] Vector 설치 및 파이프라인 구성 자동화
  - [ ] OpenSearch 설치 및 클러스터 구성 자동화
- [ ] OpenSearch 초기 설정 자동화
  - [ ] 시스템 인덱스(`cs_*`) 스키마 및 매핑 정의
  - [ ] 인덱스 템플릿(`_index_template`) 및 SLM(Snapshot Lifecycle Management) 정책 생성
  - [ ] 기본 데이터(사용자, 코드, 설정 등) 인입
- [ ] 통합 설치 쉘 스크립트 구축 (`./scripts/setup.sh`)
  - [ ] 환경 검증 및 헬스 체크
  - [ ] One-command 데모 환경 배포
- [ ] 배포 시 브랜딩 커스터마이징
  - [ ] 사이트별 파비콘/앱 아이콘 교체 자동화
  - [ ] 로그인 화면 메인 이미지/로고 교체 자동화
  - [ ] 배포 패키지에서 기본 에셋 분리 구조 설계

## Phase 5: 품질 강화

### 보안 침입 테스트 (Penetration Testing)
> OWASP Top 10 기준으로 취약점 점검. 배포 전 필수 완료.
- [ ] OWASP Top 10 항목별 취약점 검토 및 수정
  - [ ] A01 Broken Access Control — URL 직접 접근 방지, 라우팅 가드 강화
  - [ ] A02 Cryptographic Failures — 환경변수 로그 노출 여부 확인, 민감 데이터 암호화 검토
  - [ ] A03 Injection — 백엔드 입력 데이터 재검증 (프론트 메시지 변조 대비)
  - [ ] A05 Security Misconfiguration — 배포/개발 환경별 콘솔 메시지 및 디버그 정보 조정
  - [ ] A07 Identification & Authentication — OTP 재사용 방지 (Replay attack), Rate limiting
- [ ] OpenSearch 문서 수준 접근 제어 (Row-Level Security 개념) 검토
- [ ] 환경변수 로그 노출 방지 (`backend/.env` 민감 키 마스킹 확인)
- [ ] 배포 환경 콘솔 로그 레벨 분리 (개발: DEBUG, 운영: WARNING 이상)

### 고가용성 / 다중화 (HA)
> 스케줄러 등 단일 실행 보장이 필요한 모듈에 대한 다중화 전략 수립.
- [ ] 다중화 아키텍처 방법론 설계 문서 작성
  - [ ] 스케줄러 모듈 Active-Standby (A-S) 방식 리더 선출 메커니즘 설계
  - [ ] 분산 환경 락 구현 방안 검토 (OpenSearch 분산 락 or Redis)
  - [ ] 다중 인스턴스 시 중복 실행 방지 로직 정의
  - [ ] 배치/스케줄링: 현행 BackgroundTask/APScheduler → 다중 인스턴스 환경 대응 검토
  - [ ] Celery + Redis(Broker) 또는 ARQ 등 태스크 큐 도입 검토
- [ ] 애플리케이션 서버 이중화
  - [ ] FastAPI (Uvicorn) 다중 인스턴스 + Nginx 로드 밸런서
  - [ ] 인메모리 상태 제거 — 세션/캐시를 외부 스토어로 이관
- [ ] 데이터 레이어 이중화
  - [ ] OpenSearch 클러스터 다중 노드 구성 (Master 3+, Data 2+)
  - [ ] Kafka 클러스터 이중화 (Broker 3+, Replication Factor 설정)
- [ ] 모니터링 및 장애 감지
  - [ ] 각 컴포넌트 헬스체크 엔드포인트 통합 (`/health`, `/readiness`)
  - [ ] 장애 시 자동 알림 (웹훅/이메일) 연동
- [ ] 다중화 환경 테스트 시나리오 작성

### 버그픽스 및 안정화
- [ ] OTP: Replay attack 방지 (사용된 코드 캐시 처리)
- [ ] OTP: 로그인 후 토큰에 `otp_verified` 클레임 추가
- [ ] OTP: Rate limiting (검증 엔드포인트)
- [ ] 기타 버그 수집 및 수정

---

## 디자인 리소스

| 파일 | 내용 |
|------|------|
| `docs/figma/login/login.svg` | 로그인 화면 디자인 |
| `docs/figma/resolver/attackline.svg` | 어택라인 디자인 |
| `docs/figma/resolver/precesstree.svg` | 프로세스 트리 디자인 |
| `docs/figma/fixelmode/pixel_mode(1).jpg` | 픽셀 모드 대시보드 시안 1 |
| `docs/figma/fixelmode/pixel_mode(2).jpg` | 픽셀 모드 대시보드 시안 2 |
