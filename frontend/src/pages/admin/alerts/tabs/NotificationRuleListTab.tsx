import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { notificationService } from '@/services/notificationService.ts';
import { useRoleCodesStore } from '@/stores/useRoleCodesStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { NotificationRule, NotificationRuleCreate } from '@/types';
import { getAlertWsUrl } from '@/utils/wsUtils';
import {
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationRuleDetail } from '../components/NotificationRuleDetail';
import { NotificationRuleList } from '../components/NotificationRuleList';
import type { HeaderEntry } from '../components/WebhookHeadersEditor';

const DEFAULT_FORM_DATA: NotificationRuleCreate = {
  name: '',
  description: '',
  target_index: 'logs-sentinel_one.edr',
  condition_config: {
    query: {
      bool: {
        must: [{ match_all: {} }],
        filter: [{ range: { "@timestamp": { gte: "now-1m" } } }]
      }
    },
    size: 100
  },
  message_template: `[{{rule_name}}]총 {{hits.total.value}}건의 이벤트가 탐지되었습니다.

호스트: {{endpoint.name}} ({{endpoint.os}})
이벤트: {{event.type}} / {{event.category}}

프로세스: {{src.process.name}} (PID: {{src.process.pid}})
실행 경로: {{src.process.image.path}}
실행 사용자: {{src.process.user}}
명령어: {{src.process.cmdline}}

`,
  severity: 'info',
  interval_min: 1,
  trigger_condition: '',
  receiver: { type: 'role', values: ['role-1'], webhook_url: '', webhook_headers: { 'Content-Type': 'application/json' }, webhook_body: '{\n  "rule_name": "{{rule_name}}",\n  "severity": "{{rule_severity}}",\n  "message": "{{message}}",\n  "created_at": "{{created_at}}"\n}' },
  is_active: true
};

