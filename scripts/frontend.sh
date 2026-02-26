#!/bin/bash

# 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_DIR="$SCRIPT_DIR/pid"

# 로그 디렉토리 생성 (없으면)
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

LOG_FILE="$LOG_DIR/frontend_$(date '+%Y-%m-%d').log"
PID_FILE="$PID_DIR/frontend.pid"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

# 로그 함수
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# start 함수
start() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        log_message "Frontend is already running (PID: $(cat $PID_FILE))"
        return 1
    fi

    log_message "=========================================="
    log_message "Pre-flight checks before starting Frontend"
    log_message "=========================================="

    # 1. Node.js/npm 확인
    if ! command -v npm &> /dev/null; then
        log_message "❌ ERROR: npm not found"
        log_message "Please install Node.js first"
        return 1
    fi
    log_message "✅ npm is available"

    # 2. Git status 확인
    cd "$SCRIPT_DIR/../"
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
                log_message "Frontend startup cancelled"
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
    log_message "Starting Frontend..."
    log_message "=========================================="

    cd "$FRONTEND_DIR"
    nohup npm run dev >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    log_message "Frontend started (PID: $(cat $PID_FILE))"
    log_message "Frontend available at: http://localhost:5173/"
}

# stop 함수
stop() {
    if [ ! -f "$PID_FILE" ]; then
        log_message "Frontend is not running"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
        log_message "Stopping Frontend (PID: $PID)..."
        kill $PID
        sleep 1
        if kill -0 $PID 2>/dev/null; then
            log_message "Force killing Frontend (PID: $PID)..."
            kill -9 $PID
        fi
        rm "$PID_FILE"
        log_message "Frontend stopped"
    else
        log_message "Frontend process not found (PID: $PID)"
        rm "$PID_FILE"
    fi
}

# status 함수
status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            log_message "Frontend is running (PID: $PID)"
            log_message "Available at http://localhost:5173/"
            return 0
        else
            log_message "Frontend process not found (PID: $PID)"
            rm "$PID_FILE"
            return 1
        fi
    else
        log_message "Frontend is not running"
        return 1
    fi
}

# restart 함수
restart() {
    log_message "Restarting Frontend..."
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
