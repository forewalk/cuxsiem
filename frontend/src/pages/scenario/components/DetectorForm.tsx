import MonacoEditor from '@monaco-editor/react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import React, { useCallback, useState } from 'react';
import type { DetectorCreate, SigmaRuleListItem, FieldMapping } from '@/types';

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

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const DETECTOR_TYPES = ['windows', 'linux', 'network', 'application', 'cloud', 'custom'];

interface DetectorFormProps {
  initialData?: Partial<DetectorCreate> & { id?: string; field_mappings?: FieldMapping[]; linked_rule_ids?: string[] };
  isEditing?: boolean;
  onSave: (data: DetectorCreate) => void;
  onCancel: () => void;
  rules: SigmaRuleListItem[];
  t: (key: string) => string;
}

export const DetectorForm: React.FC<DetectorFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  rules,
  t,
}) => {
  const theme = useTheme();
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [detectorType, setDetectorType] = useState(initialData?.detector_type ?? 'windows');
  const [targetIndices, setTargetIndices] = useState((initialData?.target_indices ?? ['logs-*']).join(', '));
  const [severity, setSeverity] = useState(initialData?.severity ?? 'medium');
  const [intervalMin, setIntervalMin] = useState(initialData?.schedule_interval_min ?? 5);
  const [triggerCondition, setTriggerCondition] = useState(initialData?.trigger_condition ?? 'total > 0');
  const [messageTemplate, setMessageTemplate] = useState(initialData?.message_template ?? '[{{severity}}] {{name}}: {{total}}건 탐지');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [linkedRuleIds, setLinkedRuleIds] = useState<string[]>(initialData?.linked_rule_ids ?? []);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialData?.field_mappings ?? []);

  const handleAddMapping = useCallback(() => {
    setFieldMappings(prev => [...prev, { rule_field: '', log_field: '' }]);
  }, []);

  const handleRemoveMapping = useCallback((index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleMappingChange = useCallback((index: number, field: 'rule_field' | 'log_field', value: string) => {
    setFieldMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }, []);

  const handleToggleRule = useCallback((ruleId: string) => {
    setLinkedRuleIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
  }, []);

  const handleSubmit = () => {
    const data: DetectorCreate = {
      name,
      description: description || undefined,
      detector_type: detectorType,
      target_indices: targetIndices.split(',').map(s => s.trim()).filter(Boolean),
      linked_rule_ids: linkedRuleIds,
      field_mappings: fieldMappings.filter(m => m.rule_field && m.log_field),
      schedule_interval_min: intervalMin,
      trigger_condition: triggerCondition || undefined,
      message_template: messageTemplate || undefined,
      severity,
      is_active: isActive,
    };
    onSave(data);
  };

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {isEditing ? t('dpEdit') : t('dpCreate')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={onCancel}>{t('dpCancel')}</Button>
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={!name}>
            {t('dpSave')}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>
        <SectionHeader>{t('dpSectionBasic')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('dpDetectorName')} value={name} onChange={e => setName(e.target.value)} required />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('dpDescription')} value={description} onChange={e => setDescription(e.target.value)} multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth size="small" select label={t('dpDetectorType')} value={detectorType} onChange={e => setDetectorType(e.target.value)}>
              {DETECTOR_TYPES.map(dt => <MenuItem key={dt} value={dt}>{dt}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth size="small" select label={t('dpSeverity')} value={severity} onChange={e => setSeverity(e.target.value)}>
              {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth size="small" type="number" label={t('dpInterval')} value={intervalMin}
              onChange={e => setIntervalMin(Math.max(1, Number(e.target.value)))}
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('dpTargetIndices')} value={targetIndices} onChange={e => setTargetIndices(e.target.value)}
              helperText="콤마(,)로 구분하여 여러 인덱스 입력" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('dpTriggerCondition')} value={triggerCondition}
              onChange={e => setTriggerCondition(e.target.value)} placeholder="total > 0" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('dpMessageTemplate')} value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} size="small" />}
              label={<Typography variant="caption">{isActive ? t('dpActive') : t('dpInactive')}</Typography>}
            />
          </Grid>
        </Grid>

        <SectionHeader>{t('dpSectionRules')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'text.secondary', fontSize: '0.68rem' }}>
            {t('dpLinkedRules')}
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            {rules.map(rule => (
              <Box
                key={rule.id}
                onClick={() => handleToggleRule(rule.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.75,
                  cursor: 'pointer',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: linkedRuleIds.includes(rule.id) ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Chip
                  label={linkedRuleIds.includes(rule.id) ? '✓' : ''}
                  size="small"
                  color={linkedRuleIds.includes(rule.id) ? 'primary' : 'default'}
                  variant={linkedRuleIds.includes(rule.id) ? 'filled' : 'outlined'}
                  sx={{ width: 22, height: 22, fontSize: '0.6rem' }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.72rem', flex: 1 }} noWrap>{rule.name}</Typography>
                <Chip label={rule.type === 'custom' ? 'Custom' : 'Sigma'} size="small" variant="outlined"
                  sx={{ fontSize: '0.5rem', height: 16 }} />
              </Box>
            ))}
            {rules.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                {t('drRuleEmpty')}
              </Typography>
            )}
          </Box>

          <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.68rem' }}>
            {t('dpFieldMappings')}
          </Typography>
          {fieldMappings.map((mapping, idx) => (
            <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
              <TextField size="small" label="Rule Field" value={mapping.rule_field}
                onChange={e => handleMappingChange(idx, 'rule_field', e.target.value)} sx={{ flex: 1 }} />
              <Typography variant="caption">→</Typography>
              <TextField size="small" label="Log Field" value={mapping.log_field}
                onChange={e => handleMappingChange(idx, 'log_field', e.target.value)} sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => handleRemoveMapping(idx)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={handleAddMapping} sx={{ fontSize: '0.68rem' }}>
            매핑 추가
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
