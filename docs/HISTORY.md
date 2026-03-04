# HISTORY.md

## 작성 규칙

> **반드시 아래 형식을 따를 것. 서술형 문장 금지.**
>
> - 한 줄로 간결하게 작성
> - `[날짜 시간] [작업자] [작업 유형] 내용` 형식
> - 날짜 형식: `YYYY-MM-DD HH:MM`
> - 작업 유형: `추가`, `수정`, `삭제`, `수리`, `리팩터`, `설정`, `배포`
> - 예시: `2026-01-29 14:30 홍길동 추가 사용자 인증 API 엔드포인트`
> - **하지 말 것:** "사용자 인증 기능을 구현하였습니다" 같은 서술형
>
> ### 필수: 원격 Git Push 이력 기록
>
> **원격 Git에 Push할 때 반드시 이 파일에 이력을 남길 것.**
> - 작업 유형: `배포`
> - 내용에 브랜치명 명시 (예: `origin/develop push`, `origin/main push`)
> - Push 직전에 이 파일에 기록을 추가한 후 함께 커밋하여 Push
> - 예시: `2026-01-29 21:42 김장훈 배포 origin/develop push (ROADMAP, CLAUDE.md/GEMINI.md 동기화)`

---

## 작업 이력

| 날짜 | 작업자 | 유형 | 내용 |
|------|--------|------|------|
| 2026-03-04 14:55 | 김장훈 | 배포 | origin/develop, origin/feature/admin push (로그 스트리밍 수동 검색 및 OTP 테스트 우회 코드 추가) |
| 2026-03-03 16:20 | 최지호 | 배포 | origin/develop push (feature/dashboard 병합) |
| 2026-03-03 16:12 | 최지호 | 수정 | origin/feature/dashboard push (타임피커/필터 공유 설정, 리스트 그래프 x축 잘림 현상 수정) |
| 2026-03-03 | 박지은 | 수리 | 알림 내역 role 필터 쿼리 오류 수정 (receiver.values → receiver.values.keyword) |
| 2026-03-03 | 박지은 | 수리 | 알림 수신자 역할 old 값(admin 등) 정리: 규칙 편집 시 자동 제거, migrate_roles 쿼리 수정 |
| 2026-03-01 | 김장훈 | 배포 | origin/develop push (OTP 2FA 구현, OTP i18n+UI, OTP 강제 등록, admin 탭 권한 체크) |
| 2026-02-28 03:00 | 김장훈 | 배포 | origin/develop push (테스트 시나리오 추가, cs_policies 통합, login_attempt account 필드, OTP 2FA 워크플로우 시작) |
| 2026-02-28 03:00 | 김장훈 | 배포 | origin/develop push (ROADMAP.md 완료 항목 업데이트, develop↔origin/develop 동기화) |
| 2026-02-28 03:00 | 김장훈 | 배포 | origin/main push (TDD 환경 구성 포함, develop 동기화) |
| 2026-02-28 00:10 | 김장훈 | 배포 | origin/develop push (TDD 환경 구성: vitest, pytest 설정, 테스트 파일 정리) |
| 2026-02-27 23:50 | 김장훈 | 배포 | origin/main push (develop 병합: 픽셀 모드 구현, CRT scanline, 마우스 트레일러, 마르키 전광판, 로그 스트리밍 UX 개선) |
| 2026-02-27 23:30 | 김장훈 | 배포 | origin/develop push (feature/pixel 병합: 픽셀 모드 구현, CRT scanline, 마우스 트레일러, 마르키 전광판, 로그 스트리밍 UX 개선) |
| 2026-02-27 22:00 | 김장훈 | 배포 | origin/develop push (CLAUDE.md/GEMINI.md 진입점 개선, 관리 설정 탭 div 위치 통일, html2canvas/jspdf 패키지 추가) |
| 2026-02-27 21:05 | 박재현 | 배포 | origin/develop push (feature/admin 병합: 사용자 다중 접속 제한 및 로그인 페이지 엔터 키 지원 개선) |
| 2026-02-27 19:40 | 김장훈 | 배포 | origin/develop push (frontend 빌드 오류 및 TypeScript 에러 수정, 누락된 로고 복구) |
| 2026-02-27 19:35 | 김장훈 | 수리 | frontend 빌드 오류 수정: package-lock.json 불일치 해결을 위해 Dockerfile의 npm ci를 npm install로 변경 |
| 2026-02-27 19:25 | 김장훈 | 배포 | origin/develop push (ROADMAP 업데이트, Pixel Mode/License 기획서 추가, 로그인 UI 개선, SVG 파비콘 적용, 리소스 제한 설정) |
| 2026-02-27 17:13 | 박재현 | 추가 | origin/feature/admin push 사용자 다중 접속 제한 실시간 강제 로그아웃 구현 및 로그인 페이지 엔터 키 입력 지원 개선 |
| 2026-02-27 16:55 | 최지호 | 배포 | origin/develop push (feature/dashboard 병합: 대시보드 다운로드 기능 구현) |
| 2026-02-27 16:20 | 박지은 | 배포 | origin/develop push (feature/alerts 병합: 알림 규칙 템플릿 시스템 개선) |
| 2026-02-27 16:10 | 박지은 | 수정 | 알림 규칙 템플릿 시스템 개선: 중첩 필드 자동 추출({{threatInfo.threatId}}) 및 다중 문서 일괄 처리(size>1) 구현 |
| 2026-02-27 14:55 | 최지호 | 배포 | origin/develop push (feature/dashboard 병합) |
| 2026-02-27 14:50 | 최지호 | 수정 | origin/feature/dashboard push (차트 변경 기능 수정) |
| 2026-02-27 14:00 | 박재현 | 추가 | origin/feature/admin push 고급 설정(페이지네이션, 시간 필터) 전역 연동 및 탭별 URL 파라미터 독립화, 새로고침 시 초기화 로직 구현 |
| 2026-02-26 18:01 | 김장훈 | 배포 | origin/develop push (Docker 빌드 TypeScript 컴파일 에러 수정: MUI v7 호환성, LogEntry _source 타입 추가, 미사용 임포트 제거) |
| 2026-02-26 17:30 | 김장훈 | 배포 | origin/develop push (ROADMAP 초기 설정 자동화 항목 추가, HISTORY 작업자 정정, 프론트엔드 패키지 설치) |
| 2026-02-26 17:00 | 김장훈 | 배포 | origin/develop push (백엔드 테스트 수정: 인증 스키마 username 변경, Pydantic V2 마이그레이션, 비동기 테스트 데코레이터 추가) |
| 2026-02-26 16:30 | 김장훈 | 배포 | origin/develop push (프로젝트 구조 재정비: docs/sh→scripts, HISTORY/ROADMAP→docs, 픽셀모드 로드맵 추가) |
| 2026-02-26 15:40 | 박상현 | 배포 | origin/develop push (LogStreaming 리팩토링 및 인덱스 멀티 선택 고도화) |
| 2026-02-26 15:40 | 박재현 | 추가 | origin/feature/admin push 고급 설정 내 사용자 역할명 관리 기능 구현 (cs_code 인덱스 연동), 사용자 관리 페이지와 역할명 동적 연동, 로그인 페이지 신청 버튼 동적 제어 로직 적용 |
| 2026-02-26 15:27 | 최지호 | 배포 | origin/develop push (feature/dashboard 병합) |
| 2026-02-26 15:25 | 최지호 | 수정 | origin/feature/dashboard push (대시보드 쿼리 수정 버그 픽스) |
| 2026-02-26 15:06 | 박재현 | 추가 | origin/feature/admin push 고급 설정 내 동적 탭 개수 제한 기능 및 탭 드래그 앤 드롭 순서 변경 기능 구현, 전역 미니멀 스크롤바 디자인 적용 |
| 2026-02-26 15:05 | 박상현 | 배포 | origin/develop push (feature/logs 병합: 로그 스트리밍 강화 완료) |
| 2026-02-26 15:00 | 박상현 | 배포 | origin/feature/logs push (로그 스트리밍 필드 선택 및 검색 고도화 구현 완료) |
| 2026-02-26 14:55 | 박상현 | 수정 | 로그 검색창 입력 시 실시간 필터링 방지 및 엔터 키 입력 시에만 검색이 적용되도록 개선 |
| 2026-02-26 14:45 | 박상현 | 수정 | 로그 검색창과 필터 칩 분리 및 OpenSearch Lucene 쿼리 문법(AND/OR/NOT) 지원 고도화 |
| 2026-02-26 14:35 | 박상현 | 수리 | 로그 스트리밍 화면의 ReferenceError(searchQuery is not defined) 해결 및 린트 오류 최적화 |
| 2026-02-26 14:25 | 박상현 | 수정 | 로그 스트리밍 테이블 TIMESTAMP 헤더(날짜)와 행 데이터(시간) 표시 형식 분리 및 너비 최적화 |
| 2026-02-26 14:15 | 박상현 | 추가 | 로그 스트리밍 필드 동적 선택 기능 및 상세 패널 전용 아이콘을 통한 필터링 구현 |
| 2026-02-26 13:13 | 최지호 | 배포 | origin/develop push (feature/dashboard 병합) |
| 2026-02-26 13:10 | 최지호 | 수정 | origin/feature/dashboard push (버그 수정) |
| 2026-02-25 17:35 | 박상현 | 수정 | 실시간 스트리밍 활성화 시 검색 필터 즉시 적용 및 이중 필터링 시스템 구축 |
| 2026-02-25 17:25 | 박상현 | 수정 | 로그 스트리밍 모든 필드(값) 대상 검색 기능 구현 (백엔드 * 검색 및 프론트 정밀 필터링) |
| 2026-02-25 17:15 | 박상현 | 수정 | 로그 스트리밍 헤더 시간 표시 포맷 개선 (초 단위 추가) |
| 2026-02-25 17:10 | 박상현 | 수정 | 시간 설정 절대 시간 선택 시 초 단위 지원 및 00초 초기화 고정 |
| 2026-02-25 16:55 | 박상현 | 수정 | 실시간 스트리밍 활성화 시 시간 범위 고정(15분) 및 시간 설정 UI 성능 최적화 |
| 2026-02-25 16:45 | 박상현 | 수정 | 로그 스트리밍 전용 컨트롤바 새로고침 버튼 제거 (자동 갱신 로직 활용) |
| 2026-02-25 16:40 | 박상현 | 수정 | 로그 스트리밍 전용 컨트롤바 구현 및 외부 ControlBar 의존성 제거 |
| 2026-02-25 16:25 | 박상현 | 수정 | 로그 스트리밍 시간 설정 위치 변경 및 스트리밍 상태 연동 (일시정지 시에만 활성화) |
| 2026-02-25 16:05 | 박상현 | 수정 | 로그 리스트 행 클릭 기능 제거 및 상세 보기 버튼 전용화 (커서 스타일 개선) |
| 2026-02-25 15:50 | 박상현 | 수정 | 로그 상세 정보 패널 리사이징 UI 개선 (수직 바 형태의 전역 리사이저 도입) |
| 2026-02-25 15:40 | 박상현 | 추가 | 로그 상세 정보 패널 열 너비 마우스 리사이징 기능 구현 |
| 2026-02-25 15:25 | 박상현 | 수정 | 로그 상세 정보 패널 검색 성능 최적화 (useDeferredValue 및 컴포넌트 분리) |
| 2026-02-25 15:10 | 박상현 | 수정 | 로그 상세 정보 패널 보완 (JSON 뷰 -> 필드별 테이블 뷰 교체 및 필드 검색 기능 추가) |
| 2026-02-25 14:55 | 박상현 | 수정 | 로그 스트리밍 자동 스크롤 버튼 제거 및 'Go to Bottom' 부동 버튼 구현 |
| 2026-02-25 14:45 | 박상현 | 수정 | 로그 스트리밍 제어 버튼 UI 개선 (자동 스트리밍/자동 스크롤 버튼 분리 및 시인성 강화) |
| 2026-02-25 14:35 | 박상현 | 수정 | 로그 스트리밍 문서 최신화 및 메시지 표시 제한 확장(5줄) |
| 2026-02-25 14:35 | 박상현 | 추가 | 로그 스트리밍 백엔드 API 테스트 코드 (`test_logs.py`) |
| 2026-02-25 09:07 | 최지호 | 수정 | origin/feature/dashboard push (그래프 색상 원복) |
| 2026-02-25 08:20 | 최지호 | 수정 | origin/feature/dashboard push (대시보드 피드백 반영) |
| 2026-02-24 14:18 | 최지호 | 수정 | origin/feature/dashboard push (agent 화면 생성, 대시보드 편집 구현) |
| 2026-02-24 13:30 | 박지은 | 추가 | 알림 규칙/내역 개선 (탐지 조건 검증, 정렬/필터링, 에이전트 컬럼, WebSocket 자동 새로고침, UI 레이아웃) |
| 2026-02-23 18:55 | 박상현 | 수정 | '전체 로그'(*) 조회 기능 구현 및 백엔드 타임스탬프 필드 호환성 개선 |
| 2026-02-23 18:35 | 박상현 | 수정 | 로그 스트리밍 테이블 세로 길이 확장 및 내부 스크롤 최적화 |
| 2026-02-23 18:20 | 박상현 | 수정 | 로그 스트리밍 UI 레이아웃 최적화 (너비 고정 및 메시지 5줄 제한) |
| 2026-02-23 16:35 | 박상현 | 수정 | 타임스탬프 필드(@timestamp/timestamp) 자동 감지 및 시간 필터 연동 |
| 2026-02-23 16:15 | 박상현 | 추가 | 로그 스트리밍 인덱스 동적 조회 및 선택 기능 구현 |
| 2026-02-23 16:05 | 박지은 | 수리 | frontend/src/pages/admin/alerts/tabs/NotificationHistoryTab.tsx 충돌 마커 제거 및 오류 수정 |
| 2026-02-23 15:15 | 박상현 | 수정 | 로그 스트리밍 필터 연동 (검색어 쿼리 및 ControlBar 연동) |
| 2026-02-23 12:15 | 박지은 | 수정 | 알림 중복 제거 기본 전략 변경: {{rule_id}} → {{rule_id}}_{{_id}} (이벤트 ID 기반) |
| 2026-02-23 11:45 | 박지은 | 수리 | frontend/src/hooks/useWebSocket.ts 문법 오류 수정 (try 문 오타 해결) |
| 2026-02-23 11:30 | 박지은 | 수정 | WebSocket 보안 강화: JWT 토큰 전송 방식을 쿼리 파라미터에서 Sec-WebSocket-Protocol 헤더로 변경 |
| 2026-02-23 11:15 | 박지은 | 수정 | 알림 중복 탐지 방지 로직 구현: dedup_key에서 시간 의존성 제거 및 저장 전 중복 체크 추가 |
| 2026-02-20 14:30 | 박지은 | 수정 | 알림 필터 기본값 변경 (15분 → 전체) 및 코드 정리 (불필요한 로그/주석 제거) |
| 2026-02-20 11:00 | 박지은 | 추가 | WebSocket 기반 실시간 알림 시스템 구현 (폴링 방식 제거) |
| 2026-02-20 11:00 | 박지은 | 추가 | 다중 Snackbar 동시 표시 기능 구현 (최대 5개 스택 표시) |
| 2026-02-20 11:00 | 박지은 | 추가 | 백엔드 WebSocket 엔드포인트 및 ConnectionManager 클래스 구현 |
| 2026-02-20 11:00 | 박지은 | 추가 | 프론트엔드 useWebSocket 커스텀 훅 구현 (자동 재연결, Ping/Pong) |
| 2026-02-20 11:00 | 박지은 | 리팩터 | GlobalAlertSnackbar 컴포넌트 분리 및 다중 렌더링 지원 |
| 2026-02-20 11:00 | 박지은 | 추가 | 알림 내역 테이블에 "알림 내용" 컬럼 추가 (message_template 첫 줄 표시) |
| 2026-02-20 11:00 | 박지은 | 수리 | WebSocket 무한 재연결 루프 수정 (콜백 ref 패턴 적용) |
| 2026-02-20 11:00 | 박지은 | 수리 | Snackbar severity 색상 매핑 오류 수정 (MUI 표준 값 우선 처리) |
| 2026-02-19 17:05 | 최지호 | 배포 | origin/develop push (dashboard, alerts 병합) |
| 2026-02-19 15:50 | 최지호 | 수정 | origin/feature/dashboard push (리스트/대시보드 분리 구현) |
| 2026-02-14 20:45 | 김장훈 | 배포 | origin/develop push (dashboard, admin, logs, approval 통합 및 빌드 오류 수정 완료) |
| 2026-02-13 14:00 | 최지호 | 수정 | origin/feature/dashboard (모바일 최적화) |
| 2026-02-13 13:03 | 박지은 | 수정 | 알림 내역 탭 실시간 알림 스낵바 복구 및 프로세스 트리 SVG 생성 |
| 2026-02-12 15:05 | 김장훈 | 배포 | origin/develop push (feature/account 병합, /conda·/env 슬래시 커맨드 추가) |
| 2026-02-12 14:43 | 박지은 | 수정 | 알림 시스템 고도화: 인라인 확장 UI, 발송 증적(Evidence) 기록 기능 및 실시간 알림 스낵바 구현 |
| 2026-02-12 10:45 | 박재현 | 추가 | origin/feature/account push 고급 설정 기능 구현 (사용자 신청 활성화 제어 및 OpenSearch cs_policies 인덱스 연동) |
| 2026-02-12 09:10 | 최지호 | 수정 | origin/feature/dashboard push (시계열 그래프 시간이동, 검색 필터 추가) |
| 2026-02-11 15:30 | 박재현 | 추가 | origin/feature/account push 사용자 역할(모니터링, 결재자) 추가, 중국어(간체) 지원, 백엔드 동적 정책 검증 및 로그인 UI 개선 |
| 2026-02-11 14:50 | 김장훈 | 추가 | feature/admin 병합 (알림 시스템 기능 추가) |
| 2026-02-11 14:35 | 김장훈 | 배포 | origin/main push (develop 브랜치로 main 갱신) |
| 2026-02-11 14:35 | 김장훈 | 배포 | origin/feature/logs push (develop 기준 신규 브랜치 생성) |
| 2026-02-11 14:10 | 김장훈 | 배포 | origin/develop push (feature/account 병합) |
| 2026-02-11 13:51 | 박재현 | 수정 | origin/feature/account push (계정 신청 이메일 유효성/비밀번호 정책 UI 개선 및 정책 조회 API Public 전환) |
| 2026-02-11 13:25 | 김장훈 | 배포 | origin/develop push (기본 관리자 계정명 administrator 변경 및 가이드 최신화) |
| 2026-02-11 11:30 | 김장훈 | 배포 | origin/develop push (feature/reallog/main 병합) |
| 2026-02-11 11:25 | 김장훈 | 배포 | origin/main push (develop 브랜치로 main 갱신) |
| 2026-02-11 10:45 | 김경수 | 배포 | origin/feature/reallog/main push (로그 스트리밍 UI 개선) |
| 2026-02-11 10:40 | 김경수 | 수정 | 로그 스트리밍 UI 개선 (ControlBar 통합, 필드 헤더 추가, 레이아웃 최적화) |
| 2026-02-10 16:00 | 박재현 | 추가 | 계정 신청 기능 (백엔드 API, 프론트엔드 모달 및 로그인 연동) |
| 2026-02-10 14:10 | 김장훈 | 배포 | origin/develop push (빌드 스크립트 .env 유지 로직 추가 및 프론트엔드 빌드 오류 수정) |
| 2026-02-10 13:45 | 최지호 | 수정 | origin/feature/menu push (패널 4개 구현, 패널 이름 수정 구현) |
| 2026-02-10 12:05 | 김장훈 | 수리 | FastAPI Deprecation 경고 수정 (regex -> pattern) |
| 2026-02-10 11:45 | 김장훈 | 수정 | 관리자 생성/초기화 스크립트 SSL 설정 연동 및 README.md 가이드 정리 |
| 2026-02-10 11:30 | 김장훈 | 추가 | 관리자 비밀번호 초기화 스크립트 및 README.md 가이드 추가 |
| 2026-02-09 17:30 | 최지호 | 수정 | origin/feature/menu push (메뉴 팝업 형태 수정, 탭 이동시 캐시 저장) |
| 2026-02-09 15:53 | 김장훈 | 배포 | origin/develop push (OpenSearch Admin 계정 수동 생성 전환, Nginx 443 포트 SSL 설정) |
| 2026-02-09 15:11 | 김경수 | 수정 | feature/reallog/main push (develop rebase 충돌 해결) |
| 2026-02-09 13:52 | 김장훈 | 배포 | origin/feature/pipeline push (develop 기준 신규 브랜치 생성) |
| 2026-02-09 13:51 | 김장훈 | 배포 | origin/main push (develop 브랜치로 main 갱신) |
| 2026-02-09 13:50 | 김장훈 | 배포 | origin/develop push (프로젝트명 cruxSIEM 변경 및 브랜치 정리) |
| 2026-02-09 13:00 | 최지호 | 수정 | origin/feature/dashboard push (i18n, 탭 적용) |
| 2026-02-09 16:35 | 박지은 | 추가 | 알림 시스템 백엔드 API 및 탐지 엔진 초기 구현 (Repository, Service, Endpoint) |
| 2026-02-09 15:50 | 박지은 | 추가 | 알림 시스템 기획 및 상세 설계 완료 (워크플로우 1-5단계) |
| 2026-02-08 19:15 | 김장훈 | 배포 | origin/develop push (OpenSearch SSL CA 지원 및 docker-compose 볼륨 마운트 설정) |
| 2026-02-08 16:20 | 최지호 | 수정 | origin/feature/dashboard push (위협현황 대시보드 틀 구성 완료) |
| 2026-02-06 18:00 | 최지호 | 수정 | origin/feature/dashboard push (threat 대시보드 일부 구성) |
| 2026-02-06 16:30 | 김장훈 | 배포 | origin/develop push (MUI v7 Grid 표준 적용 및 빌드 오류 수정) |
| 2026-02-06 16:15 | 박상현 | 수정 | 로그 스트리밍 백엔드 API 오류 수정 (인증 의존성, 타임스탬프 누락 대응 및 JSON Alias 적용) |
| 2026-02-06 15:27 | 박상현 | 수정 | feature/reallog/main push (feature/reallog => feature/reallog/main 브랜치 이름 수정) |
| 2026-02-06 14:00 | 김장훈 | 배포 | origin/develop push (feature/dashboard 병합 및 최신화) |
| 2026-02-04 15:11 | 김경수 | 수정 | feature/reallog push (로그 스트리밍 기능 초안 구현) |
| 2026-02-03 17:10 | 최지호 | 추가 | origin/feature/dashboard push (메인 대시보드 초안 구현) |
| 2026-02-02 23:45 | 김경수 | 수정 | feature/reallog push (로그 스트리밍 기능 초안 구현) |
| 2026-02-02 23:45 | 김장훈 | 배포 | origin/develop push (cicd 브랜치 병합: 배포 자동화 및 초기화 기능 통합) |
| 2026-02-02 23:30 | 김장훈 | 문서화 | origin/cicd push (배포 가이드에 리버스 프록시 아키텍처 설명 추가) |
| 2026-02-02 13:28 | 김장훈 | 설정 | origin/develop push (mockup 폴더 제외 처리) |
| 2026-02-02 13:23 | 김장훈 | 배포 | origin/develop push (준비) |
| 2026-02-02 10:22 | 김장훈 | 배포 | origin/feature/admin push (프로젝트 시작 준비) |
| 2026-02-01 19:15 | 김장훈 | 배포 | origin/feature/admin push (로그인 UI/UX 개선, i18n 적용, 비밀번호 정책 관리 완성) |
| 2026-01-31 23:56 | 김장훈 | 배포 | origin/feature/admin push (feature/login 브랜치 기반 생성 및 스크립트 수정사항 반영) |
| 2026-02-01 18:35 | 김장훈 | 배포 | origin/feature/admin push (사용자 관리 및 패스워드 정책 관리 기능 구현) |
| 2026-02-01 18:00 | 김장훈 | 추가 | 사용자 관리 및 패스워드 정책 관리 기능 구현 (백엔드 CRUD 및 프론트엔드 UI) |
| 2026-02-01 15:30 | 김장훈 | 배포 | origin/feature/admin push (AdminSidemenu 통합 및 UI/UX 개선) |
| 2026-01-30 19:40 | 김장훈 | 배포 | origin/feature/login push (RememberMe 제거, i18n 추가, 헤더 통합, 다크모드/언어 지속성) |
| 2026-01-30 19:35 | 김장훈 | 삭제 | RememberMe 기능 제거 (LoginPage.tsx, 다국어 파일 업데이트) |
| 2026-01-30 19:11 | 김장훈 | 배포 | origin/feature/login push (로그인 기능 완성, Figma 디자인 적용, 다국어 지원, UI 개선) |
| 2026-01-30 19:11 | 김장훈 | 수정 | frontend/src/pages/LoginPage.tsx Figma 디자인 기반 스타일 적용 및 헤더 리디자인 |
| 2026-01-30 19:11 | 김장훈 | 수정 | frontend/src/services/api.ts 로그인 페이지에서 401 에러 메시지 표시 처리 |
| 2026-01-30 19:11 | 김장훈 | 추가 | frontend/src/locales/ 다국어 지원 파일 (ko.json, en.json, ja.json) |
| 2026-01-30 19:11 | 김장훈 | 수정 | backend/app/core/security.py bcrypt 직접 사용으로 passlib 호환성 문제 해결 |
| 2026-01-30 19:11 | 김장훈 | 수정 | 프로젝트명 CruxSIEM → cruxSIEM 표기 통일 |
| 2026-01-30 15:30 | 김장훈 | 배포 | origin/develop push (OpenSearch 접속 설정 및 테스트, 인덱스 명명 규칙 변경) |
| 2026-01-30 15:30 | 김장훈 | 추가 | backend/test_opensearch_connection.py OpenSearch 접속 테스트 스크립트 |
| 2026-01-30 15:30 | 김장훈 | 수정 | backend/.env.example OPENSEARCH_USE_SSL=false 변경 (SSL 미사용) |
| 2026-01-30 15:30 | 김장훈 | 수정 | ASSISTANT.md OpenSearch 인덱스 명명 규칙 (.cs- → cs_) |
| 2026-01-29 22:50 | 김장훈 | 배포 | origin/develop push (HISTORY 규칙 강화, README 갱신, push 이력 의무화) |
| 2026-01-29 22:50 | 김장훈 | 수정 | README.md 문서 테이블에 ASSISTANT.md 추가, CLAUDE.md/GEMINI.md 설명 갱신 |
| 2026-01-29 22:48 | 김장훈 | 수정 | HISTORY.md 날짜+시간 형식 변경, 원격 Git Push 이력 기록 의무화 |
| 2026-01-29 22:48 | 김장훈 | 수정 | ASSISTANT.md 필수 행동 강령 추가 (Push 시 HISTORY.md 기록 의무) |
| 2026-01-29 22:32 | 김장훈 | 수정 | CLAUDE.md/GEMINI.md에 ASSISTANT.md 외 내용 추가 금지 명시 |
| 2026-01-29 22:31 | 김장훈 | 리팩터 | ASSISTANT.md 신규 생성, CLAUDE.md/GEMINI.md 공통 가이드 분리 |
| 2026-01-29 22:31 | 김장훈 | 배포 | origin/develop push (ASSISTANT.md 생성, CLAUDE.md/GEMINI.md 분리) |
| 2026-01-29 21:44 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md 내용 완전 동기화 (언어규칙, 환경설정 누락 보완) |
| 2026-01-29 21:44 | 김장훈 | 배포 | origin/develop push (CLAUDE.md/GEMINI.md 동기화) |
| 2026-01-29 21:41 | 김장훈 | 추가 | ROADMAP.md 기능 개발 로드맵 생성 |
| 2026-01-29 21:41 | 김장훈 | 수정 | CLAUDE.md MUI 테마/모달/i18n 내용 정리 및 중복 제거 |
| 2026-01-29 21:41 | 김장훈 | 수정 | GEMINI.md CLAUDE.md와 동기화 (MUI/i18n/테마/모달 반영) |
| 2026-01-29 21:41 | 김장훈 | 추가 | docs/figma/resolver/ 어택라인, 프로세스트리 디자인 파일 |
| 2026-01-29 21:41 | 김장훈 | 배포 | origin/develop push (ROADMAP, figma 디자인, CLAUDE.md/GEMINI.md 동기화) |
| 2026-01-29 20:48 | 김장훈 | 추가 | .gitattributes, .editorconfig LF 개행 통일 및 OS간 빌드 오류 방지 |
| 2026-01-29 20:48 | 김장훈 | 배포 | origin/develop push (.gitattributes, .editorconfig) |
| 2026-01-29 17:40 | 김장훈 | 배포 | origin/develop push (백엔드/프론트엔드 구조, 문서 갱신, README) |
| 2026-01-29 16:26 | 김장훈 | 배포 | origin/main push (백엔드/프론트엔드 기본 구조 머지) |
| 2026-01-29 16:26 | 김경수 | 설정 | OpenSearch 구성 및 셋팅 |
| 2026-01-29 16:26 | 김장훈 | 설정 | 개발서버 2대 구성 (DB, AP) |
| 2026-01-29 16:26 | 김경인 | 추가 | `docs/figma/login/login.svg` 파일 생성 |
| 2026-01-29 14:08 | 김장훈 | 설정 | CLAUDE.md, GEMINI.md, HISTORY.md 생성 및 템플릿 파일 정리 |
| 2026-01-29 14:08 | 김장훈 | 추가 | 백엔드 기본 구조 (FastAPI + opensearch-py), PostgreSQL/SQLAlchemy/Alembic 제거 |
| 2026-01-29 14:08 | 김장훈 | 추가 | 프론트엔드 기본 구조 (React 18 + TypeScript + Vite + MUI) |
| 2026-01-29 14:08 | 김장훈 | 추가 | MUI 라이브러리 설치 (@mui/material, icons-material, x-data-grid, x-date-pickers) |
| 2026-01-29 14:08 | 김장훈 | 추가 | 프론트엔드 테마 설정 (다크 모드), axios API 클라이언트, React Router |
| 2026-01-29 14:08 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md OpenSearch 전용 + MUI 프론트엔드 반영 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/ARCHITECTURE.md, docs/INSTALL.md 대문자 파일명 변경 및 내용 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/GIT_GUIDE.md feature/기능명 브랜치 워크플로우 가이드 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | docs/DEPLOY.md OpenSearch 기반 Docker 배포 가이드 갱신 |
| 2026-01-29 14:08 | 김장훈 | 수정 | CLAUDE.md, GEMINI.md 워크플로우 리소스 경로(.claude/) 필수 명시 |
| 2026-01-29 14:08 | 김장훈 | 설정 | OpenSearch 개발서버 접속정보 반영 (ns1.cruxdata.co.kr:11723) |
| 2026-01-29 14:08 | 김장훈 | 수정 | README.md 프로젝트 소개 및 참여자 정보 작성 |
| 2026-01-29 14:08 | 김장훈 | 설정 | 개발 시작 준비 완료 검증 (백엔드/프론트엔드 빌드 및 서버 기동 확인) |
