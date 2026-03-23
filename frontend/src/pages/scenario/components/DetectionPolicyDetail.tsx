import { SeverityChip } from '@/components/shared/SeverityChip';
import type { Detector, Finding, SigmaRuleListItem } from '@/types';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React from 'react';

interface DetectionPolicyDetailProps {
  detector: Detector | null;
  findings: Finding[];
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRuleClick?: (ruleId: string) => void;
  rules?: SigmaRuleListItem[];
  linkedRuleNames?: Record<string, string>;
  t: (key: string) => string;
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem', minWidth: 130, flexShrink: 0 }}>
    {children}
  </Typography>
);

const TRIGGER_METRIC_LABELS: Record<string, string> = { total: 'dpTriggerMetricTotal' };
function formatTriggerCondition(raw: string, t: (k: string) => string): string {
  const m = raw.trim().match(/^(\w+)\s*(>=|<=|>|<|==|!=)\s*(-?\d+)$/);
  if (!m) return raw;
  const label = TRIGGER_METRIC_LABELS[m[1]] ? t(TRIGGER_METRIC_LABELS[m[1]]) : m[1];
  return `${label} ${m[2]} ${m[3]}`;
}

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

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{
    px: 1.5, py: 0.75,
    bgcolor: 'action.hover',
    borderRadius: 0.5,
    mb: 1.5,
    mt: 2,
    '&:first-of-type': { mt: 0 },
  }}>
    <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {children}
    </Typography>
  </Box>
);

const FINDING_STATUS_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  new: 'error',
  acknowledged: 'warning',
  resolved: 'success',
  false_positive: 'default',
};

