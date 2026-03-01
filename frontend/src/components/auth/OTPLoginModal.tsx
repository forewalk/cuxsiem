/**
 * OTP 로그인 모달 컴포넌트
 * - OTP 코드 입력 탭
 * - 백업 코드 입력 탭
 */

import React, { useState, useCallback } from 'react';
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
import OTPService from '../../services/otpService';

import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";
import cnMessages from "../../locales/cn.json";

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
  const [activeTab, setActiveTab] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
  };

  const t = useCallback((key: string): string => {
    const currentTranslations = translations[savedLanguage] || translations["ko"] || {};
    return currentTranslations[key] || key;
  }, [savedLanguage]);

  const otpService = new OTPService(apiClient);

  /**
   * OTP 코드로 로그인
   */
  const handleOTPLogin = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError(t('enterOtp6Digit'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await otpService.loginWithOTP(otpCode);
      onSuccess(response.access_token);
    } catch (err: any) {
      setError(err.message || t('otpAuthFailed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 백업 코드로 로그인
   */
  const handleBackupCodeLogin = async () => {
    if (!backupCode || backupCode.length !== 8) {
      setError(t('enterBackup8Digit'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await otpService.loginWithBackupCode(backupCode);
      onSuccess(response.access_token);
    } catch (err: any) {
      setError(err.message || t('backupCodeAuthFailed'));
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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('otpLoginTitle')}</DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label={t('otpCode')} />
            <Tab label={t('backupCode')} />
          </Tabs>

          {/* OTP 코드 탭 */}
          {activeTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label={t('otpCode')}
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
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
                label={t('backupCode')}
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="ABCD1234"
                disabled={loading}
                inputProps={{ maxLength: 8 }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        {activeTab === 0 ? (
          <Button
            variant="contained"
            onClick={handleOTPLogin}
            disabled={!otpCode || otpCode.length !== 6 || loading}
          >
            {loading ? <CircularProgress size={24} /> : t('confirm')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleBackupCodeLogin}
            disabled={!backupCode || backupCode.length !== 8 || loading}
          >
            {loading ? <CircularProgress size={24} /> : t('confirm')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OTPLoginModal;
