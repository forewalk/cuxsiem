import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';
import {notificationService} from '@/services/notificationService.ts';
import type {NotificationRule, NotificationRuleCreate} from '@/types';
import {useLanguageStore} from '@/stores/useLanguageStore.ts';
import {SeverityChip} from '@/pages/admin/alerts/components/SeverityChip';
import {AlertTableFilterMenu} from '../components/AlertTableFilterMenu';
import {
  ACTIVE_STATUS_OPTIONS,
  ALERT_TABLE_STYLES,
  formatDateTime,
  SEVERITY_OPTIONS
} from '../components/AlertTableStyles';
import {useWebSocket} from '@/hooks/useWebSocket';

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
  condition_config: {
    query: {
      bool: {
        must: [{match_all: {}}],
        filter: [{range: {"@timestamp": {gte: "now-2m"}}}]
      }
    }
  },
  message_template: 'Detected {{total}} events.',
  severity: 'info',
  interval_min: 1,
  dedup_key_template: '{{rule_id}}_{{_id}}',
  trigger_condition: '',
  receiver: {type: 'role', values: ['admin']},
  is_active: true
};

const NotificationRuleListTab: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const {language} = useLanguageStore();

  // WebSocket 실시간 새로고침 연동
  const token = localStorage.getItem('access_token');
  
  // WebSocket URL 생성 (배포 환경 고려)
  const wsUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // 개발 환경에서는 환경 변수 사용
    if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws');
      return `${wsBaseUrl}/api/v1/ws/alerts`;
    }
    
    // 배포 환경: 현재 호스트 사용 (Nginx 리버스 프록시 통과)
    return `${protocol}//${host}/api/v1/ws/alerts`;
  }, []);

  useWebSocket({
    url: wsUrl,
    token,
    onMessage: (data) => {
      if (data.type === 'new_alert') {
        console.log('실시간 알림 수신 - 규칙 목록 새로고침');
        loadRules();
      }
    }
  });

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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  
  // 쿼리 테스트 상태
  const [queryTestLoading, setQueryTestLoading] = useState(false);
  const [queryTestResult, setQueryTestResult] = useState<any | null>(null);
  const [queryTestError, setQueryTestError] = useState<string | null>(null);
  const [showQueryResult, setShowQueryResult] = useState(false);

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

  const loadRules = useCallback(async () => {
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
        receiver: JSON.parse(JSON.stringify(rule.receiver)),
        is_active: rule.is_active
      });
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
      setFormData(prev => ({...prev, condition_config: parsed}));
      setJsonError(null);
    } catch {
      setJsonError(t('invalidJson'));
    }
  };

  const handleTestQuery = async () => {
    if (jsonError) {
      setSnackbar({open: true, message: 'DSL 쿼리에 JSON 오류가 있습니다', severity: 'error'});
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
      setShowQueryResult(true);
      setSnackbar({open: true, message: '쿼리 테스트 성공!', severity: 'success'});
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || '쿼리 실행 실패';
      setQueryTestError(errorMsg);
      setSnackbar({open: true, message: errorMsg, severity: 'error'});
    } finally {
      setQueryTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        console.log('Updating rule:', editingRule.id, formData);
        await notificationService.updateRule(editingRule.id, formData);
      } else {
        console.log('Creating rule:', formData);
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
      console.log('Toggling active status for rule:', rule.id, 'to', !rule.is_active);
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
                }}>{loading ? '로딩 중...' : '등록된 규칙이 없습니다.'}</TableCell></TableRow>
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
                <TextField label={t('ruleName')} fullWidth required value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})} size="small"/>
                <TextField label={t('ruleDescriptionLabel')} fullWidth multiline rows={2} value={formData.description}
                           onChange={(e) => setFormData({...formData, description: e.target.value})} size="small"/>
                <Stack direction="row" spacing={2}>
                  <TextField label={t('targetIndex')} fullWidth value={formData.target_index}
                             onChange={(e) => setFormData({...formData, target_index: e.target.value})} size="small"/>
                  <TextField select label={t('severity')} sx={{minWidth: 150}} value={formData.severity}
                             onChange={(e) => setFormData({...formData, severity: e.target.value})} size="small">
                    <MenuItem value="info">{t('severityInfo')}</MenuItem>
                    <MenuItem value="warning">{t('severityWarning')}</MenuItem>
                    <MenuItem value="error">{t('severityError')}</MenuItem>
                  </TextField>
                </Stack>
              </Stack>
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 2. 탐지 로직 및 주기 */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{fontWeight: 'bold', mb: 1}}>2. {t('detectionCondition')}</Typography>
              <Stack direction="row" spacing={2} sx={{mb: 2}}>
                <TextField
                  label={t('intervalMin')}
                  type="number"
                  fullWidth
                  value={formData.interval_min}
                  onChange={(e) => setFormData({...formData, interval_min: parseInt(e.target.value)})}
                  size="small"
                  helperText={t('intervalMinHelper')}
                  inputProps={{min: 1, max: 1440, step: 1}}
                />
              </Stack>

              <TextField label={t('conditionConfig')} multiline rows={6} fullWidth required value={dslString}
                         onChange={(e) => handleDslChange(e.target.value)} error={!!jsonError}
                         helperText={jsonError || t('dslQueryHelper')}
                         inputProps={{style: {fontFamily: 'monospace', fontSize: '0.85rem'}}}/>
              
              <Box sx={{mt: 2, display: 'flex', gap: 2, alignItems: 'center'}}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleTestQuery}
                  disabled={queryTestLoading || !!jsonError}
                  size="small"
                >
                  {queryTestLoading ? '실행 중...' : '🔍 쿼리 테스트'}
                </Button>
                {queryTestResult && (
                  <Typography variant="caption" color="success.main">
                    ✅ Total: {queryTestResult.hits?.total?.value || 0}건
                    {queryTestResult.aggregations && ' | 집계 결과 있음'}
                  </Typography>
                )}
              </Box>

              {showQueryResult && queryTestResult && (
                <Paper elevation={1} sx={{mt: 2, p: 2, bgcolor: 'background.default'}}>
                  <Stack spacing={1}>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Typography variant="subtitle2" fontWeight="bold">쿼리 실행 결과</Typography>
                      <Button size="small" onClick={() => setShowQueryResult(false)}>닫기</Button>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        실행 시간: {queryTestResult.took}ms | 
                        Total: {queryTestResult.hits?.total?.value || 0}건 | 
                        Shards: {queryTestResult._shards?.successful}/{queryTestResult._shards?.total}
                      </Typography>
                    </Box>
                    
                    {queryTestResult.aggregations && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>📊 집계 결과:</Typography>
                        <TextField
                          multiline
                          rows={8}
                          fullWidth
                          value={JSON.stringify(queryTestResult.aggregations, null, 2)}
                          InputProps={{readOnly: true, style: {fontFamily: 'monospace', fontSize: '0.8rem'}}}
                          size="small"
                        />
                      </Box>
                    )}

                    {queryTestResult.hits?.hits?.length > 0 && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          📄 문서 샘플 (최대 {queryTestResult.hits.hits.length}건):
                        </Typography>
                        <TextField
                          multiline
                          rows={6}
                          fullWidth
                          value={JSON.stringify(queryTestResult.hits.hits.slice(0, 3), null, 2)}
                          InputProps={{readOnly: true, style: {fontFamily: 'monospace', fontSize: '0.8rem'}}}
                          size="small"
                        />
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {queryTestError && (
                <Alert severity="error" sx={{mt: 2}} onClose={() => setQueryTestError(null)}>
                  {queryTestError}
                </Alert>
              )}
              
              <TextField 
                label="트리거 조건 (선택사항)"
                fullWidth
                value={formData.trigger_condition || ''}
                onChange={(e) => setFormData({...formData, trigger_condition: e.target.value})}
                size="small"
                placeholder='예: total > 50 and bucket_count >= 3'
                helperText="알림 발송 조건을 Python 표현식으로 입력 (예: total > 0, total > 50 and pc_count >= 3). 비워두면 항상 알림 발송"
                sx={{mt: 2}}
              />
            </Grid>

            <Grid size={12}><Divider/></Grid>

            {/* 3. 알림 메시지 템플릿 */}
            <Grid size={12}>
              <Typography variant="subtitle2"
                          sx={{fontWeight: 'bold', mb: 1}}>3. {t('notificationMessageTemplate')}</Typography>
              <TextField label={t('messageTemplate')} fullWidth multiline rows={10} value={formData.message_template}
                         onChange={(e) => setFormData({...formData, message_template: e.target.value})} size="small"
                         helperText={t('messageTemplateHelper')}/>
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
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.receiver?.values?.includes('user') || false}
                      onChange={(e) => {
                        const currentValues = formData.receiver?.values || [];
                        const newValues = e.target.checked
                          ? [...currentValues, 'user']
                          : currentValues.filter((v: string) => v !== 'user');
                        setFormData({...formData, receiver: {type: 'role', values: newValues}});
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
                        setFormData({...formData, receiver: {type: 'role', values: newValues}});
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
                        setFormData({...formData, receiver: {type: 'role', values: newValues}});
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
                        setFormData({...formData, receiver: {type: 'role', values: newValues}});
                      }}
                    />
                  }
                  label={t('userRoleAdmin')}
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
