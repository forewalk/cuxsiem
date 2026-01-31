#!/bin/bash

# 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../../logs" # 프로젝트 루트의 logs 디렉토리로 변경

# 로그 디렉토리 생성 (없으면)
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/backend_$(date '+%Y-%m-%d').log"
PID_FILE="$LOG_DIR/backend.pid"
BACKEND_DIR="$SCRIPT_DIR/../../backend"

# 로그 함수
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# start 함수
start() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        log_message "Backend is already running (PID: $(cat $PID_FILE))"
        return 1
    fi

    log_message "=========================================="
    log_message "Pre-flight checks before starting Backend"
    log_message "=========================================="

    # 1. Conda 환경 확인
    if ! command -v conda &> /dev/null; then
        log_message "❌ ERROR: conda not found"
        log_message "Please install Anaconda/Miniconda first"
        return 1
    fi

    CURRENT_ENV=$(echo $CONDA_DEFAULT_ENV 2>/dev/null || echo "")
    if [ "$CURRENT_ENV" != "cruxsiem" ]; then
        log_message "⚠️  WARNING: Current conda env is '$CURRENT_ENV' (not 'cruxsiem')"
        log_message "Please activate conda environment first:"
        log_message "  conda activate cruxsiem"
        return 1
    fi
    log_message "✅ Conda environment: cruxsiem (active)"

    # 2. Git status 확인
    cd "$SCRIPT_DIR/../../"
    GIT_STATUS=$(git status --porcelain 2>/dev/null)

    if [ -n "$GIT_STATUS" ]; then
        log_message "⚠️  WARNING: Git has uncommitted changes:"
        echo "$GIT_STATUS" | while read line; do
            log_message "  $line"
        done
        log_message ""

        # Interactive 모드 체크
        if [ -t 0 ]; then
            # 터미널이 있으면 사용자에게 물어봄
            log_message "Current git status:"
            git status
            log_message ""
            read -p "Continue? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_message "Backend startup cancelled"
                return 1
            fi
        else
            # 터미널이 없으면 자동으로 진행
            log_message "⚠️  (non-interactive mode, continuing...)"
        fi
    else
        log_message "✅ Git status: clean"
    fi

    log_message "=========================================="
    log_message "Starting Backend..."
    log_message "=========================================="

    cd "$BACKEND_DIR"
    nohup python -m uvicorn app.main:app --reload --port 8000 >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    log_message "Backend started (PID: $(cat $PID_FILE))"
    log_message "Backend available at: http://localhost:8000"
}

# stop 함수
stop() {
    if [ ! -f "$PID_FILE" ]; then
        log_message "Backend is not running"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
        log_message "Stopping Backend (PID: $PID)..."
        kill $PID
        sleep 1
        if kill -0 $PID 2>/dev/null; then
            log_message "Force killing Backend (PID: $PID)..."
            kill -9 $PID
        fi
        rm "$PID_FILE"
        log_message "Backend stopped"
    else
        log_message "Backend process not found (PID: $PID)"
        rm "$PID_FILE"
    fi
}

# status 함수
status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            log_message "Backend is running (PID: $PID)"
            return 0
        else
            log_message "Backend process not found (PID: $PID)"
            rm "$PID_FILE"
            return 1
        fi
    else
        log_message "Backend is not running"
        return 1
    fi
}

# restart 함수
restart() {
    log_message "Restarting Backend..."
    stop
    sleep 2
    start
}

# 메인 로직
case "${1:-status}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
