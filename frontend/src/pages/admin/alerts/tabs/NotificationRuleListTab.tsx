import React, {useCallback, useEffect, useMemo, useState} from 'react';
import MonacoEditor from '@monaco-editor/react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';
import { notificationService } from '@/services/notificationService.ts';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useRoleCodesStore } from '@/stores/useRoleCodesStore';
import type { NotificationRule, NotificationRuleCreate } from '@/types';
import { getRoleName } from '@/utils/roleUtils';
import { getAlertWsUrl } from '@/utils/wsUtils';
import { SeverityChip } from '@/pages/admin/alerts/components/SeverityChip';
import { AlertTableFilterMenu } from '../components/AlertTableFilterMenu';
import {
  ACTIVE_STATUS_OPTIONS,
  ALERT_TABLE_STYLES,
  formatDateTime,
  SEVERITY_OPTIONS
} from '../components/AlertTableStyles';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';

import { useTranslation } from '@/hooks/useTranslation';

const DEFAULT_FORM_DATA: NotificationRuleCreate = {
  name: '',
  description: '',
  target_index: 'logs-sentinel_one.edr',
  condition_config: {
    query: {
      bool: {
        must: [{match_all: {}}],
        filter: [{range: {"@timestamp": {gte: "now-5m"}}}]
      }
    },
    size: 100
  },
  message_template: `[{{meta.event.name}}] 총 {{total}}건 탐지

호스트: {{endpoint.name}} ({{endpoint.os}})
이벤트: {{event.type}} / {{event.category}}

프로세스: {{src.process.name}} (PID: {{src.process.pid}})
실행 경로: {{src.process.image.path}}
실행 사용자: {{src.process.user}}
명령어: {{src.process.cmdline}}

출발지: {{src.ip.address}}:{{src.port.number}}
목적지: {{dst.ip.address}}:{{dst.port.number}}`,
  severity: 'info',
  interval_min: 1,
  dedup_key_template: '{{rule_id}}_{{_id}}',
  trigger_condition: '',
  receiver: {type: 'role', values: ['role-1'], webhook_url: '', webhook_headers: {}},
  is_active: true
};

