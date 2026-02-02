import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Stack, TextField, Switch,
  FormControlLabel, Divider, Alert, Snackbar, CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { passwordPolicyService } from '../../../services/passwordPolicyService';
import type { PasswordPolicy } from '../../../services/passwordPolicyService';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const PasswordPolicyTab: React.FC = () => {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // i18n
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = useCallback((key: string): string => {
    const currentTranslations = translations[savedLanguage] || translations["ko"] || {};
    return currentTranslations[key] || key;
  }, [savedLanguage]);

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const data = await passwordPolicyService.getPolicy();
      setPolicy(data);
    } catch (error) {
      console.error('Failed to load password policy:', error);
      setSnackbar({ open: true, message: t('loadPolicyFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const updated = await passwordPolicyService.updatePolicy(policy);
      setPolicy(updated);
      setSnackbar({ open: true, message: t('saveSuccess'), severity: 'success' });
    } catch (error) {
      console.error('Failed to save password policy:', error);
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PasswordPolicy, value: any) => {
    if (!policy) return;
    setPolicy({ ...policy, [field]: value });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('passwordPolicy')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPolicy}
            disabled={saving}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : t('save')}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* 복잡성 규칙 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>{t('complexityRules')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <TextField
                label={t('minLength')}
                type="number"
                size="small"
                value={policy?.min_length || 8}
                onChange={(e) => handleChange('min_length', parseInt(e.target.value))}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={policy?.require_uppercase || false}
                    onChange={(e) => handleChange('require_uppercase', e.target.checked)}
                  />
                }
                label={t('requireUppercase')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={policy?.require_lowercase || false}
                    onChange={(e) => handleChange('require_lowercase', e.target.checked)}
                  />
                }
                label={t('requireLowercase')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={policy?.require_numbers || false}
                    onChange={(e) => handleChange('require_numbers', e.target.checked)}
                  />
                }
                label={t('requireNumbers')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={policy?.require_special_chars || false}
                    onChange={(e) => handleChange('require_special_chars', e.target.checked)}
                  />
                }
                label={t('requireSpecialChars')}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* 만료 및 이력 */}
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>{t('expirationSecurity')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={3}>
              <TextField
                label={t('maxPasswordAge')}
                type="number"
                size="small"
                value={policy?.max_password_age_days || 90}
                onChange={(e) => handleChange('max_password_age_days', parseInt(e.target.value))}
                helperText={t('passwordAgeHelper')}
                fullWidth
              />
              <TextField
                label={t('passwordHistory')}
                type="number"
                size="small"
                value={policy?.password_history_count || 3}
                onChange={(e) => handleChange('password_history_count', parseInt(e.target.value))}
                helperText={t('passwordHistoryHelper')}
                fullWidth
              />
              <TextField
                label={t('lockoutThreshold')}
                type="number"
                size="small"
                value={policy?.lockout_threshold || 5}
                onChange={(e) => handleChange('lockout_threshold', parseInt(e.target.value))}
                helperText={t('lockoutThresholdHelper')}
                fullWidth
              />
              <TextField
                label={t('lockoutDuration')}
                type="number"
                size="small"
                value={policy?.lockout_duration_minutes || 30}
                onChange={(e) => handleChange('lockout_duration_minutes', parseInt(e.target.value))}
                fullWidth
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PasswordPolicyTab;
