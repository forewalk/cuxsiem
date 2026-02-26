import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Stack, Switch,
  FormControlLabel, Divider, Alert, Snackbar, CircularProgress,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { advancedSettingsService, type AdvancedSettings } from '../../../services/advancedSettingsService';
import useTabStore from '../../../stores/tabStore';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const AdvancedSettingsTab: React.FC = () => {
  const { setMaxTabs } = useTabStore();
  const [settings, setSettings] = useState<AdvancedSettings>({
    user_register: false,
    tab_count: 10,
  });
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
    cn: cnMessages,
  };

  const t = useCallback((key: string): string => {
    const currentTranslations = translations[savedLanguage] || translations["ko"] || {};
    return currentTranslations[key] || key;
  }, [savedLanguage]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await advancedSettingsService.getSettings();
      setSettings(data);
      if (data.tab_count) {
        setMaxTabs(data.tab_count);
      }
    } catch (error) {
      console.error('Failed to load advanced settings:', error);
      setSnackbar({ open: true, message: t('loadFailed') || '로드 실패', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await advancedSettingsService.updateSettings(settings);
      setSettings(updated);
      if (updated.tab_count) {
        setMaxTabs(updated.tab_count);
      }
      setSnackbar({ open: true, message: t('saveSuccess'), severity: 'success' });
    } catch (error) {
      console.error('Failed to save advanced settings:', error);
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AdvancedSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('advancedSettings')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* 사용자 설정 */}
        <Box flex={1}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>{t('userSettings')}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.user_register}
                    onChange={(e) => handleChange('user_register', e.target.checked)}
                  />
                }
                label={t('userRegistrationActivation')}
              />
              
              <Divider />
              
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>{t('tabSettings')}</Typography>
                <Divider sx={{ mb: 2 }} />
                <FormControl fullWidth size="small">
                  <InputLabel id="tab-count-select-label">{t('tabCount')}</InputLabel>
                  <Select
                    labelId="tab-count-select-label"
                    id="tab-count-select"
                    value={settings.tab_count || 10}
                    label={t('tabCount')}
                    onChange={(e) => handleChange('tab_count', Number(e.target.value))}
                  >
                    {[...Array(10)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Paper>
        </Box>

        {/* 오른쪽 빈 공간 (레이아웃 균형 유지용) */}
        <Box flex={1} />
      </Stack>

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

export default AdvancedSettingsTab;