const NotificationRuleListTab: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [page] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const { t, language } = useTranslation();
  const { roleCodes, fetch: fetchRoleCodes } = useRoleCodesStore();

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

  useEffect(() => { fetchRoleCodes(); }, [fetchRoleCodes]);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => {
    if (settings && settings.pagination_size) setRowsPerPage(settings.pagination_size);
  }, [settings]);

  // 왼쪽 패널 리사이즈
  const [listWidth, setListWidth] = useState(320);
  const isResizing = React.useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const containerLeft = document.getElementById('master-detail-container')?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - containerLeft;
      setListWidth(Math.max(200, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // 마스터-디테일 상태
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<NotificationRuleCreate>(DEFAULT_FORM_DATA);
  const [dslString, setDslString] = useState(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [webhookHeaders, setWebhookHeaders] = useState<HeaderEntry[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [webhookBodyStr, setWebhookBodyStr] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });

  // 변경 감지용 원본 데이터
  const originalFormRef = useRef<string>('');

  // 쿼리 테스트 상태
  const [queryTestLoading, setQueryTestLoading] = useState(false);
  const [queryTestResult, setQueryTestResult] = useState<any | null>(null);
  const [queryTestError, setQueryTestError] = useState<string | null>(null);

  // 트리거 테스트 상태
  const [triggerTestLoading, setTriggerTestLoading] = useState(false);
  const [triggerTestResult, setTriggerTestResult] = useState<{ evaluation: boolean; total: number; has_aggregations: boolean } | null>(null);
  const [triggerTestError, setTriggerTestError] = useState<string | null>(null);

  // Export/Import
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 메시지 템플릿 프리뷰
  const renderMessagePreview = useMemo(() => {
    let preview = formData.message_template;
    if (queryTestResult) {
      const total = queryTestResult.hits?.total?.value || 0;
      const hits = queryTestResult.hits?.hits || [];
      const hitSources = hits.map((h: any) => h._source);

      const getNestedValue = (obj: any, keys: string[]): any => {
        if (!obj) return null;
        let value = obj;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) { value = value[k]; } else { return null; }
        }
        return value;
      };

      const toStr = (value: any): string => {
        if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
        return String(value);
      };

      const context: Record<string, any> = {
        ...queryTestResult,
        total,
        rule_name: formData.name || '',
        rule_id: selectedRule?.id || '',
        rule_severity: formData.severity || '',
        target_index: formData.target_index || '',
        rule_target_index: formData.target_index || '',
        _hit_sources: hitSources,
      };

      preview = preview.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_match: string, key: string) => {
        if (!key.includes('.')) {
          let value = context[key];
          if (value === undefined || value === null) {
            if (hitSources.length > 0) value = hitSources[0]?.[key];
          }
          if (value !== undefined && value !== null) return toStr(value);
          return `{{${key}}}`;
        }

        const keys = key.split('.');
        const ctxValue = getNestedValue(context, keys) ?? (context[key] !== undefined ? context[key] : null);
        if (ctxValue !== null && ctxValue !== undefined) return toStr(ctxValue);

        if (hitSources.length > 0) {
          const values: string[] = [];
          for (const hit of hitSources) {
            const v = getNestedValue(hit, keys) ?? (hit[key] !== undefined ? hit[key] : null);
            if (v !== null && v !== undefined) values.push(toStr(v));
          }
          if (values.length > 0) {
            const unique = [...new Set(values)];
            return unique.join('\n');
          }
        }
        return `{{${key}}}`;
      });
    }
    return preview;
  }, [formData.message_template, formData.name, formData.severity, formData.target_index, queryTestResult, selectedRule]);

  const loadRules = useCallback(async () => {
    if (!user || user.role !== 'role-1') { setLoading(false); return; }
    setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const params: { skip: number; limit: number; sort_by: string; order: string } = {
        skip, limit: rowsPerPage, sort_by: 'created_at', order: 'desc'
      };
      const data = await notificationService.getRules(params);
      setRules(data.items);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const handleSelectRule = (rule: NotificationRule) => {
    setSelectedRule(rule);
    setShowForm(true);
    setFormData({
      name: rule.name,
      description: rule.description,
      target_index: rule.target_index,
      condition_config: JSON.parse(JSON.stringify(rule.condition_config)),
      message_template: rule.message_template,
      severity: rule.severity,
      interval_min: rule.interval_min,
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
        webhook_body: rule.receiver?.webhook_body || '',
      },
      is_active: rule.is_active
    });
    setDslString(JSON.stringify(rule.condition_config, null, 2));
    const wh = rule.receiver?.webhook_headers;
    setWebhookHeaders(wh && Object.keys(wh).length > 0 ? Object.entries(wh).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]);
    setWebhookBodyStr(rule.receiver?.webhook_body || '');
    setJsonError(null);
    setQueryTestResult(null);
    setQueryTestError(null);
    setTriggerTestResult(null);
    setTriggerTestError(null);
    originalFormRef.current = JSON.stringify({
      name: rule.name,
      description: rule.description,
      target_index: rule.target_index,
      condition_config: rule.condition_config,
      message_template: rule.message_template,
      severity: rule.severity,
      interval_min: rule.interval_min,
      trigger_condition: rule.trigger_condition || '',
      receiver: {
        type: rule.receiver?.type,
        values: rule.receiver?.values,
        webhook_url: rule.receiver?.webhook_url || '',
        webhook_headers: rule.receiver?.webhook_headers || {},
        webhook_body: rule.receiver?.webhook_body || '',
      },
      is_active: rule.is_active,
    });
  };

  const handleAddNew = () => {
    setSelectedRule(null);
    setShowForm(true);
    setFormData(DEFAULT_FORM_DATA);
    setDslString(JSON.stringify(DEFAULT_FORM_DATA.condition_config, null, 2));
    setWebhookHeaders([{ key: 'Content-Type', value: 'application/json' }]);
    setWebhookBodyStr(DEFAULT_FORM_DATA.receiver.webhook_body || '');
    setJsonError(null);
    setQueryTestResult(null);
    setQueryTestError(null);
    setTriggerTestResult(null);
    setTriggerTestError(null);
    originalFormRef.current = '';
  };

  const handleDslChange = (value: string) => {
    setDslString(value);
    try {
      const parsed = JSON.parse(value);
      setFormData(prev => ({ ...prev, condition_config: parsed }));
      setJsonError(null);
    } catch { setJsonError(t('invalidJson')); }
  };

  const handleTestQuery = async () => {
    if (jsonError) { setSnackbar({ open: true, message: t('dslJsonError'), severity: 'error' }); return; }
    setQueryTestLoading(true); setQueryTestError(null); setQueryTestResult(null);
    try {
      const result = await notificationService.testQuery(formData.target_index, formData.condition_config);
      setQueryTestResult(result);
      setSnackbar({ open: true, message: t('queryTestSuccess'), severity: 'success' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || t('queryRunFailed');
      setQueryTestError(errorMsg);
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    } finally { setQueryTestLoading(false); }
  };

  const handleTestTrigger = async () => {
    if (jsonError) { setSnackbar({ open: true, message: t('dslJsonError'), severity: 'error' }); return; }
    setTriggerTestLoading(true); setTriggerTestError(null); setTriggerTestResult(null);
    try {
      const result = await notificationService.testTrigger(formData.target_index, formData.condition_config, formData.trigger_condition || '');
      setTriggerTestResult(result);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Trigger test failed';
      setTriggerTestError(errorMsg);
    } finally { setTriggerTestLoading(false); }
  };

  const getChangedFields = (): string[] => {
    if (!originalFormRef.current) return [];
    const original = JSON.parse(originalFormRef.current);
    const fields: string[] = [];
    const compare = (key: string) => JSON.stringify(original[key]) !== JSON.stringify((formData as any)[key]);
    if (compare('name')) fields.push('name');
    if (compare('description')) fields.push('description');
    if (compare('target_index')) fields.push('target_index');
    if (compare('condition_config')) fields.push('condition_config');
    if (compare('message_template')) fields.push('message_template');
    if (compare('severity')) fields.push('severity');
    if (compare('interval_min')) fields.push('interval_min');
    if (compare('trigger_condition')) fields.push('trigger_condition');
    if (compare('is_active')) fields.push('is_active');
    const origR = original.receiver || {};
    const curR = formData.receiver || {};
    if (JSON.stringify(origR.type) !== JSON.stringify(curR.type)) fields.push('receiver_type');
    if (JSON.stringify(origR.values) !== JSON.stringify(curR.values)) fields.push('receiver_values');
    if ((origR.webhook_url || '') !== (curR.webhook_url || '')) fields.push('webhook_url');
    if (JSON.stringify(origR.webhook_headers || {}) !== JSON.stringify(curR.webhook_headers || {})) fields.push('webhook_headers');
    if ((origR.webhook_body || '') !== (curR.webhook_body || '')) fields.push('webhook_body');
    return fields;
  };

  const handleSave = async () => {
    try {
      let saved: NotificationRule;
      if (selectedRule) {
        const changedFields = getChangedFields();
        if (changedFields.length === 0) {
          setSnackbar({ open: true, message: t('noChanges'), severity: 'info' });
          return;
        }
        saved = await notificationService.updateRule(selectedRule.id, { ...formData, changed_fields: changedFields });
        setSelectedRule(saved);
        originalFormRef.current = JSON.stringify(formData);
      } else {
        saved = await notificationService.createRule(formData);
        setSelectedRule(saved);
        setShowForm(true);
        originalFormRef.current = JSON.stringify(formData);
      }
      setSnackbar({ open: true, message: t('ruleSaveSuccess'), severity: 'success' });
      await loadRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteIds.length === 0) return;
    try {
      await Promise.all(deleteIds.map(id => notificationService.deleteRule(id)));
      setSnackbar({ open: true, message: t('ruleDeleteSuccess'), severity: 'success' });
      if (selectedRule && deleteIds.includes(selectedRule.id)) {
        setShowForm(false);
        setSelectedRule(null);
      }
      setSelectedRuleIds(prev => {
        const next = new Set(prev);
        deleteIds.forEach(id => next.delete(id));
        return next;
      });
      setDeleteIds([]);
      loadRules();
    } catch { setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' }); }
  };

  const handleToggleActive = async (rule: NotificationRule) => {
    try {
      const saved = await notificationService.updateRule(rule.id, { is_active: !rule.is_active, changed_fields: ['is_active'] });
      if (selectedRule?.id === rule.id) {
        setSelectedRule(saved);
        originalFormRef.current = JSON.stringify({ ...formData, is_active: saved.is_active });
        setFormData(prev => ({ ...prev, is_active: saved.is_active }));
      }
      setSnackbar({ open: true, message: t('ruleSaveSuccess'), severity: 'success' });
      loadRules();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handleWebhookHeadersChange = (updated: HeaderEntry[]) => {
    setWebhookHeaders(updated);
    const record: Record<string, string> = {};
    updated.forEach(({ key, value }) => { if (key.trim()) record[key.trim()] = value; });
    setFormData(prev => ({ ...prev, receiver: { ...prev.receiver, webhook_headers: record } }));
  };

  const handleWebhookBodyChange = (value: string) => {
    setWebhookBodyStr(value);
    setFormData(prev => ({ ...prev, receiver: { ...prev.receiver, webhook_body: value } }));
  };

  const handleTestWebhook = async () => {
    try {
      const res = await notificationService.testWebhook(formData.receiver?.webhook_url || '', formData.receiver?.webhook_headers);
      setSnackbar({ open: true, message: res.success ? t('webhookTestSuccess') : `${t('webhookTestFail')}: ${res.message}`, severity: res.success ? 'success' : 'error' });
    } catch (err: any) {
      setSnackbar({ open: true, message: `${t('webhookTestFail')}: ${err.message}`, severity: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const exportFields = ["name", "description", "target_index", "condition_config", "message_template", "severity", "interval_min", "trigger_condition", "receiver", "is_active"];
      const selectedRules = rules.filter(r => selectedRuleIds.has(r.id)).map(r => {
        const obj: Record<string, any> = {};
        for (const k of exportFields) if (k in r) obj[k] = (r as any)[k];
        return obj;
      });
      const data = { version: "1.0", exported_at: new Date().toISOString(), rules: selectedRules };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `alert-rules-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      setSelectedRuleIds(new Set());
      setSnackbar({ open: true, message: t('exportSuccess'), severity: 'success' });
    } catch { setSnackbar({ open: true, message: t('exportFailed'), severity: 'error' }); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const importedRules = json.rules || json;
        if (!Array.isArray(importedRules) || importedRules.length === 0) {
          setSnackbar({ open: true, message: t('importInvalidFormat'), severity: 'error' }); return;
        }
        const result = await notificationService.importRules(importedRules, false);
        setSnackbar({
          open: true,
          message: `${t('importSuccess')}: ${result.created} ${t('importCreated')}${result.errors.length > 0 ? `, ${result.errors.length} ${t('importErrors')}` : ''}`,
          severity: result.errors.length > 0 ? 'error' : 'success'
        });
        loadRules();
      } catch { setSnackbar({ open: true, message: t('importFailed'), severity: 'error' }); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (user && user.role !== 'role-1') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">{t('noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

      {/* 상단 액션 바 */}
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          {t('notificationCenter')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title={selectedRuleIds.size === 0 ? t('selectRulesToExport') : ''}>
            <span>
              <Button variant="outlined" size="small" disabled={selectedRuleIds.size === 0}
                startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExport}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
                {t('export')}{selectedRuleIds.size > 0 ? ` (${selectedRuleIds.size})` : ''}
              </Button>
            </span>
          </Tooltip>
          <Button variant="outlined" size="small" startIcon={<FileUploadIcon sx={{ fontSize: 16 }} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
            {t('import')}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImport} />
          <Tooltip title={selectedRuleIds.size === 0 ? t('selectRulesToDelete') : ''}>
            <span>
              <Button variant="outlined" color="error" size="small" disabled={selectedRuleIds.size === 0}
                startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                onClick={() => setDeleteIds(Array.from(selectedRuleIds))}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
                {t('deleteRule')}{selectedRuleIds.size > 0 ? ` (${selectedRuleIds.size})` : ''}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* 마스터-디테일 레이아웃 */}
      <Box id="master-detail-container" sx={{ flex: '1 1 0', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <NotificationRuleList
          width={listWidth}
          rules={rules}
          selectedRuleId={selectedRule?.id ?? null}
          selectedRuleIds={selectedRuleIds}
          onSelect={handleSelectRule}
          onToggleSelect={(ruleId) => {
            setSelectedRuleIds(prev => {
              const next = new Set(prev);
              if (next.has(ruleId)) next.delete(ruleId); else next.add(ruleId);
              return next;
            });
          }}
          onSelectAll={(checked) => {
            if (checked) setSelectedRuleIds(new Set(rules.map(r => r.id)));
            else setSelectedRuleIds(new Set());
          }}
          onAdd={handleAddNew}
          onToggleActive={handleToggleActive}
          loading={loading}
          t={t}
        />
        {/* 리사이즈 핸들 */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: 10,
            flexShrink: 0,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover > div, &:active > div': { bgcolor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 2, height: 40, borderRadius: 1, bgcolor: 'divider', transition: 'background-color 0.2s' }} />
        </Box>
        <NotificationRuleDetail
          showForm={showForm}
          isEditing={!!selectedRule}
          formData={formData}
          onFormDataChange={setFormData}
          onSave={handleSave}
          onDelete={() => { if (selectedRule) setDeleteIds([selectedRule.id]); }}
          t={t}
          dslString={dslString}
          onDslChange={handleDslChange}
          jsonError={jsonError}
          onTestQuery={handleTestQuery}
          queryTestLoading={queryTestLoading}
          queryTestResult={queryTestResult}
          queryTestError={queryTestError}
          onTestTrigger={handleTestTrigger}
          triggerTestLoading={triggerTestLoading}
          triggerTestResult={triggerTestResult}
          triggerTestError={triggerTestError}
          renderMessagePreview={renderMessagePreview}
          webhookHeaders={webhookHeaders}
          onWebhookHeadersChange={handleWebhookHeadersChange}
          webhookBodyStr={webhookBodyStr}
          onWebhookBodyChange={handleWebhookBodyChange}
          onTestWebhook={handleTestWebhook}
          roleCodes={roleCodes}
          language={language}
          saveDisabled={!!jsonError || !formData.name}
          changeHistory={selectedRule?.change_history}
          createdAt={selectedRule?.created_at}
        />
      </Box>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteIds.length > 0} onClose={() => setDeleteIds([])}>
        <DialogTitle>{t('deleteRule')}</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteIds.length > 1
              ? t('confirmDeleteRules', { count: String(deleteIds.length) })
              : t('confirmDeleteRule')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIds([])}>{t('cancel')}</Button>
          <Button color="error" onClick={handleDelete}>{t('deleteRule')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}
          sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationRuleListTab;
