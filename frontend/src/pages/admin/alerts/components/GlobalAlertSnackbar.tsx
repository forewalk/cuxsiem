import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import type { AlertSnackbar } from '../../../../hooks/useGlobalAlertNotification';

interface GlobalAlertSnackbarProps {
  snackbars: AlertSnackbar[];
  onClose: (id: string) => void;
}

/**
 * 전역 알림 스낵바 컴포넌트 (다중 표시)
 * - 신규 위협 탐지 알림을 우측 하단에 스택으로 표시
 * - severity에 따라 색상 자동 변경 (critical/high → error, medium → warning, low/info → info)
 * - 최대 5개까지 동시 표시
 * - useGlobalAlertNotification 훅과 함께 사용
 */
export const GlobalAlertSnackbar: React.FC<GlobalAlertSnackbarProps> = ({ snackbars, onClose }) => {
  // severity를 MUI Alert severity로 매핑
  const getMuiSeverity = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    if (!severity) {
      return 'info';
    }
    
    const severityLower = severity.toLowerCase().trim();
    
    // 이미 MUI severity 값인 경우 그대로 사용
    if (severityLower === 'error' || severityLower === 'warning' || 
        severityLower === 'info' || severityLower === 'success') {
      return severityLower as 'error' | 'warning' | 'info' | 'success';
    }
    
    // 커스텀 severity → MUI severity 매핑
    if (severityLower === 'critical' || severityLower === 'high') {
      return 'error';
    }
    if (severityLower === 'medium') {
      return 'warning';
    }
    if (severityLower === 'low') {
      return 'info';
    }
    
    // 기본값
    return 'info';
  };

  // 최대 5개까지만 표시
  const visibleSnackbars = snackbars.slice(-5);

  return (
    <>
      {visibleSnackbars.map((snackbar, index) => (
        <Snackbar
          key={snackbar.id}
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ 
            mb: 2 + (index * 9), // 각 Snackbar를 위로 쌓기 (9rem = Alert 높이 + 여백)
            mr: 2,
          }}
        >
          <Alert
            onClose={() => onClose(snackbar.id)}
            severity={getMuiSeverity(snackbar.severity)}
            variant="filled"
            icon={<NotificationsActiveIcon />}
            sx={{ 
              width: '100%', 
              minWidth: 320,
              maxWidth: 500,
              boxShadow: 6,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {snackbar.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                {snackbar.message.length > 100 
                  ? `${snackbar.message.substring(0, 100)}...` 
                  : snackbar.message}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};
