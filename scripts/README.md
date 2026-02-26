# 개발 서버 관리 스크립트

로컬 개발 환경에서 백엔드(FastAPI)와 프론트엔드(Vite) 서버를 백그라운드로 실행하고 관리하는 쉘 스크립트입니다.

## 파일 구조

```
scripts/
├── backend.sh       # 백엔드 서버 관리 (포트 8000)
├── frontend.sh      # 프론트엔드 서버 관리 (포트 5173)
├── all.sh           # 모든 서버 통합 관리
├── logs/            # 서버 로그가 저장되는 폴더
│   ├── backend.log  # 백엔드 로그 파일 (자동 생성)
│   ├── frontend.log # 프론트엔드 로그 파일 (자동 생성)
│   └── all.log      # 통합 로그 파일 (자동 생성)
├── pid/             # 프로세스 ID가 저장되는 폴더
│   ├── backend.pid  # 백엔드 프로세스 ID (자동 생성)
│   └── frontend.pid # 프론트엔드 프로세스 ID (자동 생성)
└── mockup/          # 목업(Mockup) 데이터 생성 스크립트 모음
```

## 사용법

### 백엔드만 관리

```bash
bash scripts/backend.sh start      # 시작
bash scripts/backend.sh stop       # 종료
bash scripts/backend.sh status     # 상태 확인
bash scripts/backend.sh restart    # 재시작
```

### 프론트엔드만 관리

```bash
bash scripts/frontend.sh start      # 시작
bash scripts/frontend.sh stop       # 종료
bash scripts/frontend.sh status     # 상태 확인
bash scripts/frontend.sh restart    # 재시작
```

### 모든 서비스 통합 관리

```bash
bash scripts/all.sh start      # 모두 시작
bash scripts/all.sh stop       # 모두 종료
bash scripts/all.sh status     # 모두 상태 확인
bash scripts/all.sh restart    # 모두 재시작
```

## 로그 확인

모든 로그는 **scripts/logs/** 폴더에 직접 저장됩니다. 날짜와 시간이 함께 기록됩니다.

```bash
# 백엔드 로그 실시간 확인
tail -f scripts/logs/backend.log

# 프론트엔드 로그 실시간 확인
tail -f scripts/logs/frontend.log

# 통합 로그 실시간 확인
tail -f scripts/logs/all.log
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
bash scripts/all.sh start

# 로그 확인 (다른 터미널)
tail -f scripts/logs/frontend.log

# 서비스 상태 확인
bash scripts/all.sh status

# 필요하면 재시작
bash scripts/all.sh restart

# 개발 완료 후 모두 종료
bash scripts/all.sh stop
```

## 문제 해결

**프로세스가 자동으로 종료되는 경우:**
- 백엔드: 에러 메시지를 `scripts/logs/backend.log`에서 확인
- 프론트엔드: 에러 메시지를 `scripts/logs/frontend.log`에서 확인

**포트가 이미 사용 중인 경우:**
- 기존 프로세스를 종료하거나 포트 번호를 변경하세요.