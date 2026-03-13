import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  Box, Typography, Button, Paper, Stack, Switch,
  FormControlLabel, Divider, Alert, Snackbar, CircularProgress,
  Select, MenuItem, FormControl, TextField, Tooltip
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { advancedSettingsService, type AdvancedSettings } from '../../../services/advancedSettingsService';
import { codeService } from '../../../services/codeService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useRoleCodesStore } from '../../../stores/useRoleCodesStore';
import useTabStore from '../../../stores/tabStore';
import { useAuth } from '../../../hooks/useAuth';

// i18n — useState 초기값 전용 동기 함수 (훅 호출 이전에 사용)
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const allTranslations: Record<string, Record<string, string>> = {
  ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages,
};
function tInit(key: string): string {
  const lang = localStorage.getItem("appLanguage") || "ko";
  return allTranslations[lang]?.[key] ?? allTranslations["ko"]?.[key] ?? key;
}

const AdvancedSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { setMaxTabs } = useTabStore();
  const { updateSettings } = useSettingsStore();
  const { fetch: fetchRoleCodes } = useRoleCodesStore();

  const isAdmin = user?.role === 'role-1';

  const [settings, setSettings] = useState<AdvancedSettings>({
    user_register: false,
    allow_multiple_sessions: false,
    tab_count: 10,
    role_names: {
      admin: tInit('roleDefault1'),
      user: tInit('roleDefault4'),
      monitoring: tInit('roleDefault2'),
      approver: tInit('roleDefault3'),
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nerdUnlocked, setNerdUnlocked] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadSettings = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // 1. 기본 설정 데이터 로드
      const settingsData = await advancedSettingsService.getSettings();
      
      // 기존 state(특히 role_names)를 유지하면서 백엔드 데이터를 병합
      setSettings(prev => ({
        ...prev,
        ...settingsData,
        // settingsData에 role_names가 없으면 이전 값 유지
        role_names: prev.role_names 
      }));
      
      updateSettings(settingsData);
      
      if (settingsData.tab_count) {
        setMaxTabs(settingsData.tab_count);
      }

      // 2. 관리자인 경우에만 역할명(코드) 데이터 로드
      if (isAdmin) {
        try {
          const codesData = await codeService.getRoleCodes();
          if (codesData && codesData.length > 0) {
            const newRoleNames = {
              admin: settingsData.role_names?.admin || t('roleDefault1'),
              user: settingsData.role_names?.user || t('roleDefault4'),
              monitoring: settingsData.role_names?.monitoring || t('roleDefault2'),
              approver: settingsData.role_names?.approver || t('roleDefault3'),
            };
            codesData.forEach(c => {
              if (c.id === 'role-1') newRoleNames.admin = c.code_name;
              if (c.id === 'role-2') newRoleNames.monitoring = c.code_name;
              if (c.id === 'role-3') newRoleNames.approver = c.code_name;
              if (c.id === 'role-4') newRoleNames.user = c.code_name;
            });
            setSettings(prev => ({ ...prev, role_names: newRoleNames }));
          }
        } catch (codeError) {
          console.error('Failed to load role codes:', codeError);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSnackbar({ open: true, message: t('loadFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, t, setMaxTabs, updateSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // App.tsx에서 픽셀 모드 해제 시 스위치 UI 동기화
  useEffect(() => {
    const handler = (e: Event) => {
      const { pixelMode: newMode } = (e as CustomEvent).detail;
      setSettings(prev => ({ ...prev, pixel_mode: newMode }));
    };
    window.addEventListener('pixelModeChanged', handler);
    return () => window.removeEventListener('pixelModeChanged', handler);
  }, []);

  // "pixel?" 키워드 언락
  useEffect(() => {
    const codes = ['KeyP', 'KeyI', 'KeyX', 'KeyE', 'KeyL', 'Slash'];
    let step = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const matched = step === 5
        ? (e.code === 'Slash' && e.shiftKey)
        : e.code === codes[step];
      if (matched) {
        step++;
        if (step === codes.length) { setNerdUnlocked(true); step = 0; }
      } else {
        step = e.code === codes[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = async () => {
    if (isAdmin && settings.role_names) {
      const { admin, monitoring, approver, user: rUser } = settings.role_names;
      if (!admin?.trim() || !monitoring?.trim() || !approver?.trim() || !rUser?.trim()) {
        setSnackbar({ open: true, message: t('roleNameRequired'), severity: 'error' });
        return;
      }
    }

    const logSize = settings.log_stream_size ?? 1000;
    const logRefresh = settings.log_stream_refresh ?? 10;
    if (logSize < 100 || logSize > 10000) {
      setSnackbar({ open: true, message: t('logStreamSizeError'), severity: 'error' });
      return;
    }
    if (logRefresh < 5 || logRefresh > 60) {
      setSnackbar({ open: true, message: t('logStreamRefreshError'), severity: 'error' });
      return;
    }

    const sessionDur = settings.session_duration ?? 30;
    if (sessionDur < 1 || sessionDur > 1440) {
      setSnackbar({ open: true, message: t('sessionDurationError'), severity: 'error' });
      return;
    }

    const idleTimeout = settings.session_idle_timeout ?? 0;
    if (idleTimeout < 0 || idleTimeout > 1440) {
      setSnackbar({ open: true, message: t('sessionIdleTimeoutError'), severity: 'error' });
      return;
    }

    const paginationSz = settings.pagination_size ?? 10;
    if (paginationSz < 10 || paginationSz > 500) {
      setSnackbar({ open: true, message: t('paginationSizeError'), severity: 'error' });
      return;
    }

    const timeFilterVal = settings.time_filter_duration ?? 15;
    if (timeFilterVal < 1 || timeFilterVal > 100) {
      setSnackbar({ open: true, message: t('timeFilterDurationError'), severity: 'error' });
      return;
    }

    const tabCnt = settings.tab_count;
    if (tabCnt === undefined || isNaN(Number(tabCnt)) || Number(tabCnt) < 1 || Number(tabCnt) > 10) {
      setSnackbar({ open: true, message: t('tabCountError'), severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const updated = await advancedSettingsService.updateSettings(settings);
      updateSettings(updated);
      
      if (isAdmin && settings.role_names) {
        await Promise.all([
          codeService.updateRoleCode('role-1', settings.role_names.admin),
          codeService.updateRoleCode('role-2', settings.role_names.monitoring),
          codeService.updateRoleCode('role-3', settings.role_names.approver),
          codeService.updateRoleCode('role-4', settings.role_names.user),
        ]);
        fetchRoleCodes();
      }

      setSettings(prev => ({ ...prev, ...updated }));
      if (updated.tab_count) {
        setMaxTabs(updated.tab_count);
      }
      setSnackbar({ open: true, message: t('saveSuccess'), severity: 'success' });
      window.dispatchEvent(new CustomEvent('pixelModeChanged', { detail: { pixelMode: updated.pixel_mode || false } }));
    } catch (error) {
      console.error('Failed to save settings:', error);
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
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('advancedSettings')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadSettings} disabled={saving}>
            {t('refresh')}
          </Button>
          <Button variant="contained" color="secondary" startIcon={<SaveIcon />} onClick={handleSave}>
            {saving ? <CircularProgress size={24} color="inherit" /> : t('save')}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={3}>
        {isAdmin && (
          <Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('userSettings')}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={4}>
                <FormControlLabel
                  control={<Switch checked={settings.user_register} onChange={(e) => handleChange('user_register', e.target.checked)} />}
                  label={t('userRegistrationActivation')}
                />
                <FormControlLabel
                  control={<Switch checked={settings.otp_required || false} onChange={(e) => handleChange('otp_required', e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2">{t('otpRequired')}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('otpRequiredDesc')}</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Switch checked={settings.allow_multiple_sessions} onChange={(e) => handleChange('allow_multiple_sessions', e.target.checked)} />}
                  label={t('allowMultipleSessions')}
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('sessionDuration')}</Typography>
                  <TextField fullWidth size="small" type="number" value={settings.session_duration ?? 30} onChange={(e) => handleChange('session_duration', Number(e.target.value))} helperText={t('sessionDurationDesc')} inputProps={{ min: 1, max: 1440 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('sessionIdleTimeout')}</Typography>
                  <TextField fullWidth size="small" type="number" value={settings.session_idle_timeout ?? 0} onChange={(e) => handleChange('session_idle_timeout', Number(e.target.value))} helperText={t('sessionIdleTimeoutDesc')} inputProps={{ min: 0, max: 1440 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 500 }}>{t('userRoleNames')}</Typography>
                  <Stack spacing={2}>
                    <Tooltip title={t('userRoleAdmin')} placement="top-start" arrow>
                      <TextField fullWidth size="small" label="role-1" value={settings.role_names?.admin || ''} onChange={(e) => setSettings({ ...settings, role_names: { ...settings.role_names!, admin: e.target.value } })} />
                    </Tooltip>
                    <Tooltip title={t('userRoleMonitoring')} placement="top-start" arrow>
                      <TextField fullWidth size="small" label="role-2" value={settings.role_names?.monitoring || ''} onChange={(e) => setSettings({ ...settings, role_names: { ...settings.role_names!, monitoring: e.target.value } })} />
                    </Tooltip>
                    <Tooltip title={t('userRoleApprover')} placement="top-start" arrow>
                      <TextField fullWidth size="small" label="role-3" value={settings.role_names?.approver || ''} onChange={(e) => setSettings({ ...settings, role_names: { ...settings.role_names!, approver: e.target.value } })} />
                    </Tooltip>
                    <Tooltip title={t('userRoleUser')} placement="top-start" arrow>
                      <TextField fullWidth size="small" label="role-4" value={settings.role_names?.user || ''} onChange={(e) => setSettings({ ...settings, role_names: { ...settings.role_names!, user: e.target.value } })} />
                    </Tooltip>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}

        <Box>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('tabSettings')}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('tabCount')}</Typography>
                <TextField fullWidth size="small" type="number" value={settings.tab_count ?? ''} placeholder={t('tabCount')} onChange={(e) => handleChange('tab_count', e.target.value === '' ? '' : Number(e.target.value))} helperText={t('tabCountDesc')} inputProps={{ min: 1, max: 10 }} />
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('defaultSettings')}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('paginationValue')}</Typography>
                    <TextField fullWidth size="small" type="number" value={settings.pagination_size || ''} onChange={(e) => handleChange('pagination_size', Number(e.target.value))} helperText={t('paginationValueDesc')} inputProps={{ min: 10, max: 500 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('timeFilterValue')}</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField fullWidth size="small" type="number" value={settings.time_filter_duration || ''} onChange={(e) => handleChange('time_filter_duration', Number(e.target.value))} helperText={t('timeFilterDurationDesc')} inputProps={{ min: 1, max: 100 }} sx={{ flex: 1 }} />
                      <FormControl size="small" sx={{ flex: 1 }}>
                        <Select value={settings.time_filter_unit || 'm'} onChange={(e) => handleChange('time_filter_unit', e.target.value)}>
                          <MenuItem value="m">{t('minute')}</MenuItem>
                          <MenuItem value="h">{t('hour')}</MenuItem>
                          <MenuItem value="d">{t('day')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('logStreamSettings')}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('logStreamSize')}</Typography>
                    <TextField fullWidth size="small" type="number" value={settings.log_stream_size ?? 1000} onChange={(e) => handleChange('log_stream_size', Number(e.target.value))} helperText={t('logStreamSizeDesc')} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>{t('logStreamRefresh')}</Typography>
                    <TextField fullWidth size="small" type="number" value={settings.log_stream_refresh ?? 10} onChange={(e) => handleChange('log_stream_refresh', Number(e.target.value))} helperText={t('logStreamRefreshDesc')} />
                  </Box>
                </Stack>
              </Box>

              {(nerdUnlocked || settings.pixel_mode) && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('nerdSettings')}</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormControlLabel
                    control={<Switch checked={settings.pixel_mode || false} onChange={(e) => handleChange('pixel_mode', e.target.checked)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2">{t('pixelMode')}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('pixelModeDesc')}</Typography>
                      </Box>
                    }
                  />
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>
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
