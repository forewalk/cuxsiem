import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import type { FieldMapping, SigmaRuleDetail as SigmaRuleDetailType } from '@/types';

interface DetectionRuleDetailProps {
  rule: SigmaRuleDetailType | null;
  t: (key: string, params?: Record<string, string>) => string;
  loading?: boolean;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
  onReconvert?: (id: string) => Promise<void>;
  reconverting?: boolean;
}

const FieldLabel: React.FC<{ children: React.ReactNode; compact?: boolean }> = ({ children, compact }) => (
  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem', minWidth: compact ? 72 : 130, flexShrink: 0 }}>
    {children}
  </Typography>
);

const FieldValue: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.5, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
    {children}
  </Typography>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode; compact?: boolean }> = ({ label, children, compact }) => (
  <Stack direction="row" spacing={compact ? 1 : 2} sx={{ py: 0.75, alignItems: 'flex-start' }}>
    <FieldLabel compact={compact}>{label}</FieldLabel>
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

const mapCellSx = { fontSize: '0.72rem', py: 0.5, px: 1, fontFamily: 'monospace' } as const;
const mapHeadCellSx = { ...mapCellSx, fontWeight: 'bold', color: 'text.secondary', fontFamily: 'inherit' } as const;

export const DetectionRuleDetail: React.FC<DetectionRuleDetailProps> = ({ rule, t, loading, compact, onEdit, onDelete, onClone, onReconvert, reconverting }) => {
  const [detectionExpanded, setDetectionExpanded] = useState(false);
  const [sourceSigmaName, setSourceSigmaName] = useState<string | null>(null);
  const [previewMappings, setPreviewMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    if (rule?.source_sigma_id) {
      setSourceSigmaName(null);
      detectionRuleService.getById(rule.source_sigma_id).then(r => {
        if (r?.name) setSourceSigmaName(r.name);
      }).catch(() => {});
    } else {
      setSourceSigmaName(null);
    }
  }, [rule?.source_sigma_id]);

  useEffect(() => {
    if (!rule?.id) { setPreviewMappings([]); return; }
    if (rule.applied_field_mappings && rule.applied_field_mappings.length > 0) {
      setPreviewMappings([]);
      return;
    }
    const ruleIdForPreview = rule.type === 'sigma' ? rule.id : rule.source_sigma_id;
    if (!ruleIdForPreview) { setPreviewMappings([]); return; }
    let cancelled = false;
    detectionRuleService.convertPreview(ruleIdForPreview).then(preview => {
      if (!cancelled) {
        const mappings = (preview?.applied_mappings ?? []).filter(
          (m: { rule_field: string; log_field: string }) => m.rule_field,
        );
        setPreviewMappings(mappings);
      }
    }).catch(() => { if (!cancelled) setPreviewMappings([]); });
    return () => { cancelled = true; };
  }, [rule?.id, rule?.type, rule?.source_sigma_id, rule?.applied_field_mappings]);

  const displayMappings = (rule?.applied_field_mappings && rule.applied_field_mappings.length > 0)
    ? rule.applied_field_mappings
    : previewMappings;

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
          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
            {rule.type === 'custom' ? t('drRuleTypeCustom') : t('drRuleTypeSigma')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {rule.type === 'sigma' && onClone && (
            <IconButton size="small" onClick={onClone} title={t('drCloneToCustom')}>
              <CloneIcon fontSize="small" />
            </IconButton>
          )}
          {rule.type === 'custom' && onEdit && (
            <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>
          )}
          {onDelete && (
            <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon fontSize="small" /></IconButton>
          )}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>

        <SectionHeader>{t('drSectionSummary')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drRuleName')} compact={compact}>
            <FieldValue>{rule.name}</FieldValue>
          </FieldRow>
          <FieldRow label={t('severity')} compact={compact}>
            <SeverityChip severity={rule.level_normalized} size="small" />
          </FieldRow>
          <FieldRow label={t('drLogSource')} compact={compact}>
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
          <FieldRow label={t('drDescription')} compact={compact}>
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

        {rule.type === 'sigma' && (
          <>
            <SectionHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t('drSectionQuery')}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {rule.query_conversion_status === 'success' && (
                    <Chip label={t('drConversionSuccess')} size="small" color="success" variant="outlined" sx={{ fontSize: '0.55rem', height: 18 }} />
                  )}
                  {rule.query_conversion_status === 'failed' && (
                    <Chip label={t('drConversionFailed')} size="small" color="error" variant="outlined" sx={{ fontSize: '0.55rem', height: 18 }} />
                  )}
                  {rule.query_conversion_status === 'pending' && (
                    <Chip label={t('drConversionPending')} size="small" color="default" variant="outlined" sx={{ fontSize: '0.55rem', height: 18 }} />
                  )}
                  {onReconvert && (
                    <Tooltip title={t('drReconvert')} arrow>
                      <IconButton size="small" onClick={() => onReconvert(rule.id)} disabled={reconverting}>
                        {reconverting ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </SectionHeader>
            <Box sx={{ px: 0.5 }}>
              {rule.opensearch_query ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2, bgcolor: 'background.default',
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 1, overflow: 'auto', maxHeight: 280,
                  }}
                >
                  <Typography component="pre" sx={{
                    fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', m: 0,
                  }}>
                    {JSON.stringify(rule.opensearch_query, null, 2)}
                  </Typography>
                </Paper>
              ) : rule.query_conversion_error ? (
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    {rule.query_conversion_error}
                  </Typography>
                </Paper>
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                  {t('drNoQuery')}
                </Typography>
              )}
              {rule.query_converted_at && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                  {t('drConvertedAt')}: {new Date(rule.query_converted_at).toLocaleString()}
                  {rule.query_pipeline_id && ` (pipeline: ${rule.query_pipeline_id})`}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Field Mappings */}
        {displayMappings.length > 0 && (
          <>
            <SectionHeader>{t('fmFieldMappings')}</SectionHeader>
            <Box sx={{ px: 0.5 }}>
              {rule.source_sigma_id && (
                <FieldRow label={t('fmSourceRule')} compact={compact}>
                  <FieldValue mono>
                    {sourceSigmaName ?? rule.source_sigma_id}
                  </FieldValue>
                </FieldRow>
              )}
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 0.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={mapHeadCellSx}>{t('fmRuleField')}</TableCell>
                      <TableCell sx={mapHeadCellSx}>{t('fmLogField')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayMappings.map((m, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={mapCellSx}>{m.rule_field}</TableCell>
                        <TableCell sx={{ ...mapCellSx, ...(m.log_field ? {} : { color: 'text.disabled', fontStyle: 'italic' }) }}>
                          {m.log_field || t('fmUnmapped')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}

        <SectionHeader>{t('drSectionClassification')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drMitreTags')} compact={compact}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {rule.mitre_tactic_ids.map((tactic) => (
                <Chip key={tactic} label={tactic} size="small" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20, fontFamily: 'monospace' }} />
              ))}
            </Stack>
          </FieldRow>
          <FieldRow label={t('drTechnique')} compact={compact}>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {rule.mitre_technique_ids.map((tech) => (
                <Chip key={tech} label={tech} size="small" color="primary" variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20, fontWeight: 'bold', fontFamily: 'monospace' }} />
              ))}
            </Stack>
          </FieldRow>
          <FieldRow label={t('severity')} compact={compact}>
            <SeverityChip severity={rule.level_normalized} size="small" />
          </FieldRow>
        </Box>

        <SectionHeader>{t('drSectionDocumentation')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <FieldRow label={t('drAuthor')} compact={compact}>
            <FieldValue>{rule.author || '-'}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drReferences')} compact={compact}>
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
          <FieldRow label={t('drFalsePositives')} compact={compact}>
            <Stack spacing={0.25}>
              {rule.false_positives.length > 0 ? rule.false_positives.map((fp, i) => (
                <FieldValue key={i}>{fp}</FieldValue>
              )) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>-</Typography>
              )}
            </Stack>
          </FieldRow>
          {rule.license && (
            <FieldRow label={t('drLicense')} compact={compact}>
              <FieldValue>{rule.license}</FieldValue>
            </FieldRow>
          )}
        </Box>

        <SectionHeader>{t('drSectionMetadata')}</SectionHeader>
        <Box sx={{ px: 0.5, pb: 2 }}>
          <FieldRow label={t('drRuleId')} compact={compact}>
            <FieldValue mono>{rule.sigma_id}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drRuleStatus')} compact={compact}>
            <Chip
              label={rule.sigma_status || '-'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.6rem', height: 20, textTransform: 'capitalize' }}
            />
          </FieldRow>
          <FieldRow label={t('drEnabled')} compact={compact}>
            <Chip
              label={isActive ? t('drEnabled') : t('drDisabled')}
              size="small"
              color={isActive ? 'success' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, fontSize: '0.6rem', height: 20 }}
            />
          </FieldRow>
          <FieldRow label={t('drRevision')} compact={compact}>
            <FieldValue mono>{rule.revision}</FieldValue>
          </FieldRow>
          <FieldRow label={t('drLastUpdated')} compact={compact}>
            <FieldValue mono>{rule.updated_at ? new Date(rule.updated_at).toLocaleString() : '-'}</FieldValue>
          </FieldRow>
        </Box>
      </Box>
    </Paper>
  );
};
