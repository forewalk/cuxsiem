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
    // 배포 환경에서는 현재 호스트를 기반으로 WebSocket URL 생성
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // 개발 환경에서는 환경 변수 사용, 없으면 현재 호스트 사용
    if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws');
      return `${wsBaseUrl}/api/v1/ws/alerts`;
    }
    
    // 배포 환경: 현재 호스트 사용 (Nginx 리버스 프록시 통과)
    return `${protocol}//${host}/api/v1/ws/alerts`;
  }, []);

  // WebSocket 메시지 핸들러
  const handleMessage = useCallback((data: any) => {
    console.log('🔔 WebSocket message received:', data);
    
    if (data.type === 'force_logout') {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      // 필요 시 api 인터셉터 쪽 로직과 동일하게 맞춤
      window.location.href = "/login?reason=multiple_login";
      return;
    }

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
      
      console.log('✅ New snackbar created:', newSnackbar);
      setSnackbars((prev) => {
        const updated = [...prev, newSnackbar];
        console.log('📊 Updated snackbars:', updated);
        return updated;
      });
      
      // 10초 후 자동 제거
      setTimeout(() => {
        setSnackbars((prev) => prev.filter(s => s.id !== newSnackbar.id));
      }, 10000);
    } else {
      console.log('⚠️ Message ignored - type or data missing:', { type: data.type, hasData: !!data.data });
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
