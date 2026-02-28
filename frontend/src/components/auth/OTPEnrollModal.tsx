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
  CircularProgress,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
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

const steps = ['QR코드 스캔', '코드 입력'];

export const OTPEnrollModal: React.FC<OTPEnrollModalProps> = ({
  open,
  onClose,
  onSuccess,
  apiClient,
}) => {
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
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const otpService = new OTPService(apiClient);

  /**
   * 1단계: OTP 등록 시작
   */
  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await otpService.enrollOTP();
      setQrCode(response.qr_code_image);
      setManualKey(response.manual_key);
    } catch (err: any) {
      setError(err.message || 'OTP 등록 실패');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2단계: OTP 코드 검증
   */
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('6자리 코드를 입력하세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await otpService.verifyEnrollment(code);
      setBackupCodes(response.backup_codes);
      setActiveStep(2); // 완료 화면
    } catch (err: any) {
      setError(err.message || 'OTP 검증 실패');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 백업 코드 다운로드
   */
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

  /**
   * 완료 후 모달 닫기
   */
  const handleComplete = () => {
    onSuccess(backupCodes);
    handleClose();
  };

  /**
   * manual_key 복사
   */
  const handleCopyManualKey = () => {
    if (manualKey) {
      navigator.clipboard.writeText(manualKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * 다이얼로그 닫기
   */
  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setCode('');
    setQrCode(null);
    setManualKey(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('otpEnrollTitle')}</DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* 단계 표시 */}
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* 1단계: QR코드 표시 */}
          {activeStep === 0 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              {!qrCode ? (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {t('otpEnrollStep1')}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartEnrollment}
                    disabled={loading}
                  >
                    {loading ? '준비 중...' : 'QR 코드 생성'}
                  </Button>
                </>
              ) : (
                <>
                  {/* QR 코드 이미지 */}
                  <Paper sx={{ p: 2, display: 'inline-block', mb: 2 }}>
                    <img
                      src={qrCode}
                      alt="OTP QR Code"
                      style={{ width: 200, height: 200 }}
                    />
                  </Paper>

                  {/* 수동 입력 키 */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {t('manualKey')}
                    </Typography>
                    <Grid container spacing={1} alignItems="center" justifyContent="center">
                      <Grid item>
                        <TextField
                          value={manualKey}
                          disabled
                          size="small"
                          sx={{ width: 200 }}
                        />
                      </Grid>
                      <Grid item>
                        <Tooltip title={copied ? '복사됨!' : '복사'}>
                          <IconButton
                            size="small"
                            onClick={handleCopyManualKey}
                            color={copied ? 'success' : 'default'}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      {t('manualKeyDesc')}
                    </Typography>
                  </Box>

                  {/* 다음 단계 */}
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={() => setActiveStep(1)}
                  >
                    다음
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* 2단계: 코드 입력 */}
          {activeStep === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {t('otpEnrollStep2')}
              </Typography>
              <TextField
                fullWidth
                label={t('otpCode')}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                inputProps={{ maxLength: 6 }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {t('codeWarning')}
              </Typography>
            </Box>
          )}

          {/* 완료: 백업 코드 표시 */}
          {activeStep === 2 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                ✓ OTP 등록 완료!
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                아래 백업 코드를 안전한 장소에 저장하세요.
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: '#f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  wordBreak: 'break-all',
                }}
              >
                {backupCodes.map((code, idx) => (
                  <div key={idx}>{code}</div>
                ))}
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleVerifyCode}
            disabled={!code || code.length !== 6 || loading}
          >
            {loading ? '검증 중...' : '확인'}
          </Button>
        )}
        {activeStep === 2 && (
          <>
            <Button
              variant="outlined"
              onClick={handleDownloadBackupCodes}
            >
              다운로드
            </Button>
            <Button
              variant="contained"
              onClick={handleComplete}
            >
              완료
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OTPEnrollModal;
