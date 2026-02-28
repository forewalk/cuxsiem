/**
 * OTP 로그인 모달 컴포넌트
 * - OTP 코드 입력 탭
 * - 백업 코드 입력 탭
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import OTPService from '../../services/otpService';

interface OTPLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (accessToken: string) => void;
  apiClient: any;
}

export const OTPLoginModal: React.FC<OTPLoginModalProps> = ({
  open,
  onClose,
  onSuccess,
  apiClient,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpService = new OTPService(apiClient);

  /**
   * OTP 코드로 로그인
   */
  const handleOTPLogin = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('6자리 OTP 코드를 입력하세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await otpService.loginWithOTP(otpCode);
      onSuccess(response.access_token);
    } catch (err: any) {
      setError(err.message || 'OTP 인증 실패');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 백업 코드로 로그인
   */
  const handleBackupCodeLogin = async () => {
    if (!backupCode || backupCode.length !== 8) {
      setError('8자리 백업 코드를 입력하세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await otpService.loginWithBackupCode(backupCode);
      onSuccess(response.access_token);
    } catch (err: any) {
      setError(err.message || '백업 코드 인증 실패');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 다이얼로그 닫기
   */
  const handleClose = () => {
    setActiveTab(0);
    setError(null);
    setOtpCode('');
    setBackupCode('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('otpLoginTitle') || 'OTP 인증'}</DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label={t('otpCode') || 'OTP 코드'} />
            <Tab label={t('backupCode') || '백업 코드'} />
          </Tabs>

          {/* OTP 코드 탭 */}
          {activeTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label={t('otpCode') || 'OTP 코드'}
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                inputProps={{ maxLength: 6 }}
              />
            </Box>
          )}

          {/* 백업 코드 탭 */}
          {activeTab === 1 && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label={t('backupCode') || '백업 코드'}
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABCD1234"
                maxLength={8}
                disabled={loading}
                inputProps={{ maxLength: 8 }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel') || '취소'}
        </Button>
        {activeTab === 0 ? (
          <Button
            variant="contained"
            onClick={handleOTPLogin}
            disabled={!otpCode || otpCode.length !== 6 || loading}
          >
            {loading ? <CircularProgress size={24} /> : '확인'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleBackupCodeLogin}
            disabled={!backupCode || backupCode.length !== 8 || loading}
          >
            {loading ? <CircularProgress size={24} /> : '확인'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OTPLoginModal;
