import type { ChangeHistoryEntry, NotificationRule } from '@/types';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { SeverityChip } from './SeverityChip';

interface NotificationRuleReadonlyProps {
  rule: NotificationRule;
  onEdit: () => void;
  t: (key: string, params?: Record<string, string>) => string;
  language?: string;
  roleNames?: Record<string, string>;
  getRoleName?: (code: string, names: Record<string, string>, lang: string) => string;
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', borderRadius: 0.5, mb: 1.5, mt: 2, '&:first-of-type': { mt: 0 } }}>
    <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {children}
    </Typography>
  </Box>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem', minWidth: 130, flexShrink: 0 }}>
    {children}
  </Typography>
);

const FieldValue: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.5, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
    {children}
  </Typography>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack direction="row" spacing={2} sx={{ py: 0.75, alignItems: 'flex-start' }}>
    <FieldLabel>{label}</FieldLabel>
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Stack>
);

const CONDITION_LABELS: Record<string, string> = {
  status_down: '상태 DOWN',
  latency_high: '레이턴시 초과',
  cert_expiring: '인증서 만료 임박',
  login_fail_surge: '로그인 실패 급증',
  account_locked: '계정 잠금 발생',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  healthcheck: '헬스체크',
  auth: '사용자 인증',
  bom: 'BOM',
  license: '라이선스',
};

export const NotificationRuleReadonly: React.FC<NotificationRuleReadonlyProps> = ({
  rule, onEdit, t, language = 'ko', roleNames = {}, getRoleName: getRoleNameFn,
}) => {
  const changeHistory: ChangeHistoryEntry[] = rule.change_history || [];
  const webhookHeaders = rule.receiver?.webhook_headers || {};
  const hasWebhook = !!(rule.receiver?.webhook_url);
  const sc = (rule.source_config || {}) as Record<string, unknown>;

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* 헤더 */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{t('ruleDetail')}</Typography>
        <Button variant="contained" color="primary" size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} onClick={onEdit}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
          {t('editRuleBtn')}
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>

        {/* 1. 기본 정보 */}
        <SectionHeader>{t('basicInfo')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('ruleName')}><FieldValue>{rule.name}</FieldValue></FieldRow>
          <FieldRow label={t('severity')}><SeverityChip severity={rule.severity} size="small" /></FieldRow>
          <FieldRow label={t('ruleDescriptionLabel')}><FieldValue>{rule.description || '-'}</FieldValue></FieldRow>
          <FieldRow label={t('activeStatus')}>
            <Chip label={rule.is_active ? t('active') : t('inactive')} size="small"
              color={rule.is_active ? 'success' : 'default'} variant={rule.is_active ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20 }} />
          </FieldRow>
        </Box>

        {/* 2. 이벤트 소스 */}
        <SectionHeader>{t('eventSource')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('sourceType')}>
            <Chip label={SOURCE_TYPE_LABELS[rule.source_type] || rule.source_type} size="small" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 22 }} />
          </FieldRow>
          <FieldRow label={t('condition')}>
            <FieldValue>{CONDITION_LABELS[sc.condition as string] || (sc.condition as string) || '-'}</FieldValue>
          </FieldRow>
          <FieldRow label={t('monitorFilter')}>
            <FieldValue mono>{(sc.monitor_filter as string) || '*'}</FieldValue>
          </FieldRow>
          {sc.condition === 'latency_high' && sc.latency_threshold_ms && (
            <FieldRow label={t('latencyThreshold')}>
              <FieldValue mono>{String(sc.latency_threshold_ms)} ms</FieldValue>
            </FieldRow>
          )}
          {sc.condition === 'cert_expiring' && sc.days_before && (
            <FieldRow label={t('certDaysBefore')}>
              <FieldValue mono>{String(sc.days_before)} {t('days')}</FieldValue>
            </FieldRow>
          )}
          {rule.source_type === 'auth' && (
            <FieldRow label={t('accountFilter')}>
              <FieldValue mono>{(sc.account_filter as string) || '*'}</FieldValue>
            </FieldRow>
          )}
          {sc.condition === 'login_fail_surge' && (
            <>
              <FieldRow label={t('failThreshold')}>
                <FieldValue mono>{String(sc.fail_threshold)} {t('count')}</FieldValue>
              </FieldRow>
              <FieldRow label={t('timeWindowMin')}>
                <FieldValue mono>{String(sc.time_window_min)} {t('minutes')}</FieldValue>
              </FieldRow>
            </>
          )}
          <FieldRow label={t('intervalMin')}>
            <FieldValue>{rule.interval_min} {t('minutes')}</FieldValue>
          </FieldRow>
        </Box>

        {/* 3. 메시지 템플릿 */}
        <SectionHeader>{t('notificationMessageTemplate')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto', maxHeight: 200 }}>
            <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', m: 0 }}>
              {rule.message_template || '-'}
            </Typography>
          </Paper>
        </Box>

        {/* 4. 수신 대상 / Webhook */}
        <SectionHeader>{t('notificationReceiverRoles')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('receiverRoles')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(rule.receiver?.values || []).length > 0 ? rule.receiver.values.map((code) => (
                <Chip key={code} label={getRoleNameFn ? getRoleNameFn(code, roleNames, language) : code}
                  size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
              )) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>-</Typography>
              )}
            </Stack>
          </FieldRow>
          {hasWebhook && (
            <>
              <FieldRow label={t('webhookUrl')}>
                <Link href={rule.receiver.webhook_url} target="_blank" rel="noopener noreferrer"
                  sx={{ fontSize: '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {rule.receiver.webhook_url}
                </Link>
              </FieldRow>
              {Object.keys(webhookHeaders).length > 0 && (
                <FieldRow label={t('webhookHeaders')}>
                  <Stack spacing={0.25}>
                    {Object.entries(webhookHeaders).map(([key, value]) => (
                      <FieldValue key={key} mono>{key}: {value}</FieldValue>
                    ))}
                  </Stack>
                </FieldRow>
              )}
              {rule.receiver.webhook_body && (
                <FieldRow label={t('webhookBody')}>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto', maxHeight: 150 }}>
                    <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', m: 0 }}>
                      {rule.receiver.webhook_body}
                    </Typography>
                  </Paper>
                </FieldRow>
              )}
            </>
          )}
        </Box>

        {/* 5. 변경 이력 */}
        {changeHistory.length > 0 && (
          <>
            <SectionHeader>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <HistoryIcon sx={{ fontSize: 14 }} />{t('changeHistory')}
              </Box>
            </SectionHeader>
            <Box sx={{ px: 0.5, pb: 2 }}>
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
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};
