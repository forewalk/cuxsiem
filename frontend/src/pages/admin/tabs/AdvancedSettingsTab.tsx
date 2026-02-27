import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Stack, Switch,
  FormControlLabel, Divider, Alert, Snackbar, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, TextField, Tooltip
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { advancedSettingsService, type AdvancedSettings } from '../../../services/advancedSettingsService';
import { codeService } from '../../../services/codeService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import useTabStore from '../../../stores/tabStore';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const AdvancedSettingsTab: React.FC = () => {
  const { setMaxTabs } = useTabStore();
  const { updateSettings } = useSettingsStore();
  const [settings, setSettings] = useState<AdvancedSettings>({
    user_register: false,
    allow_multiple_sessions: false,
    tab_count: 10,
    role_names: {
      admin: '관리자',
      user: '사용자',
      monitoring: '모니터링',
      approver: '결재자',
    }
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
      const [settingsData, codesData] = await Promise.all([
        advancedSettingsService.getSettings(),
        codeService.getRoleCodes()
      ]);
      
      setSettings(settingsData);
      // 전역 스토어 동기화
      updateSettings(settingsData);
      
      if (settingsData.tab_count) {
        setMaxTabs(settingsData.tab_count);
      }

      // DB에서 가져온 코드를 상태에 매핑
      if (codesData.length > 0) {
        const roleNames = {
          admin: settings.role_names?.admin || '관리자',
          user: settings.role_names?.user || '사용자',
          monitoring: settings.role_names?.monitoring || '모니터링',
          approver: settings.role_names?.approver || '결재자'
        };
        codesData.forEach(c => {
          if (c.id === 'role-1') roleNames.admin = c.code_name;
          if (c.id === 'role-2') roleNames.monitoring = c.code_name;
          if (c.id === 'role-3') roleNames.approver = c.code_name;
          if (c.id === 'role-4') roleNames.user = c.code_name;
        });
        setSettings(prev => ({ ...prev, ...settingsData, role_names: roleNames }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSnackbar({ open: true, message: t('loadFailed') || '로드 실패', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t, setMaxTabs]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    // 유효성 검사: 역할명이 비어있는지 확인
    if (settings.role_names) {
      const { admin, monitoring, approver, user } = settings.role_names;
      if (!admin?.trim() || !monitoring?.trim() || !approver?.trim() || !user?.trim()) {
        setSnackbar({ 
          open: true, 
          message: t('roleNameRequired') || '모든 역할명은 필수 입력 항목입니다.', 
          severity: 'error' 
        });
        return;
      }
    }

    setSaving(true);
    try {
      // 1. 고급 설정 저장
      const updated = await advancedSettingsService.updateSettings(settings);
      
      // 전역 스토어 업데이트 (다른 탭들이 즉시 반응하도록)
      updateSettings(updated);
      
      // 2. 역할 코드명들 개별 저장
      if (settings.role_names) {
        await Promise.all([
          codeService.updateRoleCode('role-1', settings.role_names.admin),
          codeService.updateRoleCode('role-2', settings.role_names.monitoring),
          codeService.updateRoleCode('role-3', settings.role_names.approver),
          codeService.updateRoleCode('role-4', settings.role_names.user),
        ]);
      }

      setSettings(prev => ({ ...prev, ...updated }));
      if (updated.tab_count) {
        setMaxTabs(updated.tab_count);
      }
      setSnackbar({ open: true, message: t('saveSuccess'), severity: 'success' });
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
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>{t('userSettings')}</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={4}>
              {/* 1. 사용자 신청 활성화 */}
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.user_register}
                    onChange={(e) => handleChange('user_register', e.target.checked)}
                  />
                }
                label={t('userRegistrationActivation')}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allow_multiple_sessions}
                    onChange={(e) => handleChange('allow_multiple_sessions', e.target.checked)}
                  />
                }
                label={t('allowMultipleSessions')}
              />
              
              {/* 2. 사용자 역할명 (라벨 스타일로 변경) */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 500, color: 'text.primary' }}>
                  {t('userRoleNames')}
                </Typography>
                <Stack spacing={2}>
                  <Tooltip title={t('userRoleAdmin')} placement="top-start" arrow>
                    <TextField
                      fullWidth
                      size="small"
                      label="role-1"
                      value={settings.role_names?.admin || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        role_names: { ...settings.role_names!, admin: e.target.value }
                      })}
                    />
                  </Tooltip>
                  <Tooltip title={t('userRoleMonitoring')} placement="top-start" arrow>
                    <TextField
                      fullWidth
                      size="small"
                      label="role-2"
                      value={settings.role_names?.monitoring || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        role_names: { ...settings.role_names!, monitoring: e.target.value }
                      })}
                    />
                  </Tooltip>
                  <Tooltip title={t('userRoleApprover')} placement="top-start" arrow>
                    <TextField
                      fullWidth
                      size="small"
                      label="role-3"
                      value={settings.role_names?.approver || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        role_names: { ...settings.role_names!, approver: e.target.value }
                      })}
                    />
                  </Tooltip>
                  <Tooltip title={t('userRoleUser')} placement="top-start" arrow>
                    <TextField
                      fullWidth
                      size="small"
                      label="role-4"
                      value={settings.role_names?.user || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        role_names: { ...settings.role_names!, user: e.target.value }
                      })}
                    />
                  </Tooltip>
                </Stack>
              </Box>
              
              {/* 3. 탭 설정 (상위 계층 스타일로 변경) */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('tabSettings')}
                </Typography>
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

              {/* 4. 기본값 설정 */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {t('defaultSettings')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                      {t('paginationValue')}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={t('paginationValue')}
                      type="number"
                      value={settings.pagination_size || ''}
                      onChange={(e) => handleChange('pagination_size', Number(e.target.value))}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                      {t('timeFilterValue')}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={t('timeFilterValue')}
                        type="number"
                        value={settings.time_filter_duration || ''}
                        onChange={(e) => handleChange('time_filter_duration', Number(e.target.value))}
                        sx={{ flex: 1, width: '50%' }}
                      />
                      <FormControl size="small" sx={{ flex: 1, width: '50%' }}>
                        <Select
                          value={settings.time_filter_unit || 'm'}
                          onChange={(e) => handleChange('time_filter_unit', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="m">{t('minute')}</MenuItem>
                          <MenuItem value="h">{t('hour')}</MenuItem>
                          <MenuItem value="d">{t('day')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                </Stack>
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