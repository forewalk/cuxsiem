#!/bin/bash

# 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"

# 로그 디렉토리 생성 (없으면)
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/all_$(date '+%Y-%m-%d').log"

# 환경 변수 설정
export VITE_API_URL="http://localhost:8000/api/v1"

# 로그 함수
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# start-all 함수
start_all() {
    log_message "=========================================="
    log_message "Starting all services..."
    log_message "=========================================="

    bash "$SCRIPT_DIR/backend.sh" start
    sleep 2
    bash "$SCRIPT_DIR/frontend.sh" start

    log_message "=========================================="
    log_message "All services started"
    log_message "Backend:  http://localhost:8000"
    log_message "Frontend: http://localhost:5173"
    log_message "=========================================="
}

# stop-all 함수
stop_all() {
    log_message "=========================================="
    log_message "Stopping all services..."
    log_message "=========================================="

    bash "$SCRIPT_DIR/frontend.sh" stop
    sleep 1
    bash "$SCRIPT_DIR/backend.sh" stop

    log_message "=========================================="
    log_message "All services stopped"
    log_message "=========================================="
}

# status-all 함수
status_all() {
    log_message "=========================================="
    log_message "Service Status"
    log_message "=========================================="

    bash "$SCRIPT_DIR/backend.sh" status
    bash "$SCRIPT_DIR/frontend.sh" status

    log_message "=========================================="
}

# restart-all 함수
restart_all() {
    log_message "=========================================="
    log_message "Restarting all services..."
    log_message "=========================================="

    stop_all
    sleep 2
    start_all
}

# 메인 로직
case "${1:-status}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    status)
        status_all
        ;;
    restart)
        restart_all
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
