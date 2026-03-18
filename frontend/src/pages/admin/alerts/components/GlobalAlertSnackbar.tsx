import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import type { AlertSnackbar } from '../../../../hooks/useGlobalAlertNotification';
import { mapSeverityToMui } from '@/components/shared/SeverityChip';

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
            mb: 2 + (index * 13.75),
            mr: 2,
          }}
        >
          <Alert
            onClose={() => onClose(snackbar.id)}
            severity={mapSeverityToMui(snackbar.severity)}
            variant="filled"
            icon={<NotificationsActiveIcon />}
            sx={{ 
              width: '400px',
              minHeight: '100px',
              maxHeight: '100px',
              boxShadow: 6,
              '& .MuiAlert-message': {
                width: '100%',
                overflow: 'hidden'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
              justifyContent: 'center'
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {snackbar.title}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};
