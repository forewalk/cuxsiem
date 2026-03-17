import MonacoEditor from '@monaco-editor/react';
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
import React, { useCallback, useState } from 'react';
import type { DetectionPolicyCreate } from '@/types';

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

interface DetectionPolicyFormProps {
  initialData?: Partial<DetectionPolicyCreate>;
  isEditing?: boolean;
  onSave: (data: DetectionPolicyCreate) => void;
  onCancel: () => void;
  onTestQuery?: (targetIndex: string, conditionConfig: Record<string, unknown>) => void;
  queryTestResult?: unknown;
  queryTestError?: string | null;
  t: (key: string) => string;
}

export const DetectionPolicyForm: React.FC<DetectionPolicyFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  onTestQuery,
  queryTestResult,
  queryTestError,
  t,
}) => {
  const theme = useTheme();
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [targetIndex, setTargetIndex] = useState(initialData?.target_index ?? 'logs-sentinel_one.edr');
  const [severity, setSeverity] = useState(initialData?.severity ?? 'medium');
  const [intervalMin, setIntervalMin] = useState(initialData?.interval_min ?? 5);
  const [triggerCondition, setTriggerCondition] = useState(initialData?.trigger_condition ?? 'total > 0');
  const [messageTemplate, setMessageTemplate] = useState(initialData?.message_template ?? '[{{severity}}] {{name}}: {{total}}건 탐지');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [dslString, setDslString] = useState(
    initialData?.condition_config ? JSON.stringify(initialData.condition_config, null, 2) : '{\n  "query": {\n    "match_all": {}\n  }\n}'
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [mitreTechniques, setMitreTechniques] = useState((initialData?.mitre_technique_ids ?? []).join(', '));
  const [mitreTactics, setMitreTactics] = useState((initialData?.mitre_tactic_ids ?? []).join(', '));

  const handleDslChange = useCallback((value: string | undefined) => {
    const v = value ?? '';
    setDslString(v);
    try {
      JSON.parse(v);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON');
    }
  }, []);

  const handleSubmit = () => {
    try {
      const conditionConfig = JSON.parse(dslString);
      const data: DetectionPolicyCreate = {
        name,
        description: description || undefined,
        target_index: targetIndex,
        condition_config: conditionConfig,
        trigger_condition: triggerCondition || undefined,
        message_template: messageTemplate || undefined,
        severity,
        interval_min: intervalMin,
        linked_rule_ids: [],
        mitre_technique_ids: mitreTechniques ? mitreTechniques.split(',').map(s => s.trim()).filter(Boolean) : [],
        mitre_tactic_ids: mitreTactics ? mitreTactics.split(',').map(s => s.trim()).filter(Boolean) : [],
        is_active: isActive,
      };
      onSave(data);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          {isEditing ? t('dpEdit') : t('dpCreate')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={onCancel}>{t('dpCancel')}</Button>
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={!name || !!jsonError}>
            {t('dpSave')}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>
        <SectionHeader>{t('dpSectionBasic')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('dpPolicyName')} value={name} onChange={e => setName(e.target.value)} required />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('dpDescription')} value={description} onChange={e => setDescription(e.target.value)} multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('dpTargetIndex')} value={targetIndex} onChange={e => setTargetIndex(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField fullWidth size="small" select label={t('dpSeverity')} value={severity} onChange={e => setSeverity(e.target.value)}>
              {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField fullWidth size="small" type="number" label={t('dpInterval')} value={intervalMin}
              onChange={e => setIntervalMin(Math.max(1, Number(e.target.value)))}
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} size="small" />}
              label={<Typography variant="caption">{isActive ? t('dpActive') : t('dpInactive')}</Typography>}
            />
          </Grid>
        </Grid>

        <SectionHeader>{t('dpSectionQuery')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
          <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.68rem' }}>
            {t('dpDslQuery')}
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: jsonError ? 'error.main' : 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <MonacoEditor
              height={200}
              language="json"
              theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
              value={dslString}
              onChange={handleDslChange}
              options={{ minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, fontSize: 12 }}
            />
          </Box>
          {jsonError && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{jsonError}</Typography>}

          {onTestQuery && (
            <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled={!!jsonError}
              onClick={() => { try { onTestQuery(targetIndex, JSON.parse(dslString)); } catch { /* noop */ } }}>
              {t('dpTestQuery')}
            </Button>
          )}
          {queryTestError && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{queryTestError}</Typography>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label={t('dpTriggerCondition')} value={triggerCondition}
                onChange={e => setTriggerCondition(e.target.value)} placeholder="total > 0" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label={t('dpMessageTemplate')} value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)} />
            </Grid>
          </Grid>
        </Box>

        <SectionHeader>{t('dpSectionClassification')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5, pb: 2 }}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('dpMitreTechniques')} value={mitreTechniques}
              onChange={e => setMitreTechniques(e.target.value)} placeholder="T1059, T1027" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('dpMitreTactics')} value={mitreTactics}
              onChange={e => setMitreTactics(e.target.value)} placeholder="execution, defense_evasion" />
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
