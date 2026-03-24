import type { ChangeHistoryEntry, NotificationRuleCreate, SourceType } from '@/types';
import HistoryIcon from '@mui/icons-material/History';
import {
  Box,
  Button,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import MonacoEditor from '@monaco-editor/react';
import React from 'react';
import { SeverityChip } from './SeverityChip';
import { WebhookHeadersEditor, type HeaderEntry } from './WebhookHeadersEditor';

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{
    px: 1.5, py: 0.75, bgcolor: 'action.hover', borderRadius: 0.5, mb: 1.5, mt: 2,
    '&:first-of-type': { mt: 0 },
  }}>
    <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {children}
    </Typography>
  </Box>
);

interface RoleCode { code: string; }

interface NotificationRuleDetailProps {
  showForm: boolean;
  isEditing: boolean;
  formData: NotificationRuleCreate;
  onFormDataChange: (data: NotificationRuleCreate) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel?: () => void;
  t: (key: string, params?: Record<string, string>) => string;

  sourceTypes?: SourceType[];

  // Preview
  onPreview?: () => void;
  previewLoading?: boolean;
  previewResult?: { would_trigger: boolean; matched_count: number; details: Record<string, unknown>[]; message_preview?: string } | null;

  // Webhook
  webhookHeaders?: HeaderEntry[];
  onWebhookHeadersChange?: (headers: HeaderEntry[]) => void;
  webhookBodyStr?: string;
  onWebhookBodyChange?: (value: string) => void;
  onTestWebhook?: () => void;

  // Roles
  roleCodes?: RoleCode[];
  roleNames?: Record<string, string>;
  language?: string;
  getRoleName?: (code: string, names: Record<string, string>, lang: string) => string;

  saveDisabled?: boolean;
  changeHistory?: ChangeHistoryEntry[];
}

