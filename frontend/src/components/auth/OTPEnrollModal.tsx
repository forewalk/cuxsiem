/**
 * OTP 등록 모달 컴포넌트
 * - 1단계: QR코드 표시 + manual_key
 * - 2단계: 6자리 코드 입력 + 확인
 * - 백업 코드 다운로드
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
  Stepper,
  Step,
  StepLabel,
  Alert,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Chip,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import OTPService from '../../services/otpService';

import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";
import cnMessages from "../../locales/cn.json";

interface OTPEnrollModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (backupCodes: string[]) => void;
  apiClient: any;
}

export const OTPEnrollModal: React.FC<OTPEnrollModalProps> = ({
  open,
  onClose,
  onSuccess,
  apiClient,
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

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

  const steps = [t('otpStep1Label'), t('otpStep2Label'), t('otpStep3Label')];

  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const otpService = new OTPService(apiClient);

  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await otpService.enrollOTP();
      setQrCode(response.qr_code_image);
      setManualKey(response.manual_key);
    } catch (err: any) {
      setError(err.message || t('otpEnrollFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError(t('enterOtp6Digit'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await otpService.verifyEnrollment(code);
      setBackupCodes(response.backup_codes);
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message || t('otpVerifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'otp-backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleComplete = () => {
    onSuccess(backupCodes);
    handleClose();
  };

  const handleCopyManualKey = () => {
    if (manualKey) {
      navigator.clipboard.writeText(manualKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setCode('');
    setQrCode(null);
    setManualKey(null);
    setBackupCodes([]);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {/* 헤더 */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SecurityIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('otpEnrollTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* 스텝퍼 */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 1단계: QR 코드 */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: 'center' }}>
            {!qrCode ? (
              <Box
                sx={{
                  py: 4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 80, height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                  }}
                >
                  <QrCode2Icon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.5) }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                  {t('otpEnrollStep1')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleStartEnrollment}
                  disabled={loading}
                  sx={{ mt: 1, minWidth: 160 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : t('generateQRCode')}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {/* QR 코드 */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'inline-flex',
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: '#fff',
                  }}
                >
                  <img src={qrCode} alt="OTP QR Code" style={{ width: 180, height: 180, display: 'block' }} />
                </Paper>

                {/* 수동 입력 키 */}
                <Box sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('manualKey')}
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 2, py: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: 'text.primary', userSelect: 'all' }}
                    >
                      {manualKey}
                    </Typography>
                    <Tooltip title={copied ? t('copied') : t('copy')}>
                      <IconButton size="small" onClick={handleCopyManualKey} color={copied ? 'success' : 'default'}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {t('manualKeyDesc')}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setActiveStep(1)}
                >
                  {t('next')}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* 2단계: 코드 입력 */}
        {activeStep === 1 && (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('otpEnrollStep2')}
            </Typography>
            <TextField
              fullWidth
              label={t('otpCode')}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !loading) handleVerifyCode(); }}
              placeholder="000000"
              disabled={loading}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              autoFocus
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('codeWarning')}
            </Typography>
          </Box>
        )}

        {/* 3단계: 백업 코드 */}
        {activeStep === 2 && (
          <Box sx={{ py: 1 }}>
            {/* 성공 헤더 */}
            <Box
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                mb: 3, py: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 36, color: 'success.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                {t('otpEnrollSuccess')}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('saveBackupCodesMsg')}
            </Typography>

            {/* 백업 코드 그리드 */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
              }}
            >
              {backupCodes.map((bc, idx) => (
                <Chip
                  key={idx}
                  label={bc}
                  variant="outlined"
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    color: 'text.primary',
                  }}
                />
              ))}
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          {t('cancel')}
        </Button>
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleVerifyCode}
            disabled={!code || code.length !== 6 || loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : t('confirm')}
          </Button>
        )}
        {activeStep === 2 && (
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadBackupCodes}>
              {t('download')}
            </Button>
            <Button variant="contained" onClick={handleComplete}>
              {t('done')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OTPEnrollModal;
