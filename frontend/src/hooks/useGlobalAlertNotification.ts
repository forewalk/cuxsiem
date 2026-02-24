import { useState, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';

export interface AlertSnackbar {
  id: string;
  title: string;
  message: string;
  severity: string;
  alertId: string;
  timestamp: number;
}

/**
 * 전역 알림 감지 훅 (WebSocket 기반)
 * 
 * - WebSocket을 통한 실시간 알림 수신
 * - 다중 Snackbar 동시 표시 (스택)
 * - 역할 기반 필터링 자동 적용 (백엔드에서 처리)
 * - 자동 재연결
 * - 모든 페이지에서 사용 가능
 */
export const useGlobalAlertNotification = (isAuthenticated: boolean, token: string | null) => {
  const [snackbars, setSnackbars] = useState<AlertSnackbar[]>([]);

  // WebSocket URL 생성
  const wsUrl = useMemo(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    // http(s)://host:port -> ws(s)://host:port
    const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws');
    return `${wsBaseUrl}/api/v1/ws/alerts`;
  }, []);

  // WebSocket 메시지 핸들러
  const handleMessage = useCallback((data: any) => {
    if (data.type === 'new_alert' && data.data) {
      const alert = data.data;
      
      const newSnackbar: AlertSnackbar = {
        id: `${alert.id}-${Date.now()}`, // 고유 ID 생성
        title: alert.rule_name || 'New Alert',
        message: (alert.message || '').split('\n')[0],  // 첫 번째 줄만 추출
        severity: alert.severity || alert.rule_severity || 'info',
        alertId: alert.id,
        timestamp: Date.now()
      };
      
      setSnackbars((prev) => [...prev, newSnackbar]);
      
      // 10초 후 자동 제거
      setTimeout(() => {
        setSnackbars((prev) => prev.filter(s => s.id !== newSnackbar.id));
      }, 10000);
    }
  }, []);

  // WebSocket 연결 (인증된 경우에만)
  const { isConnected } = useWebSocket({
    url: wsUrl,
    token: isAuthenticated ? token : null,
    onMessage: handleMessage
  });

  const handleCloseSnackbar = useCallback((id: string) => {
    setSnackbars((prev) => prev.filter(s => s.id !== id));
  }, []);

  return {
    snackbars,
    handleCloseSnackbar,
    isConnected  // WebSocket 연결 상태도 반환
  };
};