export const NotificationRuleDetail: React.FC<NotificationRuleDetailProps> = ({
  showForm, isEditing, formData, onFormDataChange, onSave, onCancel, t,
  sourceTypes = [],
  onPreview, previewLoading, previewResult,
  webhookHeaders = [{ key: '', value: '' }], onWebhookHeadersChange,
  webhookBodyStr = '', onWebhookBodyChange, onTestWebhook,
  roleCodes = [], roleNames = {}, language = 'ko', getRoleName: getRoleNameFn,
  saveDisabled, changeHistory = [],
}) => {
  const theme = useTheme();
  const monacoTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'light';

  if (!showForm) {
    return (
      <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{t('selectRulePrompt')}</Typography>
      </Paper>
    );
  }

  const currentSourceType = sourceTypes.find(st => st.id === formData.source_type);
  const currentConditions = currentSourceType?.conditions || [];
  const selectedCondition = (formData.source_config as Record<string, unknown>)?.condition as string || '';

  const updateSourceConfig = (patch: Record<string, unknown>) => {
    onFormDataChange({
      ...formData,
      source_config: { ...formData.source_config, ...patch },
    });
  };

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* 헤더 */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {isEditing ? t('editRule') : t('addRule')}
        </Typography>
        <Stack direction="row" spacing={1}>
          {onCancel && (
            <Button variant="outlined" size="small" onClick={onCancel} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              {t('cancelEdit')}
            </Button>
          )}
          <Button variant="contained" color="primary" size="small" onClick={onSave} disabled={saveDisabled} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t('save')}
          </Button>
        </Stack>
      </Box>

      {/* 폼 영역 */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Grid container spacing={3}>

          {/* 1. 기본 정보 */}
          <Grid size={12}>
            <SectionHeader>{t('basicInfo')}</SectionHeader>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField label={t('ruleName')} fullWidth required value={formData.name}
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })} size="small"
                  InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }} />
                <TextField select label={t('severity')} sx={{ minWidth: 130 }} value={formData.severity}
                  onChange={(e) => onFormDataChange({ ...formData, severity: e.target.value })} size="small"
                  InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                  SelectProps={{ renderValue: (v) => <SeverityChip severity={v as string} /> }}>
                  {['info', 'low', 'medium', 'high', 'critical'].map((s) => (
                    <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}><SeverityChip severity={s} /></MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField label={t('ruleDescriptionLabel')} fullWidth multiline rows={2} value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })} size="small"
                InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }} />
            </Stack>
          </Grid>

          {/* 2. 이벤트 소스 + 조건 빌더 */}
          <Grid size={12}>
            <SectionHeader>{t('eventSource')}</SectionHeader>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  select label={t('sourceType')} sx={{ minWidth: 200 }} size="small"
                  value={formData.source_type || ''}
                  onChange={(e) => {
                    const st = e.target.value;
                    const stDef = sourceTypes.find(s => s.id === st);
                    const firstCond = stDef?.conditions[0]?.id || '';
                    const defaultConfig: Record<string, unknown> = { condition: firstCond };
                    if (st === 'healthcheck') defaultConfig.monitor_filter = '*';
                    if (st === 'auth') defaultConfig.account_filter = '*';
                    onFormDataChange({ ...formData, source_type: st, source_config: defaultConfig });
                  }}
                  InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                >
                  {sourceTypes.map((st) => (
                    <MenuItem key={st.id} value={st.id} sx={{ fontSize: '0.75rem' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{st.name}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{st.description}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('intervalMin')} type="number" sx={{ minWidth: 180 }}
                  value={formData.interval_min} size="small"
                  onChange={(e) => onFormDataChange({ ...formData, interval_min: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 1440, step: 1, style: { fontSize: '0.75rem' } }}
                  InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                />
              </Stack>

              {/* 조건 빌더 */}
              {currentSourceType && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1.5, display: 'block', fontSize: '0.7rem' }}>
                    {t('conditionBuilder')}
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      select label={t('condition')} size="small" fullWidth
                      value={selectedCondition}
                      onChange={(e) => updateSourceConfig({ condition: e.target.value, latency_threshold_ms: null, days_before: null, fail_threshold: null, time_window_min: null })}
                      InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                    >
                      {currentConditions.map((c) => (
                        <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
                      ))}
                    </TextField>

                    {/* 헬스체크: 모니터 필터 */}
                    {formData.source_type === 'healthcheck' && (
                      <TextField
                        label={t('monitorFilter')} size="small" fullWidth
                        value={(formData.source_config as Record<string, unknown>)?.monitor_filter || '*'}
                        onChange={(e) => updateSourceConfig({ monitor_filter: e.target.value })}
                        placeholder="* (전체) 또는 web-* (와일드카드)"
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                        InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                        helperText={t('monitorFilterHelp')}
                        FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }}
                      />
                    )}

                    {selectedCondition === 'latency_high' && (
                      <TextField
                        label={t('latencyThreshold')} type="number" size="small" fullWidth
                        value={(formData.source_config as Record<string, unknown>)?.latency_threshold_ms || ''}
                        onChange={(e) => updateSourceConfig({ latency_threshold_ms: parseInt(e.target.value) || null })}
                        inputProps={{ min: 1, style: { fontSize: '0.75rem' } }}
                        InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                        InputProps={{ endAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>ms</Typography> }}
                      />
                    )}

                    {selectedCondition === 'cert_expiring' && (
                      <TextField
                        label={t('certDaysBefore')} type="number" size="small" fullWidth
                        value={(formData.source_config as Record<string, unknown>)?.days_before || ''}
                        onChange={(e) => updateSourceConfig({ days_before: parseInt(e.target.value) || null })}
                        inputProps={{ min: 1, max: 365, style: { fontSize: '0.75rem' } }}
                        InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                        InputProps={{ endAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>{t('days')}</Typography> }}
                      />
                    )}

                    {/* 사용자 인증: 계정 필터 */}
                    {formData.source_type === 'auth' && (
                      <TextField
                        label={t('accountFilter')} size="small" fullWidth
                        value={(formData.source_config as Record<string, unknown>)?.account_filter || '*'}
                        onChange={(e) => updateSourceConfig({ account_filter: e.target.value })}
                        placeholder="* (전체) 또는 admin@* (와일드카드)"
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                        InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                        helperText={t('accountFilterHelp')}
                        FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }}
                      />
                    )}

                    {selectedCondition === 'login_fail_surge' && (
                      <Stack direction="row" spacing={2}>
                        <TextField
                          label={t('failThreshold')} type="number" size="small" fullWidth
                          value={(formData.source_config as Record<string, unknown>)?.fail_threshold || ''}
                          onChange={(e) => updateSourceConfig({ fail_threshold: parseInt(e.target.value) || null })}
                          inputProps={{ min: 1, style: { fontSize: '0.75rem' } }}
                          InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                          InputProps={{ endAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>{t('count')}</Typography> }}
                        />
                        <TextField
                          label={t('timeWindowMin')} type="number" size="small" fullWidth
                          value={(formData.source_config as Record<string, unknown>)?.time_window_min || ''}
                          onChange={(e) => updateSourceConfig({ time_window_min: parseInt(e.target.value) || null })}
                          inputProps={{ min: 1, max: 1440, style: { fontSize: '0.75rem' } }}
                          InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                          InputProps={{ endAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1 }}>{t('minutes')}</Typography> }}
                        />
                      </Stack>
                    )}
                  </Stack>

                  {/* 프리뷰 버튼 + 결과 */}
                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" size="small" fullWidth onClick={onPreview} disabled={previewLoading}
                      sx={{ fontSize: '0.75rem', height: 32 }}>
                      {previewLoading ? t('previewRunning') : t('previewCondition')}
                    </Button>
                    {previewResult && (
                      <Paper elevation={0} sx={{ mt: 1, p: 1.5, bgcolor: previewResult.would_trigger ? 'warning.lighter' : 'success.lighter', border: '1px solid', borderColor: previewResult.would_trigger ? 'warning.light' : 'success.light', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                          {previewResult.would_trigger
                            ? t('previewTriggered', { count: String(previewResult.matched_count) })
                            : t('previewNotTriggered')}
                        </Typography>
                        {previewResult.would_trigger && previewResult.details.length > 0 && (
                          <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
                            {previewResult.details.slice(0, 5).map((d, i) => (
                              <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.68rem', lineHeight: 1.6 }}>
                                {(d as Record<string, string>).monitor_name} — {(d as Record<string, string>).status || (d as Record<string, string>).url}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Paper>
                    )}
                  </Box>
                </Paper>
              )}
            </Stack>
          </Grid>

          {/* 3. 알림 메시지 템플릿 */}
          <Grid size={12}>
            <SectionHeader>{t('notificationMessageTemplate')}</SectionHeader>
            <TextField
              multiline fullWidth required rows={3} value={formData.message_template}
              onChange={(e) => onFormDataChange({ ...formData, message_template: e.target.value })}
              size="small" placeholder={t('messageTemplatePlaceholder')}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
              InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
              helperText={t('templateVarsHelp')}
              FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }}
            />
          </Grid>

          {/* 4. 수신 대상 */}
          <Grid size={12}>
            <SectionHeader>{t('notificationReceiverRoles')}</SectionHeader>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('selectReceiverRoles')}</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {roleCodes.map((rc) => (
                <FormControlLabel key={rc.code} control={
                  <Switch checked={formData.receiver?.values?.includes(rc.code) || false}
                    onChange={(e) => {
                      const cur = formData.receiver?.values || [];
                      const vals = e.target.checked ? [...cur, rc.code] : cur.filter((v: string) => v !== rc.code);
                      onFormDataChange({ ...formData, receiver: { ...formData.receiver, type: 'role', values: vals } });
                    }} />
                } label={getRoleNameFn ? getRoleNameFn(rc.code, roleNames, language) : rc.code}
                  slotProps={{ typography: { fontSize: '0.75rem' } }} />
              ))}
            </Stack>
          </Grid>

          {/* 5. Webhook */}
          <Grid size={12}>
            <SectionHeader>{t('webhookSettings')}</SectionHeader>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('webhookDescription')}</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField label={t('webhookUrl')} fullWidth size="small"
                  placeholder="http://192.168.1.100:8080/webhook"
                  value={formData.receiver?.webhook_url || ''}
                  onChange={(e) => onFormDataChange({ ...formData, receiver: { ...formData.receiver, webhook_url: e.target.value } })}
                  InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }} />
                <Button variant="outlined" size="small"
                  sx={{ whiteSpace: 'nowrap', minWidth: 80, height: 32, fontSize: '0.75rem' }}
                  disabled={!formData.receiver?.webhook_url} onClick={onTestWebhook}>
                  {t('testConnection')}
                </Button>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>{t('webhookHeaders')}</Typography>
                <WebhookHeadersEditor headers={webhookHeaders} onChange={(updated) => onWebhookHeadersChange?.(updated)} t={t} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>{t('webhookBody')}</Typography>
                <Box sx={{ height: 180, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', '&:focus-within': { borderColor: 'primary.main', borderWidth: 2 } }}>
                  <MonacoEditor height="100%" language="json" theme={monacoTheme} value={webhookBodyStr}
                    onChange={(val) => onWebhookBodyChange?.(val ?? '')}
                    options={{ minimap: { enabled: false }, fontSize: 12, lineNumbers: 'on', lineNumbersMinChars: 2, lineDecorationsWidth: 4, glyphMargin: false, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on' }} />
                </Box>
              </Box>
            </Stack>
          </Grid>

          {/* 6. 변경 이력 */}
          {isEditing && changeHistory.length > 0 && (
            <Grid size={12}>
              <SectionHeader>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <HistoryIcon sx={{ fontSize: 14 }} />{t('changeHistory')}
                </Box>
              </SectionHeader>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { px: 1.5, py: 0.75, fontSize: '0.75rem' } }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ textAlign: 'left', fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}>{t('date')}</Box>
                    <Box component="th" sx={{ textAlign: 'left', fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}>{t('author')}</Box>
                    <Box component="th" sx={{ textAlign: 'left', fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}>{t('changedItems')}</Box>
                  </tr>
                </thead>
                <tbody>
                  {changeHistory.map((entry, idx) => (
                    <tr key={idx}>
                      <Box component="td" sx={{ borderBottom: 1, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                        {new Date(entry.changed_at.endsWith('Z') ? entry.changed_at : entry.changed_at + 'Z').toLocaleString(language === 'ko' ? 'ko-KR' : language === 'ja' ? 'ja-JP' : language === 'cn' ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Seoul' })}
                      </Box>
                      <Box component="td" sx={{ borderBottom: 1, borderColor: 'divider' }}>{entry.user_id}</Box>
                      <Box component="td" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        {entry.changed_fields?.map(f => t(`field_${f}`) || f).join(', ') || '-'}
                      </Box>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Paper>
  );
};
