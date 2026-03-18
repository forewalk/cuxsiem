import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Link,
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
import { SeverityChip } from '@/components/shared/SeverityChip';
import type { SigmaRuleDetail as SigmaRuleDetailType } from '@/types';

interface DetectionRuleDetailProps {
  rule: SigmaRuleDetailType | null;
  t: (key: string, params?: Record<string, string>) => string;
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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

export const DetectionRuleDetail: React.FC<DetectionRuleDetailProps> = ({ rule, t, loading, onEdit, onDelete }) => {
  const [detectionExpanded, setDetectionExpanded] = useState(false);

  if (!rule) {
    return (
      <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {loading ? '' : t('drSelectRulePrompt')}
        </Typography>
      </Paper>
    );
  }

  const detectionText = rule.detection_config
    ? JSON.stringify(rule.detection_config, null, 2)
    : '-';

  const isActive = rule.status === 'active';

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
            {t('drRuleDetail')}
          </Typography>
          <Chip
            label={rule.type === 'custom' ? t('drRuleTypeCustom') : t('drRuleTypeSigma')}
            size="small"
            color={rule.type === 'custom' ? 'secondary' : 'default'}
            variant="outlined"
            sx={{ fontSize: '0.6rem', height: 20 }}
          />
        </Stack>
        {rule.type === 'custom' && (
          <Stack direction="row" spacing={0.5}>
            {onEdit && <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>}
            {onDelete && <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon fontSize="small" /></IconButton>}
          </Stack>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>

        <SectionHeader>{t('drSectionSummary')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drRuleName')}>
            <FieldValue>{rule.name}</FieldValue>
          </FieldRow>
          <FieldRow label={t('severity')}>
            <SeverityChip severity={rule.level_normalized} size="small" />
          </FieldRow>
          <FieldRow label={t('drLogSource')}>
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              {rule.log_source_product && (
                <Chip label={rule.log_source_product} size="small" variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '0.65rem', height: 20 }} />
              )}
              {rule.log_source_category && (
                <Chip label={rule.log_source_category} size="small" variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '0.65rem', height: 20 }} />
              )}
              {rule.log_source_service && (
                <Chip label={rule.log_source_service} size="small" variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '0.65rem', height: 20 }} />
              )}
            </Stack>
          </FieldRow>
          <FieldRow label={t('drDescription')}>
            <FieldValue>{rule.description || '-'}</FieldValue>
          </FieldRow>
        </Box>

        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {t('drSectionDetection')}
            <IconButton size="small" onClick={() => setDetectionExpanded(!detectionExpanded)}>
              {detectionExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </SectionHeader>
        <Collapse in={detectionExpanded}>
          <Box sx={{ px: 0.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 320,
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'text.primary',
                  m: 0,
                }}
              >
                {detectionText}
              </Typography>
            </Paper>
          </Box>
        </Collapse>

        <SectionHeader>{t('drSectionClassification')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drMitreTags')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {rule.mitre_tactic_ids.map((tactic) => (
                <Chip key={tactic} label={tactic} size="small" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20, fontFamily: 'monospace' }} />
              ))}
            </Stack>
          </FieldRow>
          <FieldRow label={t('drTechnique')}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {rule.mitre_technique_ids.map((tech) => (
                <Chip key={tech} label={tech} size="small" color="primary" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20, fontWeight: 'bold', fontFamily: 'monospace' }} />
              ))}
            </Stack>
          </FieldRow>
          <FieldRow label={t('severity')}>
            <SeverityChip severity={rule.level_normalized} size="small" />
          </FieldRow>
        </Box>

        <SectionHeader>{t('drSectionDocumentation')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drAuthor')}>
            <FieldValue>{rule.author || '-'}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drReferences')}>
            <Stack spacing={0.5}>
              {rule.references.length > 0 ? rule.references.map((ref, i) => (
                <Link key={i} href={ref} target="_blank" rel="noopener noreferrer"
                  sx={{ fontSize: '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {ref}
                </Link>
              )) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>-</Typography>
              )}
            </Stack>
          </FieldRow>
          <FieldRow label={t('drFalsePositives')}>
            <Stack spacing={0.25}>
              {rule.false_positives.length > 0 ? rule.false_positives.map((fp, i) => (
                <FieldValue key={i}>{fp}</FieldValue>
              )) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>-</Typography>
              )}
            </Stack>
          </FieldRow>
          {rule.license && (
            <FieldRow label={t('drLicense')}>
              <FieldValue>{rule.license}</FieldValue>
            </FieldRow>
          )}
        </Box>

        <SectionHeader>{t('drSectionMetadata')}</SectionHeader>
        <Box sx={{ px: 0.5, pb: 2 }}>
          <FieldRow label={t('drRuleId')}>
            <FieldValue mono>{rule.sigma_id}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drRuleStatus')}>
            <Chip
              label={rule.sigma_status || '-'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.6rem', height: 20, textTransform: 'capitalize' }}
            />
          </FieldRow>
          <FieldRow label={t('drEnabled')}>
            <Chip
              label={isActive ? t('drEnabled') : t('drDisabled')}
              size="small"
              color={isActive ? 'success' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20 }}
            />
          </FieldRow>
          <FieldRow label={t('drRevision')}>
            <FieldValue mono>{rule.revision}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drLastUpdated')}>
            <FieldValue mono>{rule.updated_at ? new Date(rule.updated_at).toLocaleString() : '-'}</FieldValue>
          </FieldRow>
        </Box>
      </Box>
    </Paper>
  );
};