export const DetectionPolicyDetail: React.FC<DetectionPolicyDetailProps> = ({
  detector,
  findings,
  loading,
  onEdit,
  onDelete,
  onRuleClick,
  rules = [],
  linkedRuleNames,
  t,
}) => {
  const ruleNameMap = React.useMemo(() => {
    if (linkedRuleNames && Object.keys(linkedRuleNames).length > 0) return linkedRuleNames;
    const map: Record<string, string> = {};
    for (const r of rules) map[r.id] = r.name;
    return map;
  }, [rules, linkedRuleNames]);

  if (!detector) {
    return (
      <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {loading ? '' : t('dpSelectDetectorPrompt')}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {t('dpDetectorDetail')}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {onEdit && <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>}
          {onDelete && <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon fontSize="small" /></IconButton>}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>
        <SectionHeader>{t('dpSectionBasic')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpDetectorName')}><FieldValue>{detector.name}</FieldValue></FieldRow>
          <FieldRow label={t('dpDetectorType')}>
            <Chip label={detector.detector_type || '-'} size="small" variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.6rem', height: 20 }} />
          </FieldRow>
          <FieldRow label={t('dpSeverity')}><SeverityChip severity={detector.severity} size="small" /></FieldRow>
          <FieldRow label={t('dpTargetIndices')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(detector.target_indices ?? []).map((idx) => (
                <Chip key={idx} label={idx} size="small" variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20, fontFamily: 'monospace' }} />
              ))}
            </Stack>
          </FieldRow>
          <FieldRow label={t('dpDescription')}><FieldValue>{detector.description || '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpInterval')}><FieldValue>{detector.schedule_interval_min}분</FieldValue></FieldRow>
          <FieldRow label={t('dpActive')}>
            <Chip
              label={detector.is_active ? t('dpActive') : t('dpInactive')}
              size="small"
              color={detector.is_active ? 'success' : 'default'}
              variant={detector.is_active ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20 }}
            />
          </FieldRow>
          {detector.trigger_condition && (
            <FieldRow label={t('dpTriggerCondition')}><FieldValue mono>{formatTriggerCondition(detector.trigger_condition, t)}</FieldValue></FieldRow>
          )}
        </Box>
        {/* ───────────────────────────연결된 규칙──────────────────────── */}
        <SectionHeader>{t('dpSectionRules')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpLinkedRules')}>
            <Stack direction="column" gap={0.5}>
              {(detector.linked_rule_ids ?? []).length > 0 ? detector.linked_rule_ids.map((ruleId) => (
                <Chip
                  key={ruleId}
                  label={ruleNameMap[ruleId] || ruleId}
                  size="small"
                  variant="outlined"
                  title={ruleId}
                  clickable={!!onRuleClick}
                  onClick={onRuleClick ? () => onRuleClick(ruleId) : undefined}
                  sx={{
                    fontSize: '0.62rem', height: 22, maxWidth: 360, justifyContent: 'flex-start',
                    ...(onRuleClick && { cursor: 'pointer', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }),
                  }}
                />
              )) : <Typography variant="caption" color="text.disabled">-</Typography>}
            </Stack>
          </FieldRow>

          {(detector.field_mappings ?? []).length > 0 && (
            <Box sx={{ mt: 1 }}>
              <FieldLabel>{t('dpFieldMappings')}</FieldLabel>
              <Table size="small" sx={{ mt: 0.5, '& td, & th': { py: 0.5, px: 1, fontSize: '0.68rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rule Field</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Log Field</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detector.field_mappings.map((fm, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{fm.rule_field}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{fm.log_field}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
        {/* ──────────────────────────── Webhook ──────────────────────── */}
        {detector.webhook_url && (
          <>
            <SectionHeader>{t('dpSectionWebhook')}</SectionHeader>
            <Box sx={{ px: 0.5 }}>
              <FieldRow label={t('dpWebhookUrl')}><FieldValue mono>{detector.webhook_url}</FieldValue></FieldRow>
              {detector.webhook_headers && Object.keys(detector.webhook_headers).length > 0 && (
                <FieldRow label={t('dpWebhookHeaders')}>
                  <Box component="pre" sx={{ m: 0, fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {Object.entries(detector.webhook_headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
                  </Box>
                </FieldRow>
              )}
              {detector.webhook_body && (
                <FieldRow label={t('dpWebhookBody')}>
                  <Box component="pre" sx={{ m: 0, fontSize: '0.72rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {detector.webhook_body}
                  </Box>
                </FieldRow>
              )}
            </Box>
          </>
        )}

        {/* ───────────────────────────운영 정보──────────────────────── */}
        <SectionHeader>{t('dpSectionOperation')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpLastRun')}><FieldValue mono>{detector.last_run_at ? new Date(detector.last_run_at).toLocaleString() : '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpLastTriggered')}><FieldValue mono>{detector.last_triggered_at ? new Date(detector.last_triggered_at).toLocaleString() : '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpTotalFindings')}><FieldValue>{detector.total_findings_count}</FieldValue></FieldRow>
          <FieldRow label={t('dpCreatedBy')}><FieldValue>{detector.created_by || '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpCreatedAt')}><FieldValue mono>{detector.created_at ? new Date(detector.created_at).toLocaleString() : '-'}</FieldValue></FieldRow>
        </Box>

        {/* ──────────────────────────── 변경 이력 ──────────────────────── */}
        {(detector.change_history ?? []).length > 0 && (
          <>
            <SectionHeader>{t('dpSectionChangeHistory')}</SectionHeader>
            <Table size="small" sx={{ '& td, & th': { py: 0.5, px: 1, fontSize: '0.68rem' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('dpChangeDate')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('dpChangeUser')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('dpChangeFields')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detector.change_history!.slice(-10).reverse().map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {new Date(entry.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.user_id}</TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {entry.changed_fields.map(f => (
                          <Chip key={f} label={f} size="small" variant="outlined"
                            sx={{ fontSize: '0.58rem', height: 18 }} />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        <Divider sx={{ my: 2 }} />
        <SectionHeader>{t('dpRecentFindings')}</SectionHeader>
        {findings.length > 0 ? (
          <List disablePadding sx={{ px: 0.5 }}>
            {findings.map(finding => (
              <ListItemButton key={finding.id} sx={{ py: 0.75, px: 1, borderBottom: 1, borderColor: 'divider', borderRadius: 0.5 }}>
                <ListItemText
                  primary={finding.message || `${finding.matched_count}건 매칭`}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      {finding.rule_name && (
                        <Chip label={finding.rule_name} size="small" variant="outlined"
                          sx={{ fontSize: '0.55rem', height: 16, maxWidth: 120 }} />
                      )}
                      <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        {finding.created_at ? new Date(finding.created_at).toLocaleString() : ''}
                      </Typography>
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'caption', fontWeight: 600, fontSize: '0.72rem' }}
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <SeverityChip severity={finding.severity} size="small" />
                  <Chip
                    label={finding.status}
                    size="small"
                    color={FINDING_STATUS_COLORS[finding.status] ?? 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.58rem', height: 18, textTransform: 'capitalize' }}
                  />
                </Stack>
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, display: 'block', pb: 2 }}>
            {t('dpNoFindings')}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