const NotificationRuleListTab: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const monacoTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'light';
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState<number[]>([10, 25, 50]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useTranslation();
  const { roleCodes, roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();

  // WebSocket 실시간 새로고침 연동
  const token = localStorage.getItem('access_token');
  const wsUrl = getAlertWsUrl();

  useWebSocket({
    url: wsUrl,
    token,
    onMessage: (data) => {
      if (data.type === 'new_alert') {
        loadRules();
      }
    }
  });

  useEffect(() => {
    fetchRoleCodes();
  }, [fetchRoleCodes]);

  // 고급 설정 로드 및 연동
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings && settings.pagination_size) {
      setRowsPerPage(settings.pagination_size);
      setRowsPerPageOptions(prev => {
        const newOptions = [...prev];
        if (!newOptions.includes(settings.pagination_size!)) {
          newOptions.unshift(settings.pagination_size!);
          return newOptions.sort((a, b) => a - b);
        }
        return newOptions;
      });
    }
  }, [settings]);

  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);

  // 정렬 상태
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NotificationRuleCreate>(DEFAULT_FORM_DATA);
  const [dslString, setDslString] = useState(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [webhookHeadersStr, setWebhookHeadersStr] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  
  // 쿼리 테스트 상태
  const [queryTestLoading, setQueryTestLoading] = useState(false);
  const [queryTestResult, setQueryTestResult] = useState<any | null>(null);
  const [queryTestError, setQueryTestError] = useState<string | null>(null);

  // 트리거 테스트 상태
  const [triggerTestLoading, setTriggerTestLoading] = useState(false);
  const [triggerTestResult, setTriggerTestResult] = useState<{
    evaluation: boolean;
    total: number;
    has_aggregations: boolean;
  } | null>(null);
  const [triggerTestError, setTriggerTestError] = useState<string | null>(null);

  // 필터 메뉴 상태
  const [severityAnchor, setSeverityAnchor] = useState<null | HTMLElement>(null);
  const [activeAnchor, setActiveAnchor] = useState<null | HTMLElement>(null);


  // 메시지 템플릿 프리뷰 렌더링
  const renderMessagePreview = useMemo(() => {
    let preview = formData.message_template;
    
    if (queryTestResult) {
      // 실제 쿼리 결과로 렌더링
      const total = queryTestResult.hits?.total?.value || 0;
      const hits = queryTestResult.hits?.hits || [];
      const hitSources = hits.map((h: any) => h._source);
      
      // 중첩 필드 접근 헬퍼 함수
      const getNestedValue = (obj: any, path: string): any => {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            return null;
          }
        }
        return value;
      };
      
      // 템플릿 컨텍스트 구성 (백엔드와 동일: OpenSearch 응답 전체 + 메타 정보)
      const context: any = {
        ...queryTestResult,
        total,
      };
      
      const toStr = (v: any): string =>
        typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v);

      // {{변수}} 형식을 모두 치환
      preview = preview.replace(/\{\{([\w\.@]+)\}\}/g, (match, key) => {
        // 단순 키 접근 (total 등)
        if (!key.includes('.')) {
          const value = context[key];
          return value !== null && value !== undefined ? toStr(value) : match;
        }
        
        // 1차: context 전체에서 직접 탐색 (예: hits.total.value, aggregations.threats.buckets)
        const ctxValue = getNestedValue(queryTestResult, key);
        if (ctxValue !== null && ctxValue !== undefined) {
          return toStr(ctxValue);
        }
        
        // 2차: hits._source 배열에서 추출 (예: threatInfo.threatName)
        if (hitSources.length > 0) {
          const values: string[] = [];
          for (const hit of hitSources) {
            const hitValue = getNestedValue(hit, key);
            if (hitValue !== null && hitValue !== undefined) {
              values.push(toStr(hitValue));
            }
          }
          
          if (values.length > 0) {
            const uniqueValues = Array.from(new Set(values));
            return uniqueValues.join('\n');
          }
        }
        
        return match;
      });
    }
    
    return preview;
  }, [formData.message_template, queryTestResult]);

  const loadRules = useCallback(async () => {
    if (!user || user.role !== 'role-1') { setLoading(false); return; }
    setLoading(true);
    try {
      const skip = page * rowsPerPage;

      // 서버 사이드 필터링 파라미터 구성
      const params: {
        skip: number;
        limit: number;
        sort_by: string;
        order: string;
        query?: string;
        severities?: string;
        is_active?: boolean;
      } = {
        skip,
        limit: rowsPerPage,
        sort_by: sortBy,
        order
      };

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
  }, [page, rowsPerPage, selectedSeverities, activeFilter, sortBy, order]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleOpenDialog = (rule: NotificationRule | null = null) => {
    if (rule) {
      setEditingRule(rule);
      // 깊은 복사로 중첩 객체도 복사
      setFormData({
        name: rule.name,
        description: rule.description,
        target_index: rule.target_index,
        condition_config: JSON.parse(JSON.stringify(rule.condition_config)),
        message_template: rule.message_template,
        severity: rule.severity,
        interval_min: rule.interval_min,
        dedup_key_template: rule.dedup_key_template,
        trigger_condition: rule.trigger_condition || '',
        receiver: {
          ...rule.receiver,
          values: (() => {
            const legacyMap: Record<string, string> = { admin: 'role-1', user: 'role-2' };
            const mapped = (rule.receiver?.values || []).map((v: string) => legacyMap[v] ?? v);
            if (roleCodes.length === 0) return mapped;
            return mapped.filter((v: string) => roleCodes.some(rc => rc.code === v));
          })(),
          webhook_url: rule.receiver?.webhook_url || '',
          webhook_headers: rule.receiver?.webhook_headers || {},
        },
        is_active: rule.is_active
      });
      setDslString(JSON.stringify(rule.condition_config, null, 2));
      const wh = rule.receiver?.webhook_headers;
      setWebhookHeadersStr(wh && Object.keys(wh).length > 0 ? JSON.stringify(wh, null, 2) : '');
    } else {
      setEditingRule(null);
      setFormData(DEFAULT_FORM_DATA);
      setDslString(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
      setWebhookHeadersStr('');
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
      setFormData(prev => ({...prev, condition_config: parsed}));
      setJsonError(null);
    } catch {
      setJsonError(t('invalidJson'));
    }
  };

  const handleTestQuery = async () => {
    if (jsonError) {
      setSnackbar({open: true, message: t('dslJsonError'), severity: 'error'});
      return;
    }

    setQueryTestLoading(true);
    setQueryTestError(null);
    setQueryTestResult(null);

    try {
      const result = await notificationService.testQuery(
        formData.target_index,
        formData.condition_config
      );
      setQueryTestResult(result);
      setSnackbar({open: true, message: t('queryTestSuccess'), severity: 'success'});
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || t('queryRunFailed');
      setQueryTestError(errorMsg);
      setSnackbar({open: true, message: errorMsg, severity: 'error'});
    } finally {
      setQueryTestLoading(false);
    }
  };

  const handleTestTrigger = async () => {
    if (jsonError) {
      setSnackbar({open: true, message: t('dslJsonError'), severity: 'error'});
      return;
    }

    setTriggerTestLoading(true);
    setTriggerTestError(null);
    setTriggerTestResult(null);

    try {
      const result = await notificationService.testTrigger(
        formData.target_index,
        formData.condition_config,
        formData.trigger_condition || ''
      );
      setTriggerTestResult(result);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Trigger test failed';
      setTriggerTestError(errorMsg);
    } finally {
      setTriggerTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await notificationService.updateRule(editingRule.id, formData);
      } else {
        await notificationService.createRule(formData);
      }
      setSnackbar({open: true, message: t('ruleSaveSuccess'), severity: 'success'});
      
      // 최신 데이터를 먼저 로드한 후 다이얼로그 닫기
      await loadRules();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save rule:', error);
      setSnackbar({open: true, message: t('saveFailed'), severity: 'error'});
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notificationService.deleteRule(deleteId);
      setSnackbar({open: true, message: t('ruleDeleteSuccess'), severity: 'success'});
      setDeleteId(null);
      loadRules();
    } catch {
      setSnackbar({open: true, message: t('saveFailed'), severity: 'error'});
    }
  };

  const handleToggleActive = async (rule: NotificationRule) => {
    try {
      await notificationService.updateRule(rule.id, {is_active: !rule.is_active});
      setSnackbar({open: true, message: t('ruleSaveSuccess'), severity: 'success'});
      loadRules();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      setSnackbar({open: true, message: t('saveFailed'), severity: 'error'});
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

  if (user && user.role !== 'role-1') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">{t('noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3}}>
      {loading && <LinearProgress sx={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10}}/>}

      <Paper {...ALERT_TABLE_STYLES.paper} sx={{
        ...ALERT_TABLE_STYLES.paper.sx,
        height: 'calc(100vh - 170px)'
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{p: 2, pb: 1}}>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <NotificationsActiveIcon color="primary"/>
            <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{t('notificationRuleList')}</Typography>
            <Chip label={`${total} ${t('countUnit')}`} size="small" variant="outlined"
                  sx={{ml: 1, height: 20, fontSize: '0.7rem'}}/>
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
              '&:hover': {bgcolor: 'primary.dark'}
            }}
          >
            {t('addRule')}
          </Button>
        </Stack>

        <Divider sx={{mx: 2}}/>

        <TableContainer {...ALERT_TABLE_STYLES.container}>
          <Table {...ALERT_TABLE_STYLES.table} size="small" sx={{tableLayout: 'fixed'}}>
            <TableHead>
              <TableRow>
                <TableCell width={250} sx={{...ALERT_TABLE_STYLES.headerCell, pl: 7}}>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? order : 'desc'}
                    onClick={() => handleSort('name')}
                  >
                    {t('ruleName')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={100} sx={{...ALERT_TABLE_STYLES.headerCell}}>
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                    {t('severity')}
                    <IconButton
                      size="small"
                      onClick={(e) => setSeverityAnchor(e.currentTarget)}
                      sx={{p: 0.25}}
                    >
                      <FilterListIcon
                        sx={{fontSize: 16, color: selectedSeverities.length > 0 ? 'primary.main' : 'text.secondary'}}/>
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell width={100} sx={{...ALERT_TABLE_STYLES.headerCell}}>
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                    {t('activeStatus')}
                    <IconButton
                      size="small"
                      onClick={(e) => setActiveAnchor(e.currentTarget)}
                      sx={{p: 0.25}}
                    >
                      <FilterListIcon
                        sx={{fontSize: 16, color: activeFilter !== null ? 'primary.main' : 'text.secondary'}}/>
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell width={160} sx={{...ALERT_TABLE_STYLES.headerCell}}>
                  <TableSortLabel
                    active={sortBy === 'last_triggered_at'}
                    direction={sortBy === 'last_triggered_at' ? order : 'desc'}
                    onClick={() => handleSort('last_triggered_at')}
                  >
                    {t('lastTriggered')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={160} sx={{...ALERT_TABLE_STYLES.headerCell}}>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? order : 'desc'}
                    onClick={() => handleSort('created_at')}
                  >
                    {t('createdAt')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={160} sx={{...ALERT_TABLE_STYLES.headerCell}}>
                  <TableSortLabel
                    active={sortBy === 'updated_at'}
                    direction={sortBy === 'updated_at' ? order : 'desc'}
                    onClick={() => handleSort('updated_at')}
                  >
                    {t('updatedAt')}
                  </TableSortLabel>
                </TableCell>
                <TableCell width={100} sx={{...ALERT_TABLE_STYLES.headerCell}}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{
                  py: 8,
                  color: 'text.disabled'
                }}>{loading ? t('loading') : t('noRulesRegistered')}</TableCell></TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} hover sx={{...ALERT_TABLE_STYLES.bodyRow}}>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell, pl: 7}}>{rule.name}</TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell}}><SeverityChip
                      severity={rule.severity}/></TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell}}>
                      <Switch
                        size="small"
                        checked={rule.is_active}
                        onChange={() => handleToggleActive(rule)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell}}>
                      {formatDateTime(rule.last_triggered_at)}
                    </TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell, color: 'text.secondary'}}>
                      {formatDateTime(rule.created_at)}
                    </TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell, color: 'text.secondary'}}>
                      {formatDateTime(rule.updated_at)}
                    </TableCell>
                    <TableCell sx={{...ALERT_TABLE_STYLES.bodyCell}}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-start">
                        <IconButton size="small" onClick={() => handleOpenDialog(rule)}><EditIcon
                          fontSize="small"/></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(rule.id)}><DeleteIcon
                          fontSize="small"/></IconButton>
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      </Paper>

      {/* 중요도 필터 메뉴 */}
      <AlertTableFilterMenu
        anchorEl={severityAnchor}
        open={Boolean(severityAnchor)}
        onClose={() => setSeverityAnchor(null)}
        options={SEVERITY_OPTIONS.map(s => ({value: s, label: s.toUpperCase()}))}
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
        <DialogTitle sx={{fontWeight: 'bold'}}>{editingRule ? t('editRule') : t('addRule')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* 1. 기본 정보 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{fontWeight: 'bold', mb: 1}}>1. {t('basicInfo')}</Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField label={t('ruleName')} fullWidth required value={formData.name}
                             onChange={(e) => setFormData({...formData, name: e.target.value})} size="small"/>
                  <TextField select label={t('severity')} sx={{ minWidth: 130 }} value={formData.severity}
                             onChange={(e) => setFormData({...formData, severity: e.target.value})} size="small">
                    <MenuItem value="info">{t('severityInfo')}</MenuItem>
                    <MenuItem value="warning">{t('severityWarning')}</MenuItem>
                    <MenuItem value="error">{t('severityError')}</MenuItem>
                  </TextField>
                </Stack>
                <TextField label={t('ruleDescriptionLabel')} fullWidth multiline rows={2} value={formData.description}
                           onChange={(e) => setFormData({...formData, description: e.target.value})} size="small"/>
              </Stack>
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 2. 탐지 로직 및 주기 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{fontWeight: 'bold', mb: 1}}>2. {t('detectionCondition')}</Typography>
              <Stack direction="row" spacing={2} sx={{mb: 2}}>
                <TextField
                  label={t('targetIndex')}
                  fullWidth
                  value={formData.target_index}
                  onChange={(e) => setFormData({...formData, target_index: e.target.value})}
                  size="small"
                  placeholder="logs-sentinel_one.edr"
                  inputProps={{style: {fontFamily: 'monospace'}}}
                />
                <TextField
                  label={t('intervalMin')}
                  type="number"
                  sx={{minWidth: 180}}
                  value={formData.interval_min}
                  onChange={(e) => setFormData({...formData, interval_min: parseInt(e.target.value)})}
                  size="small"
                  helperText={t('intervalMinHelper')}
                  inputProps={{min: 1, max: 1440, step: 1}}
                />
              </Stack>

              {/* 좌우 분할 레이아웃: 왼쪽 쿼리 편집, 오른쪽 결과 */}
              <Stack direction="row" spacing={2} sx={{height: 500}}>
                {/* 왼쪽: DSL 쿼리 편집기 */}
                <Box sx={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                  <Typography variant="caption" sx={{fontWeight: 'bold', mb: 1, color: 'text.secondary'}}>
                    {t('defineExtractionQuery')}
                  </Typography>
                  <Box sx={{
                    flex: 1,
                    border: '1px solid',
                    borderColor: jsonError ? 'error.main' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '&:focus-within': { borderColor: jsonError ? 'error.main' : 'primary.main', borderWidth: 2 },
                    '& .monaco-editor .line-numbers': { textAlign: 'center !important' }
                  }}>
                    <MonacoEditor
                      height="100%"
                      language="json"
                      theme={monacoTheme}
                      value={dslString}
                      onChange={(val) => handleDslChange(val ?? '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        lineNumbersMinChars: 2,
                        lineDecorationsWidth: 4,
                        glyphMargin: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        bracketPairColorization: { enabled: true },
                        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      }}
                    />
                  </Box>
                  {jsonError && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{jsonError}</Typography>
                  )}
                  <Box sx={{mt: 1, display: 'flex', gap: 1, alignItems: 'center'}}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleTestQuery}
                      disabled={queryTestLoading || !!jsonError}
                      size="small"
                      fullWidth
                    >
                      {queryTestLoading ? t('queryRunning') : t('runQuery')}
                    </Button>
                  </Box>
                </Box>

                {/* 오른쪽: 쿼리 실행 결과 */}
                <Box sx={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                  <Typography variant="caption" sx={{fontWeight: 'bold', mb: 1, color: 'text.secondary'}}>
                    {t('extractionQueryResponse')}
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{
                      flex: 1,
                      p: 2,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {queryTestLoading ? (
                      <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1}}>
                        <Stack spacing={2} alignItems="center">
                          <Typography variant="body2" color="text.secondary">{t('queryRunning')}</Typography>
                        </Stack>
                      </Box>
                    ) : queryTestError ? (
                      <Alert severity="error">
                        {queryTestError}
                      </Alert>
                    ) : queryTestResult ? (
                      <Box sx={{
                        flex: 1,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'text.primary',
                        lineHeight: 1.6
                      }}>
                        {JSON.stringify(queryTestResult, null, 2)}
                      </Box>
                    ) : (
                      <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1}}>
                        <Typography variant="body2" color="text.secondary">
                          {t('runQueryPrompt')}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Stack>
              
              <Box sx={{mt: 2}}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    label={t('triggerConditionLabel')}
                    fullWidth
                    value={formData.trigger_condition || ''}
                    onChange={(e) => setFormData({...formData, trigger_condition: e.target.value})}
                    size="small"
                    placeholder={t('triggerConditionPlaceholder')}
                    helperText={triggerTestError || t('triggerConditionHelper')}
                    error={!!triggerTestError}
                    inputProps={{style: {fontFamily: 'monospace'}}}
                    sx={{flex: 1}}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleTestTrigger}
                    disabled={triggerTestLoading || !!jsonError}
                    size="small"
                    sx={{ height: 40, whiteSpace: 'nowrap', minWidth: 100 }}
                  >
                    {triggerTestLoading ? t('queryRunning') : t('testTrigger')}
                  </Button>
                  <Box sx={{
                    height: 40,
                    minWidth: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1.5,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>
                    {triggerTestLoading ? '...' : triggerTestResult !== null ? String(triggerTestResult.evaluation) : '-'}
                  </Box>
                </Stack>
              </Box>
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 3. 알림 메시지 템플릿 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{fontWeight: 'bold', mb: 1}}>
                3. {t('notificationMessageTemplate')}
              </Typography>
              
              {/* 좌우 분할 레이아웃: 왼쪽 템플릿 편집, 오른쪽 프리뷰 */}
              <Stack direction="row" spacing={2} sx={{height: 400}}>
                {/* 왼쪽: 메시지 템플릿 편집기 */}
                <Box sx={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                  <Typography variant="caption" sx={{fontWeight: 'bold', mb: 1, color: 'text.secondary'}}>
                    {t('messageTemplate')}
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    required
                    value={formData.message_template}
                    onChange={(e) => setFormData({...formData, message_template: e.target.value})}
                    size="small"
                    placeholder={t('messageTemplatePlaceholder')}
                    inputProps={{style: {fontFamily: 'monospace', fontSize: '0.85rem'}}}
                    sx={{
                      flex: 1,
                      '& .MuiInputBase-root': {
                        height: '100%',
                        alignItems: 'flex-start'
                      },
                      '& textarea': {
                        height: '100% !important',
                        overflow: 'auto !important'
                      }
                    }}
                  />
                </Box>

                {/* 오른쪽: 메시지 프리뷰 */}
                <Box sx={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                  <Typography variant="caption" sx={{fontWeight: 'bold', mb: 1, color: 'text.secondary'}}>
                    {t('messagePreview')}
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      flex: 1,
                      p: 2,
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'auto'
                    }}
                  >
                    {formData.message_template ? (
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'inherit',
                          lineHeight: 1.8
                        }}
                      >
                        {renderMessagePreview}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{fontStyle: 'italic'}}>
                        {t('messagePreviewEmpty')}
                      </Typography>
                    )}
                    
                    {!queryTestResult && formData.message_template && (
                      <Box sx={{mt: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light'}}>
                        <Typography variant="caption" color="info.dark">
                          {t('runQueryPreviewHint')}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Stack>
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 4. 알림 수신 대상 역할 */}
            <Grid size={12}>
              <Typography variant="subtitle2"
                          sx={{fontWeight: 'bold', mb: 1}}>4. {t('notificationReceiverRoles')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 1}}>
                {t('selectReceiverRoles')}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {roleCodes.map((rc) => (
                  <FormControlLabel
                    key={rc.code}
                    control={
                      <Switch
                        checked={formData.receiver?.values?.includes(rc.code) || false}
                        onChange={(e) => {
                          const currentValues = formData.receiver?.values || [];
                          const newValues = e.target.checked
                            ? [...currentValues, rc.code]
                            : currentValues.filter((v: string) => v !== rc.code);
                          setFormData({...formData, receiver: {...formData.receiver, type: 'role', values: newValues}});
                        }}
                      />
                    }
                    label={getRoleName(rc.code, roleNames, language)}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 5. Webhook 설정 */}
            <Grid size={12}>
              <Typography variant="subtitle2"
                          sx={{fontWeight: 'bold', mb: 1}}>5. {t('webhookSettings')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 1}}>
                {t('webhookDescription')}
              </Typography>
              <Stack spacing={2}>
                <Box sx={{display: 'flex', gap: 1, alignItems: 'flex-start'}}>
                  <TextField
                    label={t('webhookUrl')}
                    fullWidth
                    size="small"
                    placeholder="http://192.168.1.100:8080/webhook"
                    value={formData.receiver?.webhook_url || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      receiver: {...formData.receiver, webhook_url: e.target.value}
                    })}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{whiteSpace: 'nowrap', minWidth: 100, height: 40}}
                    disabled={!formData.receiver?.webhook_url}
                    onClick={async () => {
                      try {
                        const res = await notificationService.testWebhook(
                          formData.receiver?.webhook_url || '',
                          formData.receiver?.webhook_headers
                        );
                        setSnackbar({
                          open: true,
                          message: res.success ? t('webhookTestSuccess') : `${t('webhookTestFail')}: ${res.message}`,
                          severity: res.success ? 'success' : 'error'
                        });
                      } catch (err: any) {
                        setSnackbar({
                          open: true,
                          message: `${t('webhookTestFail')}: ${err.message}`,
                          severity: 'error'
                        });
                      }
                    }}
                  >
                    {t('testConnection')}
                  </Button>
                </Box>
                <TextField
                  label={t('webhookHeaders')}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder={'{"Authorization": "Bearer token", "X-Custom": "value"}'}
                  value={webhookHeadersStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWebhookHeadersStr(val);
                    if (!val.trim()) {
                      setFormData({...formData, receiver: {...formData.receiver, webhook_headers: {}}});
                      return;
                    }
                    try {
                      const parsed = JSON.parse(val);
                      setFormData({...formData, receiver: {...formData.receiver, webhook_headers: parsed}});
                    } catch {
                      // 타이핑 중 JSON 파싱 실패는 무시, 문자열은 계속 표시
                    }
                  }}
                  helperText={t('webhookHeadersHelp')}
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{p: 2}}>
          <Button variant="outlined" onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={!!jsonError || !formData.name}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}>
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity}
               sx={{width: '100%'}}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationRuleListTab;
