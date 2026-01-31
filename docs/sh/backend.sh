#!/bin/bash

# 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR"
LOG_FILE="$LOG_DIR/backend.log"
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

    log_message "Starting Backend..."
    cd "$BACKEND_DIR"
    nohup python -m uvicorn app.main:app --reload --port 8000 >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    log_message "Backend started (PID: $(cat $PID_FILE))"
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
