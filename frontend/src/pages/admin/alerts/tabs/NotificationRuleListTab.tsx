import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
  Stack, Alert, Snackbar, Chip, MenuItem, Switch, FormControlLabel,
  Divider, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Grid, TableSortLabel
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon,
  NotificationsActive as NotificationsActiveIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { notificationService } from '@/services/notificationService.ts';
import type { NotificationRule, NotificationRuleCreate } from '@/types';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';
import AlertsControlBar from "../components/AlertsControlBar";
import { SeverityChip } from '@/pages/admin/alerts/components/SeverityChip';
import { AlertTableFilterMenu } from '../components/AlertTableFilterMenu';
import { ALERT_TABLE_STYLES, formatDateTime, SEVERITY_OPTIONS, ACTIVE_STATUS_OPTIONS } from '../components/AlertTableStyles';

// i18n
import koMessages from "../../../../locales/ko.json";
import enMessages from "../../../../locales/en.json";
import jaMessages from "../../../../locales/ja.json";
import cnMessages from "../../../../locales/cn.json";

const translations: Record<string, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  cn: cnMessages,
};

const DEFAULT_FORM_DATA: NotificationRuleCreate = {
  name: '',
  description: '',
  target_index: 'logs-sentinel_one.threats',
  condition_config: { query: { match_all: {} } },
  message_template: '위협 탐지: {{total}} 건의 이벤트가 발생했습니다.',
  severity: 'info',
  interval_min: 1,
  window_min: 1,
  dedup_key_template: '{{rule_id}}_{{_id}}',
  receiver: { type: 'role', values: [] },
  is_active: true
};

