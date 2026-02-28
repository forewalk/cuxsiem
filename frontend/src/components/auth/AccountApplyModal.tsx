import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, Stack, Typography, Alert, InputAdornment,
  Box, List, ListItem, ListItemIcon, ListItemText, IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import { passwordPolicyService } from '../../services/passwordPolicyService';
import type { PasswordPolicy } from '../../services/passwordPolicyService';
import type { UserApply } from '../../types';

// i18n
import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";
import cnMessages from "../../locales/cn.json";

interface AccountApplyModalProps {
  open: boolean;
  onClose: () => void;
}

const AccountApplyModal: React.FC<AccountApplyModalProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState<UserApply>({
    username: '',
    email: '',
    name: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCheckResult, setIdCheckResult] = useState<boolean | null>(null);
  const [idChecking, setIdChecking] = useState(false);

  // i18n
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
  };

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const currentTranslations = (translations && translations[savedLanguage]) || (translations && translations["ko"]) || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [savedLanguage]);

  // 정책 로드
  useEffect(() => {
    if (open) {
      passwordPolicyService.getPolicy()
        .then(setPolicy)
        .catch(err => console.error("Failed to load password policy:", err));
    }
  }, [open]);

  const handleIdBlur = useCallback(async () => {
    const username = formData.username.trim();
    if (!username) {
      setIdCheckResult(null);
      return;
    }
    setIdChecking(true);
    try {
      const available = await authService.checkId(username);
      setIdCheckResult(available);
    } catch {
      setIdCheckResult(null);
    } finally {
      setIdChecking(false);
    }
  }, [formData.username]);

  // 비밀번호 검증 로직 (useMemo로 실시간 반응성 확보)
  const requirements = useMemo(() => {
    if (!policy) return [];

    const pwd = formData.password;
    const reqs = [
      { 
        label: t('minLength') + `: ${policy.min_length}`, 
        met: pwd.length >= policy.min_length,
        show: true // 길이는 항상 표시
      },
      { 
        label: t('requireUppercase'), 
        met: /[A-Z]/.test(pwd),
        show: policy.require_uppercase
      },
      { 
        label: t('requireLowercase'), 
        met: /[a-z]/.test(pwd),
        show: policy.require_lowercase
      },
      { 
        label: t('requireNumbers'), 
        met: /[0-9]/.test(pwd),
        show: policy.require_numbers
      },
      { 
        label: t('requireSpecialChars'), 
        met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
        show: policy.require_special_chars
      },
    ];

    return reqs.filter(r => r.show);
  }, [policy, formData.password, t]);

  const allMet = requirements.length > 0 && requirements.every(r => r.met);
  const passwordsMatch = formData.password === confirmPassword;
  const isFormValid = formData.username && formData.email && formData.name && allMet && passwordsMatch && confirmPassword && idCheckResult === true;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    // 이메일 형식 추가 검증 (@ 포함 여부)
    if (!formData.email.includes('@')) {
      setError(t('emailFormatError'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.applyAccount(formData);
      alert(t('applySuccess'));
      handleClose();
    } catch (err: any) {
      console.error("Account application failed:", err);
      let detail = err.response?.data?.detail || t('saveFailed');
      
      // detail이 객체이거나 배열인 경우 문자열로 변환
      if (typeof detail === 'object') {
          if (Array.isArray(detail)) {
              // Pydantic의 이메일 에러인 경우 한글 메시지로 치환
              const hasEmailError = detail.some((e: any) => e.loc?.includes('email') || e.type?.includes('email'));
              if (hasEmailError) {
                detail = t('emailFormatError');
              } else {
                detail = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
              }
          } else {
              detail = JSON.stringify(detail);
          }
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ username: '', email: '', name: '', password: '' });
    setConfirmPassword('');
    setError(null);
    setIdCheckResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{t('applyAccount')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('id')}
            fullWidth
            required
            value={formData.username}
            onChange={(e) => {
              setFormData({ ...formData, username: e.target.value });
              setIdCheckResult(null);
            }}
            onBlur={handleIdBlur}
            placeholder="4자 이상"
            error={idCheckResult === false}
            helperText={
              idChecking ? '...' :
              idCheckResult === true ? t('idAvailable') :
              idCheckResult === false ? t('idUnavailable') : ''
            }
            FormHelperTextProps={{
              sx: { color: idCheckResult === true ? 'success.main' : undefined }
            }}
          />
          <TextField
            label={t('email')}
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            label={t('name')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label={t('password')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {/* 비밀번호 정책 실시간 표시 */}
          {formData.password && (
            <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ fontWeight: 'bold', mb: 1 }}>
                {t('complexityRules')}
              </Typography>
              {!policy ? (
                <Typography variant="caption" color="text.disabled">
                  Loading policy...
                </Typography>
              ) : (
                <List disablePadding>
                  {requirements.map((req, idx) => (
                    <ListItem key={idx} disablePadding sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        {req.met ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={req.label} 
                        primaryTypographyProps={{ 
                          variant: 'caption', 
                          color: req.met ? 'success.main' : 'error.main',
                          fontWeight: req.met ? 'normal' : '600'
                        }} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          <TextField
            label={t('confirmPassword')}
            type="password"
            fullWidth
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword !== '' && !passwordsMatch}
            helperText={confirmPassword !== '' && !passwordsMatch ? t('passwordMismatch') : ''}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button variant="outlined" onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={handleSubmit} 
          disabled={!isFormValid || loading}
          sx={{ minWidth: 80 }}
        >
          {loading ? t('save') + '...' : t('request')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountApplyModal;