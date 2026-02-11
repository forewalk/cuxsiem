import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
  Stack, Alert, Snackbar, Chip, MenuItem, Switch, FormControlLabel,
  Divider, Grid as Grid, LinearProgress
} from '@mui/material';
import {
  DataGrid, GridToolbar
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  DeleteOutline as DeleteOutlineIcon,
  NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { notificationService } from '@/services/notificationService.ts';
import type { NotificationRule, NotificationRuleCreate, NotificationChannels } from '@/types';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';
import ControlBar from "../../dashboard/components/ControlBar";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const translations: Record<string, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
};

const DEFAULT_CHANNELS: NotificationChannels = {
  webhooks: [],
  slack: [],
  email: []
};

const DEFAULT_FORM_DATA: NotificationRuleCreate = {
  name: '',
  target_index: 'logs-sentinel_one.threats',
  condition_type: 'dsl_query',
  condition_config: { query: { match_all: {} } },
  severity: 'medium',
  interval_min: 5,
  window_min: 5,
  dedup_ttl_min: 30,
  dedup_key_template: '{{rule_id}}',
  channels: DEFAULT_CHANNELS,
  receiver: { type: 'role', values: ['admin'] },
  is_active: true
};

const NotificationRuleListTab: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguageStore();

  // ControlBar states
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState<NotificationRuleCreate>(DEFAULT_FORM_DATA);
  const [dslString, setDslString] = useState(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [language]);

  const handleTimeChange = (
    fVal: number | null,
    fUnit: string,
    tVal: number | null,
    tUnit: string,
    fDate: string | null = null,
    tDate: string | null = null
  ) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
    setFromDate(fDate);
    setToDate(tDate);
  };

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to load notification rules:', error);
      setSnackbar({ open: true, message: t('loadPolicyFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleOpenDialog = (rule: NotificationRule | null = null) => {
    if (rule) {
      setEditingRule(rule);
      const data: NotificationRuleCreate = {
        name: rule.name,
        target_index: rule.target_index,
        condition_type: rule.condition_type,
        condition_config: rule.condition_config,
        severity: rule.severity,
        interval_min: rule.interval_min,
        window_min: rule.window_min,
        dedup_ttl_min: rule.dedup_ttl_min,
        dedup_key_template: rule.dedup_key_template,
        channels: rule.channels || DEFAULT_CHANNELS,
        receiver: rule.receiver || { type: 'role', values: ['admin'] },
        is_active: rule.is_active
      };
      setFormData(data);
      setDslString(JSON.stringify(rule.condition_config, null, 2));
    } else {
      setEditingRule(null);
      setFormData(DEFAULT_FORM_DATA);
      setDslString(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
    }
    setJsonError(null);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingRule(null);
  };

  const handleDslChange = (value: string) => {
    setDslString(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, condition_config: parsed });
      setJsonError(null);
    } catch (e) {
      setJsonError(t('invalidJson'));
    }
  };

  const handleSave = async () => {
    if (jsonError) {
      setSnackbar({ open: true, message: jsonError, severity: 'error' });
      return;
    }

    try {
      if (editingRule) {
        await notificationService.updateRule(editingRule.id, formData);
      } else {
        await notificationService.createRule(formData);
      }
      setSnackbar({ open: true, message: t('ruleSaveSuccess'), severity: 'success' });
      handleCloseDialog();
      loadRules();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : t('saveFailed');
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notificationService.deleteRule(deleteId);
      setSnackbar({ open: true, message: t('ruleDeleteSuccess'), severity: 'success' });
      setDeleteId(null);
      loadRules();
    } catch (error) {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const updateChannel = (type: keyof NotificationChannels, index: number, value: any) => {
    const newChannels = { ...formData.channels };
    newChannels[type][index] = value;
    setFormData({ ...formData, channels: newChannels });
  };

  const addChannel = (type: keyof NotificationChannels) => {
    const newChannels = { ...formData.channels };
    const defaultValue = type === 'slack' ? { channel: '', webhook_url: '' } :
                         type === 'webhooks' ? { url: '', method: 'POST', headers: {} } :
                         { recipients: [], subject_template: '' };
    newChannels[type] = [...newChannels[type], defaultValue as any];
    setFormData({ ...formData, channels: newChannels });
  };

  const removeChannel = (type: keyof NotificationChannels, index: number) => {
    const newChannels = { ...formData.channels };
    newChannels[type] = newChannels[type].filter((_, i) => i !== index);
    setFormData({ ...formData, channels: newChannels });
  };

  const getSeverityChip = (severity: string) => {
    let color: "error" | "warning" | "info" | "success" | "default" = "default";
    let label = severity;

    switch (severity.toLowerCase()) {
      case 'critical': color = "error"; label = t('severityCritical'); break;
      case 'high': color = "warning"; label = t('severityHigh'); break;
      case 'medium': color = "info"; label = t('severityMedium'); break;
      case 'low': color = "success"; label = t('severityLow'); break;
      case 'info': color = "default"; label = t('severityInfo'); break;
    }

    return <Chip label={label} color={color} size="small" variant="outlined" />;
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: t('ruleName'), flex: 1.5 },
    {
      field: 'severity',
      headerName: t('severity'),
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => getSeverityChip(params.value as string)
    },
    {
      field: 'interval_min',
      headerName: t('interval'),
      flex: 0.7,
      valueFormatter: (value) => `${value}${t('unit_m')}`
    },
    {
      field: 'is_active',
      headerName: t('status'),
      flex: 0.7,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ color: params.value ? 'success.main' : 'text.disabled', fontWeight: 'bold' }}>
          {params.value ? t('active') : t('inactive')}
        </Box>
      )
    },
    {
      field: 'last_triggered_at',
      headerName: t('lastTriggered'),
      flex: 1.2,
      valueFormatter: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      field: 'actions',
      headerName: t('actions'),
      flex: 0.8,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row as NotificationRule)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    },
  ];

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

      <ControlBar
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={() => loadRules()}
      />

      <Paper elevation={1} sx={{ p: 3, height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('notificationRuleList')}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              {t('addRule')}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flexGrow: 1, width: '100%' }}>
          <DataGrid
            rows={filteredRules}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
            }}
          />
        </Box>
      </Paper>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('deleteRule')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmDeleteRule')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteId(null)} sx={{ color: 'text.primary', borderColor: 'divider' }}>
            {t('cancel')}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t('deleteRule')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingRule ? t('editRule') : t('addRule')}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* 기본 정보 섹션 */}
            <Grid size={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>기본 정보</Typography>
              <Stack spacing={2}>
                <TextField
                  label={t('ruleName')}
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  size="small"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('targetIndex')}
                    fullWidth
                    value={formData.target_index}
                    onChange={(e) => setFormData({ ...formData, target_index: e.target.value })}
                    size="small"
                  />
                  <TextField
                    select
                    label={t('severity')}
                    sx={{ minWidth: 150 }}
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="critical">{t('severityCritical')}</MenuItem>
                    <MenuItem value="high">{t('severityHigh')}</MenuItem>
                    <MenuItem value="medium">{t('severityMedium')}</MenuItem>
                    <MenuItem value="low">{t('severityLow')}</MenuItem>
                    <MenuItem value="info">{t('severityInfo')}</MenuItem>
                  </TextField>
                </Stack>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label={t('status')}
                />
              </Stack>
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* 탐지 설정 섹션 */}
            <Grid size={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>탐지 설정</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label={t('intervalMin')}
                  type="number"
                  fullWidth
                  value={formData.interval_min}
                  onChange={(e) => setFormData({ ...formData, interval_min: parseInt(e.target.value) })}
                  size="small"
                />
                <TextField
                  label={t('windowMin')}
                  type="number"
                  fullWidth
                  value={formData.window_min}
                  onChange={(e) => setFormData({ ...formData, window_min: parseInt(e.target.value) })}
                  size="small"
                />
              </Stack>
              <TextField
                label={t('conditionConfig')}
                multiline
                rows={8}
                fullWidth
                value={dslString}
                onChange={(e) => handleDslChange(e.target.value)}
                error={!!jsonError}
                helperText={jsonError}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
              />
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* 알림 채널 섹션 */}
            <Grid size={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('channels')}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => addChannel('slack')}>+ Slack</Button>
                  <Button size="small" variant="outlined" onClick={() => addChannel('webhooks')}>+ Webhook</Button>
                  <Button size="small" variant="outlined" onClick={() => addChannel('email')}>+ Email</Button>
                </Stack>
              </Stack>

              {/* Slack 리스트 */}
              {formData.channels.slack.map((config, idx) => (
                <Stack key={`slack-${idx}`} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                  <TextField label={t('slackChannel')} size="small" value={config.channel} sx={{ width: '30%' }}
                    onChange={(e) => updateChannel('slack', idx, { ...config, channel: e.target.value })} />
                  <TextField label={t('webhookUrl')} size="small" value={config.webhook_url} sx={{ flexGrow: 1 }}
                    onChange={(e) => updateChannel('slack', idx, { ...config, webhook_url: e.target.value })} />
                  <IconButton color="error" onClick={() => removeChannel('slack', idx)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              ))}

              {/* Webhook 리스트 */}
              {formData.channels.webhooks.map((config, idx) => (
                <Stack key={`webhook-${idx}`} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                  <TextField label={t('webhookUrl')} size="small" value={config.url} sx={{ flexGrow: 1 }}
                    onChange={(e) => updateChannel('webhooks', idx, { ...config, url: e.target.value })} />
                  <TextField select label="Method" size="small" value={config.method} sx={{ width: 120 }}
                    onChange={(e) => updateChannel('webhooks', idx, { ...config, method: e.target.value })}>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                  </TextField>
                  <IconButton color="error" onClick={() => removeChannel('webhooks', idx)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              ))}

              {/* Email 리스트 */}
              {formData.channels.email.map((config, idx) => (
                <Stack key={`email-${idx}`} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                  <TextField label={t('emailRecipients')} size="small" placeholder="콤마(,)로 구분" sx={{ flexGrow: 1 }}
                    value={config.recipients.join(', ')}
                    onChange={(e) => updateChannel('email', idx, { ...config, recipients: e.target.value.split(',').map(s => s.trim()) })} />
                  <IconButton color="error" onClick={() => removeChannel('email', idx)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={handleCloseDialog} sx={{ color: 'text.primary', borderColor: 'divider' }}>
            {t('cancel')}
          </Button>
          <Button variant="contained" color="secondary" onClick={handleSave} disabled={!!jsonError}>
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 메시지 */}
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

export default NotificationRuleListTab;
