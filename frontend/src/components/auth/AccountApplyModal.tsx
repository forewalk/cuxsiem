import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, Stack, Typography, Alert, InputAdornment,
  Box, List, ListItem, ListItemIcon, ListItemText,
  IconButton
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import { passwordPolicyService } from '../../services/passwordPolicyService';
import type { PasswordPolicy } from '../../services/passwordPolicyService';
import type { UserApply } from '../../types';

// i18n
import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";

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

  // i18n
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
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

  // 비밀번호 검증 로직
  const checkPolicy = () => {
    if (!policy) return { allMet: true, requirements: [] };

    const pwd = formData.password;
    const requirements = [
      { label: t('minLength') + `: ${policy.min_length}`, met: pwd.length >= policy.min_length },
      { label: t('requireUppercase'), met: !policy.require_uppercase || /[A-Z]/.test(pwd) },
      { label: t('requireLowercase'), met: !policy.require_lowercase || /[a-z]/.test(pwd) },
      { label: t('requireNumbers'), met: !policy.require_numbers || /[0-9]/.test(pwd) },
      { label: t('requireSpecialChars'), met: !policy.require_special_chars || /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
    ];

    const allMet = requirements.every(r => r.met);
    return { allMet, requirements };
  };

  const { allMet, requirements } = checkPolicy();
  const passwordsMatch = formData.password === confirmPassword;
  const isFormValid = formData.username && formData.email && formData.name && allMet && passwordsMatch && confirmPassword;

  const handleSubmit = async () => {
    if (!isFormValid) return;

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
              detail = detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
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
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="4자 이상"
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
            <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                {t('complexityRules')}
              </Typography>
              <List disablePadding>
                {requirements.map((req, idx) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.2 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {req.met ? (
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      ) : (
                        <ErrorOutlineIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={req.label} 
                      primaryTypographyProps={{ 
                        variant: 'caption', 
                        color: req.met ? 'success.main' : 'text.secondary' 
                      }} 
                    />
                  </ListItem>
                ))}
              </List>
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
          {loading ? t('save') + '...' : t('apply')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountApplyModal;
