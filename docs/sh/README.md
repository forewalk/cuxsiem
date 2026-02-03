# 개발 서버 관리 스크립트

로컬 개발 환경에서 백엔드(FastAPI)와 프론트엔드(Vite) 서버를 백그라운드로 실행하고 관리하는 쉘 스크립트입니다.

## 파일 구조

```
docs/sh/
├── backend.sh       # 백엔드 서버 관리 (포트 8000)
├── frontend.sh      # 프론트엔드 서버 관리 (포트 5173)
├── all.sh           # 모든 서버 통합 관리
├── backend.log      # 백엔드 로그 파일 (자동 생성)
├── frontend.log     # 프론트엔드 로그 파일 (자동 생성)
├── all.log          # 통합 로그 파일 (자동 생성)
├── backend.pid      # 백엔드 프로세스 ID (자동 생성)
└── frontend.pid     # 프론트엔드 프로세스 ID (자동 생성)
```

## 사용법

### 백엔드만 관리

```bash
bash docs/sh/backend.sh start      # 시작
bash docs/sh/backend.sh stop       # 종료
bash docs/sh/backend.sh status     # 상태 확인
bash docs/sh/backend.sh restart    # 재시작
```

### 프론트엔드만 관리

```bash
bash docs/sh/frontend.sh start      # 시작
bash docs/sh/frontend.sh stop       # 종료
bash docs/sh/frontend.sh status     # 상태 확인
bash docs/sh/frontend.sh restart    # 재시작
```

### 모든 서비스 통합 관리

```bash
bash docs/sh/all.sh start      # 모두 시작
bash docs/sh/all.sh stop       # 모두 종료
bash docs/sh/all.sh status     # 모두 상태 확인
bash docs/sh/all.sh restart    # 모두 재시작
```

## 로그 확인

모든 로그는 **실행한 폴더(docs/sh/)에 직접 저장**됩니다. 날짜와 시간이 함께 기록됩니다.

```bash
# 백엔드 로그 실시간 확인
tail -f docs/sh/backend.log

# 프론트엔드 로그 실시간 확인
tail -f docs/sh/frontend.log

# 통합 로그 실시간 확인
tail -f docs/sh/all.log
```

## 서버 접속 정보

- **백엔드 (FastAPI):** http://localhost:8000
- **프론트엔드 (Vite):** http://localhost:5173

## 주요 기능

✅ **백그라운드 실행:** 터미널을 닫아도 계속 실행
✅ **로그 기록:** 모든 출력을 타임스탐프와 함께 저장
✅ **프로세스 관리:** PID 파일로 안전하게 관리
✅ **언제든 종료:** 실행 중 언제든 stop 명령으로 종료 가능
✅ **상태 확인:** status 명령으로 실시간 상태 확인
✅ **안전한 재시작:** restart로 깔끔하게 재시작

## 예시

```bash
# 모든 서비스 시작
bash docs/sh/all.sh start

# 로그 확인 (다른 터미널)
tail -f docs/sh/frontend.log

# 서비스 상태 확인
bash docs/sh/all.sh status

# 필요하면 재시작
bash docs/sh/all.sh restart

# 개발 완료 후 모두 종료
bash docs/sh/all.sh stop
```

## 문제 해결

**프로세스가 자동으로 종료되는 경우:**
- 백엔드: 에러 메시지를 `backend.log`에서 확인
- 프론트엔드: 에러 메시지를 `frontend.log`에서 확인

**포트가 이미 사용 중인 경우:**
- 기존 프로세스를 종료하거나 포트 번호를 변경하세요.
