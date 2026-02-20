import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

interface AlertSnackbar {
  open: boolean;
  title: string;
  message: string;
  severity: string;
  alertId: string;
}

const POLL_INTERVAL = 10000; // 10초

/**
 * 전역 알림 감지 훅
 * - 백그라운드에서 주기적으로 신규 알림 폴링
 * - 역할 기반 필터링 자동 적용 (백엔드에서 처리)
 * - 모든 페이지에서 사용 가능
 */
export const useGlobalAlertNotification = (isAuthenticated: boolean) => {
  const [snackbar, setSnackbar] = useState<AlertSnackbar>({
    open: false,
    title: '',
    message: '',
    severity: '',
    alertId: ''
  });

  const lastAlertIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const checkForNewAlerts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // 최신 알림 1개만 조회
      const response = await notificationService.getNotifications({
        skip: 0,
        limit: 1,
        // 역할 기반 필터링은 백엔드에서 자동 처리됨
      });

      if (response.items.length > 0) {
        const latestAlert = response.items[0];

        // 첫 로드 시에는 스낵바를 띄우지 않음 (현재 상태만 저장)
        if (isFirstLoadRef.current) {
          lastAlertIdRef.current = latestAlert.id;
          isFirstLoadRef.current = false;
          return;
        }

        // 신규 알림 감지
        if (lastAlertIdRef.current && latestAlert.id !== lastAlertIdRef.current) {
          setSnackbar({
            open: true,
            title: latestAlert.rule_name || latestAlert.title || 'New Alert',
            message: (latestAlert.message || '').split('\n')[0],  // 첫 번째 줄만 추출
            severity: latestAlert.severity || latestAlert.rule_severity || 'info',
            alertId: latestAlert.id
          });

          lastAlertIdRef.current = latestAlert.id;
        }
      }
    } catch (error) {
      console.error('Failed to check for new alerts:', error);
    }
  }, [isAuthenticated]);

  // 주기적 폴링
  useEffect(() => {
    if (!isAuthenticated) {
      // 로그아웃 시 초기화
      isFirstLoadRef.current = true;
      lastAlertIdRef.current = null;
      return;
    }

    // 즉시 한 번 실행
    checkForNewAlerts();

    // 주기적 폴링 시작
    const intervalId = setInterval(checkForNewAlerts, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, checkForNewAlerts]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    snackbar,
    handleCloseSnackbar
  };
};
