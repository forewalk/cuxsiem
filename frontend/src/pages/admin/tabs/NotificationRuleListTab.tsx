import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
  Stack, Alert, Snackbar, Chip
} from '@mui/material';
import {
  DataGrid, GridToolbar
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, Search as SearchIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { notificationService, type NotificationRule } from '@/services/notificationService.ts';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const NotificationRuleListTab: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { language } = useLanguageStore();

  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // i18n 지원
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

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
    setEditingRule(rule);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingRule(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notificationService.deleteRule(deleteId);
      setSnackbar({ open: true, message: t('deleteSuccess'), severity: 'success' });
      setDeleteId(null);
      loadRules();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const getSeverityChip = (severity: string) => {
    let color: "error" | "warning" | "info" | "success" | "default" = "default";
    let label = severity;

    switch (severity.toLowerCase()) {
      case 'critical':
        color = "error";
        label = t('severityCritical');
        break;
      case 'high':
        color = "warning";
        label = t('severityHigh');
        break;
      case 'medium':
        color = "info";
        label = t('severityMedium');
        break;
      case 'low':
        color = "success";
        label = t('severityLow');
        break;
      case 'info':
        color = "default";
        label = t('severityInfo');
        break;
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
    rule.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: '100%', width: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('notificationRuleList')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadRules()}
            sx={{ borderColor: 'divider', color: 'text.primary' }}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('addRule')}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          size="small"
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} fontSize="small" />,
          }}
          sx={{ width: 300 }}
        />
      </Paper>

      <Paper sx={{ flexGrow: 1, width: '100%' }}>
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

      {/* 준비 중 다이얼로그 (생성/수정) */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? t('editRule') : t('addRule')}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography>{t('notImplemented')}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseDialog} sx={{ color: 'text.primary', borderColor: 'divider' }}>
            {t('close')}
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
