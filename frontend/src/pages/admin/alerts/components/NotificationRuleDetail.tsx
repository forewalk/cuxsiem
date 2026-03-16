import type { ChangeHistoryEntry, NotificationRuleCreate } from '@/types';
import MonacoEditor from '@monaco-editor/react';
import HistoryIcon from '@mui/icons-material/History';
import {
  Alert,
  Box,
  Button,
  Divider,
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
import { SeverityChip } from './SeverityChip';
import { WebhookHeadersEditor, type HeaderEntry } from './WebhookHeadersEditor';

interface RoleCode {
  code: string;
}

interface NotificationRuleDetailProps {
  showForm: boolean;
  isEditing: boolean;
  formData: NotificationRuleCreate;
  onFormDataChange: (data: NotificationRuleCreate) => void;
  onSave: () => void;
  onDelete: () => void;
  t: (key: string, params?: Record<string, string>) => string;

  // DSL editor
  dslString?: string;
  onDslChange?: (value: string) => void;
  jsonError?: string | null;

  // Query test
  onTestQuery?: () => void;
  queryTestLoading?: boolean;
  queryTestResult?: any;
  queryTestError?: string | null;

  // Trigger test
  onTestTrigger?: () => void;
  triggerTestLoading?: boolean;
  triggerTestResult?: { evaluation: boolean; total: number; has_aggregations: boolean } | null;
  triggerTestError?: string | null;

  // Message preview
  renderMessagePreview?: string;

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

  // Save disabled
  saveDisabled?: boolean;

  // 변경 이력
  changeHistory?: ChangeHistoryEntry[];
  createdAt?: string;
}

export const NotificationRuleDetail: React.FC<NotificationRuleDetailProps> = ({
  showForm,
  isEditing,
  formData,
  onFormDataChange,
  onSave,
  t,
  dslString = '',
  onDslChange,
  jsonError,
  onTestQuery,
  queryTestLoading,
  queryTestResult,
  queryTestError,
  onTestTrigger,
  triggerTestLoading,
  triggerTestResult,
  triggerTestError,
  renderMessagePreview,
  webhookHeaders = [{ key: '', value: '' }],
  onWebhookHeadersChange,
  webhookBodyStr = '',
  onWebhookBodyChange,
  onTestWebhook,
  roleCodes = [],
  roleNames = {},
  language = 'ko',
  getRoleName: getRoleNameFn,
  saveDisabled,
  changeHistory = [],
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

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* 헤더 */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {isEditing ? t('editRule') : t('addRule')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={onSave}
            disabled={saveDisabled}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            {t('save')}
          </Button>
        </Stack>
      </Box>

      {/* 스크롤 가능한 폼 영역 */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Grid container spacing={3}>

          {/* 1. 기본 정보 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.8rem' }}>{t('basicInfo')}</Typography>
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
                    <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>
                      <SeverityChip severity={s} />
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField label={t('ruleDescriptionLabel')} fullWidth multiline rows={2} value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })} size="small"
                InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }} />
            </Stack>
          </Grid>

          <Grid size={12}><Divider /></Grid>

          {/* 2. 탐지 로직 및 주기 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.8rem' }}>{t('detectionCondition')}</Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label={t('targetIndex')} fullWidth value={formData.target_index}
                onChange={(e) => onFormDataChange({ ...formData, target_index: e.target.value })}
                size="small" placeholder="logs-sentinel_one.edr"
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
              />
              <TextField
                label={t('intervalMin')} type="number" sx={{ minWidth: 180 }}
                value={formData.interval_min}
                onChange={(e) => onFormDataChange({ ...formData, interval_min: parseInt(e.target.value) })}
                size="small"
                inputProps={{ min: 1, max: 1440, step: 1, style: { fontSize: '0.75rem' } }}
                InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ height: 500 }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                  {t('defineExtractionQuery')}
                </Typography>
                <Box sx={{
                  flex: 1, border: '1px solid',
                  borderColor: jsonError ? 'error.main' : 'divider',
                  borderRadius: 1, overflow: 'hidden',
                  '&:focus-within': { borderColor: jsonError ? 'error.main' : 'primary.main', borderWidth: 2 },
                  '& .monaco-editor .line-numbers': { textAlign: 'center !important' }
                }}>
                  <MonacoEditor
                    height="100%" language="json" theme={monacoTheme}
                    value={dslString}
                    onChange={(val) => onDslChange?.(val ?? '')}
                    options={{
                      minimap: { enabled: false }, fontSize: 12,
                      lineNumbers: 'on', lineNumbersMinChars: 2, lineDecorationsWidth: 4,
                      glyphMargin: false, scrollBeyondLastLine: false, automaticLayout: true,
                      tabSize: 2, wordWrap: 'on', formatOnPaste: true, formatOnType: true,
                      bracketPairColorization: { enabled: true },
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    }}
                  />
                </Box>
                {jsonError && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{jsonError}</Typography>}
                <Box sx={{ mt: 1 }}>
                  <Button variant="contained" color="primary" onClick={onTestQuery}
                    disabled={queryTestLoading || !!jsonError} size="small" fullWidth
                    sx={{ fontSize: '0.75rem', height: 32 }}>
                    {queryTestLoading ? t('queryRunning') : t('runQuery')}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                  {t('extractionQueryResponse')}
                </Typography>
                <Paper elevation={0} sx={{ flex: 1, p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {queryTestLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{t('queryRunning')}</Typography>
                    </Box>
                  ) : queryTestError ? (
                    <Alert severity="error">{queryTestError}</Alert>
                  ) : queryTestResult ? (
                    <Box sx={{ flex: 1, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', lineHeight: 1.6 }}>
                      {JSON.stringify(queryTestResult, null, 2)}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{t('runQueryPrompt')}</Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Stack>

            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label={t('triggerConditionLabel')} fullWidth
                  value={formData.trigger_condition || ''}
                  onChange={(e) => onFormDataChange({ ...formData, trigger_condition: e.target.value })}
                  size="small" placeholder={t('triggerConditionPlaceholder')}
                  helperText={triggerTestError || t('triggerConditionHelper')}
                  error={!!triggerTestError}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                  InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                  FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }}
                  sx={{ flex: 1 }}
                />
                <Button variant="outlined" onClick={onTestTrigger}
                  disabled={triggerTestLoading || !!jsonError}
                  size="small" sx={{ height: 32, whiteSpace: 'nowrap', minWidth: 80, fontSize: '0.75rem' }}>
                  {triggerTestLoading ? t('queryRunning') : t('testTrigger')}
                </Button>
                <Box sx={{ height: 32, minWidth: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {triggerTestLoading ? '...' : triggerTestResult !== null && triggerTestResult !== undefined ? String(triggerTestResult.evaluation) : '-'}
                </Box>
              </Stack>
            </Box>
          </Grid>

          <Grid size={12}><Divider /></Grid>

          {/* 3. 알림 메시지 템플릿 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.8rem' }}>{t('notificationMessageTemplate')}</Typography>
            <Stack direction="row" spacing={2} sx={{ height: 400 }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>{t('messageTemplate')}</Typography>
                <TextField
                  multiline fullWidth required value={formData.message_template}
                  onChange={(e) => onFormDataChange({ ...formData, message_template: e.target.value })}
                  size="small" placeholder={t('messageTemplatePlaceholder')}
                  inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                  sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' }, '& textarea': { height: '100% !important', overflow: 'auto !important' } }}
                />
              </Box>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>{t('messagePreview')}</Typography>
                <Paper elevation={0} sx={{ flex: 1, p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
                  {formData.message_template ? (
                    <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.8, fontSize: '0.75rem' }}>
                      {renderMessagePreview}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>{t('messagePreviewEmpty')}</Typography>
                  )}
                  {!queryTestResult && formData.message_template && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
                      <Typography variant="caption" color="info.dark">{t('runQueryPreviewHint')}</Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Stack>
          </Grid>

          <Grid size={12}><Divider /></Grid>

          {/* 4. 알림 수신 대상 역할 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.8rem' }}>{t('notificationReceiverRoles')}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('selectReceiverRoles')}</Typography>
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
                        onFormDataChange({ ...formData, receiver: { ...formData.receiver, type: 'role', values: newValues } });
                      }}
                    />
                  }
                  label={getRoleNameFn ? getRoleNameFn(rc.code, roleNames, language) : rc.code}
                  slotProps={{ typography: { fontSize: '0.75rem' } }}
                />
              ))}
            </Stack>
          </Grid>

          <Grid size={12}><Divider /></Grid>

          {/* 5. Webhook 설정 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, fontSize: '0.8rem' }}>{t('webhookSettings')}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('webhookDescription')}</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label={t('webhookUrl')} fullWidth size="small"
                  placeholder="http://192.168.1.100:8080/webhook"
                  value={formData.receiver?.webhook_url || ''}
                  onChange={(e) => onFormDataChange({ ...formData, receiver: { ...formData.receiver, webhook_url: e.target.value } })}
                  InputProps={{ sx: { fontSize: '0.75rem' } }} InputLabelProps={{ sx: { fontSize: '0.75rem' } }}
                />
                <Button variant="outlined" size="small"
                  sx={{ whiteSpace: 'nowrap', minWidth: 80, height: 32, fontSize: '0.75rem' }}
                  disabled={!formData.receiver?.webhook_url}
                  onClick={onTestWebhook}>
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
                  <MonacoEditor
                    height="100%" language="json" theme={monacoTheme}
                    value={webhookBodyStr}
                    onChange={(val) => onWebhookBodyChange?.(val ?? '')}
                    options={{
                      minimap: { enabled: false }, fontSize: 12,
                      lineNumbers: 'on', lineNumbersMinChars: 2, lineDecorationsWidth: 4,
                      glyphMargin: false, scrollBeyondLastLine: false, automaticLayout: true,
                      tabSize: 2, wordWrap: 'on',
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          </Grid>

          {/* 6. 변경 이력 (편집 모드에서만 표시) */}
          {isEditing && changeHistory.length > 0 && (
            <>
              <Grid size={12}><Divider /></Grid>
              <Grid size={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{t('changeHistory')}</Typography>
                </Box>
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
                        <Box component="td" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                          {entry.user_id}
                        </Box>
                        <Box component="td" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                          {entry.changed_fields?.map(f => t(`field_${f}`) || f).join(', ') || '-'}
                        </Box>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Paper>
  );
};
