import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

interface AlertSnackbar {
  open: boolean;
  title: string;
  message: string;
  severity: string;
  alertId: string;
}

interface GlobalAlertSnackbarProps {
  snackbar: AlertSnackbar;
  onClose: () => void;
}

/**
 * 전역 알림 스낵바 컴포넌트
 * - 신규 위협 탐지 알림을 우측 하단에 표시
 * - severity에 따라 색상 자동 변경 (critical/high → error, medium → warning, low/info → info)
 * - useGlobalAlertNotification 훅과 함께 사용
 */
export const GlobalAlertSnackbar: React.FC<GlobalAlertSnackbarProps> = ({ snackbar, onClose }) => {
  // severity를 MUI Alert severity로 매핑
  const getMuiSeverity = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    const severityLower = severity.toLowerCase();
    
    if (severityLower === 'critical' || severityLower === 'high') {
      return 'error';
    }
    if (severityLower === 'medium') {
      return 'warning';
    }
    return 'info';
  };



  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert
        onClose={onClose}
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
  );
};
