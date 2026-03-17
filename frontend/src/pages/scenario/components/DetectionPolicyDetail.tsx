import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import React, { useState } from 'react';
import { SeverityChip } from '../../admin/alerts/components/SeverityChip';
import type { DetectionPolicy, DetectionEvent } from '@/types';

interface DetectionPolicyDetailProps {
  policy: DetectionPolicy | null;
  events: DetectionEvent[];
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onEventStatusChange?: (eventId: string, status: string) => void;
  t: (key: string) => string;
}

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

const EVENT_STATUS_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  new: 'error',
  acknowledged: 'warning',
  resolved: 'success',
  false_positive: 'default',
};

export const DetectionPolicyDetail: React.FC<DetectionPolicyDetailProps> = ({
  policy,
  events,
  loading,
  onEdit,
  onDelete,
  t,
}) => {
  const [queryExpanded, setQueryExpanded] = useState(false);

  if (!policy) {
    return (
      <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {loading ? '' : t('dpSelectPolicyPrompt')}
        </Typography>
      </Paper>
    );
  }

  const dslText = policy.condition_config ? JSON.stringify(policy.condition_config, null, 2) : '-';

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {t('dpPolicyDetail')}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {onEdit && <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>}
          {onDelete && <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon fontSize="small" /></IconButton>}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>
        <SectionHeader>{t('dpSectionBasic')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpPolicyName')}><FieldValue>{policy.name}</FieldValue></FieldRow>
          <FieldRow label={t('dpSeverity')}><SeverityChip severity={policy.severity} size="small" /></FieldRow>
          <FieldRow label={t('dpTargetIndex')}><FieldValue mono>{policy.target_index}</FieldValue></FieldRow>
          <FieldRow label={t('dpDescription')}><FieldValue>{policy.description || '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpInterval')}><FieldValue>{policy.interval_min}분</FieldValue></FieldRow>
          <FieldRow label={t('dpActive')}>
            <Chip
              label={policy.is_active ? t('dpActive') : t('dpInactive')}
              size="small"
              color={policy.is_active ? 'success' : 'default'}
              variant={policy.is_active ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20 }}
            />
          </FieldRow>
        </Box>

        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {t('dpSectionQuery')}
            <IconButton size="small" onClick={() => setQueryExpanded(!queryExpanded)}>
              {queryExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </SectionHeader>
        <Collapse in={queryExpanded}>
          <Box sx={{ px: 0.5 }}>
            <Paper elevation={0}
              sx={{ p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto', maxHeight: 280 }}>
              <Typography component="pre"
                sx={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
                {dslText}
              </Typography>
            </Paper>
            {policy.trigger_condition && (
              <Box sx={{ mt: 1 }}>
                <FieldRow label={t('dpTriggerCondition')}><FieldValue mono>{policy.trigger_condition}</FieldValue></FieldRow>
              </Box>
            )}
          </Box>
        </Collapse>

        <SectionHeader>{t('dpSectionClassification')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpMitreTactics')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(policy.mitre_tactic_ids ?? []).length > 0 ? policy.mitre_tactic_ids.map(t_id => (
                <Chip key={t_id} label={t_id} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20, fontFamily: 'monospace' }} />
              )) : <Typography variant="caption" color="text.disabled">-</Typography>}
            </Stack>
          </FieldRow>
          <FieldRow label={t('dpMitreTechniques')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(policy.mitre_technique_ids ?? []).length > 0 ? policy.mitre_technique_ids.map(tid => (
                <Chip key={tid} label={tid} size="small" color="primary" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20, fontWeight: 'bold', fontFamily: 'monospace' }} />
              )) : <Typography variant="caption" color="text.disabled">-</Typography>}
            </Stack>
          </FieldRow>
        </Box>

        <SectionHeader>{t('dpSectionOperation')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('dpLastRun')}><FieldValue mono>{policy.last_run_at ? new Date(policy.last_run_at).toLocaleString() : '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpLastTriggered')}><FieldValue mono>{policy.last_triggered_at ? new Date(policy.last_triggered_at).toLocaleString() : '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpTotalEvents')}><FieldValue>{policy.total_events_count}</FieldValue></FieldRow>
          <FieldRow label={t('dpCreatedBy')}><FieldValue>{policy.created_by || '-'}</FieldValue></FieldRow>
          <FieldRow label={t('dpCreatedAt')}><FieldValue mono>{new Date(policy.created_at).toLocaleString()}</FieldValue></FieldRow>
        </Box>

        {/* 최근 이벤트 */}
        <Divider sx={{ my: 2 }} />
        <SectionHeader>{t('dpRecentEvents')}</SectionHeader>
        {events.length > 0 ? (
          <List disablePadding sx={{ px: 0.5 }}>
            {events.map(ev => (
              <ListItemButton key={ev.id} sx={{ py: 0.75, px: 1, borderBottom: 1, borderColor: 'divider', borderRadius: 0.5 }}>
                <ListItemText
                  primary={ev.message || `${ev.matched_count}건 매칭`}
                  secondary={ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
                  primaryTypographyProps={{ variant: 'caption', fontWeight: 600, fontSize: '0.72rem' }}
                  secondaryTypographyProps={{ variant: 'caption', fontSize: '0.62rem' }}
                />
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <SeverityChip severity={ev.severity} size="small" />
                  <Chip
                    label={ev.status}
                    size="small"
                    color={EVENT_STATUS_COLORS[ev.status] ?? 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.58rem', height: 18, textTransform: 'capitalize' }}
                  />
                </Stack>
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="caption" color="text.disabled" sx={{ px: 0.5, display: 'block', pb: 2 }}>
            {t('dpNoEvents')}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