const NotificationRuleListTab: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguageStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);

  // 정렬 상태
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // 시간 범위 상태
  const [fromValue, setFromValue] = useState<number | null>(null);
  const [fromUnit, setFromUnit] = useState<string>("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState<string>("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NotificationRuleCreate>(DEFAULT_FORM_DATA);
  const [dslString, setDslString] = useState(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // 탐지 조건 검증 상태
  const [windowIntervalError, setWindowIntervalError] = useState<string | null>(null);

  // 필터 메뉴 상태
  const [severityAnchor, setSeverityAnchor] = useState<null | HTMLElement>(null);
  const [activeAnchor, setActiveAnchor] = useState<null | HTMLElement>(null);

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

  // 시간 범위를 ISO 날짜로 변환
  const calculateTimeRange = useCallback(() => {
    const now = dayjs();
    let from_date: string | undefined;
    let to_date: string | undefined;

    // fromDate가 있으면 절대 시간 사용
    if (fromDate) {
      from_date = fromDate;
    } else if (fromValue !== null) {
      // 상대 시간 계산
      const fromMoment = now.subtract(fromValue, fromUnit as dayjs.ManipulateType);
      from_date = fromMoment.toISOString();
    }

    // toDate가 있으면 절대 시간 사용, 없으면 현재 시간
    if (toDate) {
      to_date = toDate;
    } else if (toValue !== null) {
      const toMoment = now.subtract(toValue, toUnit as dayjs.ManipulateType);
      to_date = toMoment.toISOString();
    } else {
      to_date = now.toISOString();
    }

    return { from_date, to_date };
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const { from_date, to_date } = calculateTimeRange();

      // 서버 사이드 필터링 파라미터 구성
      const params: {
        skip: number;
        limit: number;
        sort_by: string;
        order: string;
        query?: string;
        severities?: string;
        is_active?: boolean;
        from_date?: string;
        to_date?: string;
      } = {
        skip,
        limit: rowsPerPage,
        sort_by: sortBy,
        order,
        from_date,
        to_date
      };

      if (searchQuery) {
        params.query = searchQuery;
      }

      if (selectedSeverities.length > 0) {
        params.severities = selectedSeverities.join(',');
      }

      if (activeFilter !== null) {
        params.is_active = activeFilter;
      }

      const data = await notificationService.getRules(params);
      setRules(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, selectedSeverities, activeFilter, sortBy, order, calculateTimeRange]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // 탐지 조건 검증 (window_min과 interval_min 관계)
  useEffect(() => {
    const { window_min, interval_min } = formData;
    
    // Hard Barrier: window_min < interval_min
    if (window_min < interval_min) {
      setWindowIntervalError(
        t('windowIntervalError') || 
        '탐지 데이터 조회범위(window_min)는 탐지 주기(interval_min)보다 크거나 같아야 합니다.'
      );
      return;
    }
    
    setWindowIntervalError(null);
  }, [formData.window_min, formData.interval_min, t]);

  const handleOpenDialog = (rule: NotificationRule | null = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({ ...rule });
      setDslString(JSON.stringify(rule.condition_config, null, 2));
    } else {
      setEditingRule(null);
      setFormData(DEFAULT_FORM_DATA);
      setDslString(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
    }
    setJsonError(null);
    setWindowIntervalError(null);
    setOpen(true);
  };

  const handleCloseDialog = () => { setOpen(false); setEditingRule(null); };

  const handleDslChange = (value: string) => {
    setDslString(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, condition_config: parsed });
      setJsonError(null);
    } catch { setJsonError(t('invalidJson')); }
  };

  const handleSave = async () => {
    try {
      if (editingRule) await notificationService.updateRule(editingRule.id, formData);
      else await notificationService.createRule(formData);
      setSnackbar({ open: true, message: t('ruleSaveSuccess'), severity: 'success' });
      handleCloseDialog();
      loadRules();
    } catch  {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notificationService.deleteRule(deleteId);
      setSnackbar({ open: true, message: t('ruleDeleteSuccess'), severity: 'success' });
      setDeleteId(null);
      loadRules();
    } catch { setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' }); }
  };

  const handleToggleActive = async (rule: NotificationRule) => {
    try {
      await notificationService.updateRule(rule.id, { is_active: !rule.is_active });
      loadRules();
    } catch {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setOrder("desc");
    }
    setPage(0);
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

      <Paper {...ALERT_TABLE_STYLES.paper} sx={{ 
        ...ALERT_TABLE_STYLES.paper.sx, 
        height: 'calc(100vh - 170px)'
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveIcon color="primary"  />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('notificationRuleList')}</Typography>
            <Chip label={`${total} ${t('countUnit')}`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
          <Button
            variant="contained"
            disableElevation
            size="small"
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 'bold',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {t('addRule')}
          </Button>
        </Stack>

        <Divider sx={{ mx: 2 }} />

        <TableContainer {...ALERT_TABLE_STYLES.container}>
          <Table {...ALERT_TABLE_STYLES.table} size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell width={250} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? order : 'desc'}
                    onClick={() => handleSort('name')}
                  >
                    {t('ruleName')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={100} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {t('severity')}
                    <IconButton
                      size="small"
                      onClick={(e) => setSeverityAnchor(e.currentTarget)}
                      sx={{ p: 0.25 }}
                    >
                      <FilterListIcon sx={{ fontSize: 16, color: selectedSeverities.length > 0 ? 'primary.main' : 'text.secondary' }} />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell width={100} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {t('activeStatus')}
                    <IconButton
                      size="small"
                      onClick={(e) => setActiveAnchor(e.currentTarget)}
                      sx={{ p: 0.25 }}
                    >
                      <FilterListIcon sx={{ fontSize: 16, color: activeFilter !== null ? 'primary.main' : 'text.secondary' }} />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell width={160} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <TableSortLabel
                    active={sortBy === 'last_triggered_at'}
                    direction={sortBy === 'last_triggered_at' ? order : 'desc'}
                    onClick={() => handleSort('last_triggered_at')}
                  >
                    {t('lastTriggered')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={160} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? order : 'desc'}
                    onClick={() => handleSort('created_at')}
                  >
                    {t('createdAt')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={160} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <TableSortLabel
                    active={sortBy === 'updated_at'}
                    direction={sortBy === 'updated_at' ? order : 'desc'}
                    onClick={() => handleSort('updated_at')}
                  >
                    {t('updatedAt')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={100} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, color: 'text.disabled' }}>{loading ? '로딩 중...' : '등록된 규칙이 없습니다.'}</TableCell></TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} hover sx={{ ...ALERT_TABLE_STYLES.bodyRow }}>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>{rule.name}</TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell }}><SeverityChip severity={rule.severity} /></TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>
                      <Switch
                        size="small"
                        checked={rule.is_active}
                        onChange={() => handleToggleActive(rule)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>
                      {formatDateTime(rule.last_triggered_at)}
                    </TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, color: 'text.secondary' }}>
                      {formatDateTime(rule.created_at)}
                    </TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, color: 'text.secondary' }}>
                      {formatDateTime(rule.updated_at)}
                    </TableCell>
                    <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-start">
                        <IconButton size="small" onClick={() => handleOpenDialog(rule)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(rule.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          {...ALERT_TABLE_STYLES.pagination}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      {/* 중요도 필터 메뉴 */}
      <AlertTableFilterMenu
        anchorEl={severityAnchor}
        open={Boolean(severityAnchor)}
        onClose={() => setSeverityAnchor(null)}
        options={SEVERITY_OPTIONS.map(s => ({ value: s, label: s.toUpperCase() }))}
        selectedValues={selectedSeverities}
        onToggle={(value) => {
          const severity = value as string;
          setSelectedSeverities(prev =>
            prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
          );
        }}
        multiSelect
      />

      {/* 활성여부 필터 메뉴 */}
      <AlertTableFilterMenu
        anchorEl={activeAnchor}
        open={Boolean(activeAnchor)}
        onClose={() => setActiveAnchor(null)}
        options={[...ACTIVE_STATUS_OPTIONS]}
        selectedValues={[activeFilter]}
        onToggle={(value) => {
          setActiveFilter(value as boolean | null);
        }}
        multiSelect={false}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('deleteRule')}</DialogTitle>
        <DialogContent><Typography>{t('confirmDeleteRule')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{t('cancel')}</Button>
          <Button color="error" onClick={handleDelete}>{t('deleteRule')}</Button>
        </DialogActions>
      </Dialog>

      {/* 규칙 생성/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingRule ? t('editRule') : t('addRule')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* 1. 기본 정보 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>1. {t('basicInfo')}</Typography>
              <Stack spacing={2}>
                <TextField label={t('ruleName')} fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} size="small" />
                <TextField label={t('ruleDescriptionLabel')} fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} size="small" />
                <Stack direction="row" spacing={2}>
                  <TextField label={t('targetIndex')} fullWidth value={formData.target_index} onChange={(e) => setFormData({ ...formData, target_index: e.target.value })} size="small" />
                  <TextField select label={t('severity')} sx={{ minWidth: 150 }} value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} size="small">
                    <MenuItem value="info">{t('severityInfo')}</MenuItem>
                    <MenuItem value="warning">{t('severityWarning')}</MenuItem>
                    <MenuItem value="error">{t('severityError')}</MenuItem>
                  </TextField>
                </Stack>
                <FormControlLabel control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />} label={t('status')} />
              </Stack>
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* 2. 탐지 로직 및 주기 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>2. {t('detectionCondition')}</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField 
                  label={t('intervalMin')} 
                  type="number" 
                  fullWidth 
                  value={formData.interval_min} 
                  onChange={(e) => setFormData({ ...formData, interval_min: parseInt(e.target.value) })} 
                  size="small" 
                  helperText={t('intervalMinHelper')}
                  inputProps={{ min: 1, max: 1440, step: 1 }}
                />
                <TextField 
                  label={t('windowMin')} 
                  type="number" 
                  fullWidth 
                  value={formData.window_min} 
                  onChange={(e) => setFormData({ ...formData, window_min: parseInt(e.target.value) })} 
                  size="small" 
                  helperText={t('windowMinHelper')}
                  error={!!windowIntervalError}
                  inputProps={{ min: 1, max: 10080, step: 1 }}
                />
              </Stack>
              
              {/* Hard Barrier Error */}
              {windowIntervalError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {windowIntervalError}
                </Alert>
              )}
              
              <TextField label={t('conditionConfig')} multiline rows={6} fullWidth required value={dslString} onChange={(e) => handleDslChange(e.target.value)} error={!!jsonError} helperText={jsonError || t('dslQueryHelper')} inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* 3. 알림 메시지 템플릿 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>3. {t('notificationMessageTemplate')}</Typography>
              <TextField label={t('messageTemplate')} fullWidth multiline rows={10} value={formData.message_template} onChange={(e) => setFormData({ ...formData, message_template: e.target.value })} size="small" helperText={t('messageTemplateHelper')} />
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* 4. 알림 수신 대상 역할 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>4. {t('notificationReceiverRoles')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('selectReceiverRoles')}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receiver?.values?.includes('user') || false}
                      onChange={(e) => {
                        const currentValues = formData.receiver?.values || [];
                        const newValues = e.target.checked
                          ? [...currentValues, 'user']
                          : currentValues.filter((v: string) => v !== 'user');
                        setFormData({ ...formData, receiver: { type: 'role', values: newValues } });
                      }}
                    />
                  }
                  label={t('userRoleUser')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receiver?.values?.includes('monitoring') || false}
                      onChange={(e) => {
                        const currentValues = formData.receiver?.values || [];
                        const newValues = e.target.checked
                          ? [...currentValues, 'monitoring']
                          : currentValues.filter((v: string) => v !== 'monitoring');
                        setFormData({ ...formData, receiver: { type: 'role', values: newValues } });
                      }}
                    />
                  }
                  label={t('userRoleMonitoring')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receiver?.values?.includes('approver') || false}
                      onChange={(e) => {
                        const currentValues = formData.receiver?.values || [];
                        const newValues = e.target.checked
                          ? [...currentValues, 'approver']
                          : currentValues.filter((v: string) => v !== 'approver');
                        setFormData({ ...formData, receiver: { type: 'role', values: newValues } });
                      }}
                    />
                  }
                  label={t('userRoleApprover')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receiver?.values?.includes('admin') || false}
                      onChange={(e) => {
                        const currentValues = formData.receiver?.values || [];
                        const newValues = e.target.checked
                          ? [...currentValues, 'admin']
                          : currentValues.filter((v: string) => v !== 'admin');
                        setFormData({ ...formData, receiver: { type: 'role', values: newValues } });
                      }}
                    />
                  }
                  label={t('userRoleAdmin')}
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave} 
            disabled={!!jsonError || !formData.name || !!windowIntervalError}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationRuleListTab;
