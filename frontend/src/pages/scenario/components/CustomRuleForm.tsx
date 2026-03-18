import MonacoEditor from '@monaco-editor/react';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import type { CustomRuleCreate, SigmaRuleDetail } from '@/types';

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

interface CustomRuleFormProps {
  initialData?: Partial<SigmaRuleDetail>;
  isEditing?: boolean;
  onSave: (data: CustomRuleCreate) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export const CustomRuleForm: React.FC<CustomRuleFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  t,
}) => {
  const theme = useTheme();
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [severity, setSeverity] = useState(initialData?.level_normalized ?? 'medium');
  const [logSourceCategory, setLogSourceCategory] = useState(initialData?.log_source_category ?? '');
  const [logSourceProduct, setLogSourceProduct] = useState(initialData?.log_source_product ?? '');
  const [logSourceService, setLogSourceService] = useState(initialData?.log_source_service ?? '');
  const [dslString, setDslString] = useState(
    initialData?.detection_config ? JSON.stringify(initialData.detection_config, null, 2) : '{\n  "query": {\n    "match_all": {}\n  }\n}'
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [mitreTechniques, setMitreTechniques] = useState((initialData?.mitre_technique_ids ?? []).join(', '));
  const [mitreTactics, setMitreTactics] = useState((initialData?.mitre_tactic_ids ?? []).join(', '));
  const [falsePositives, setFalsePositives] = useState((initialData?.false_positives ?? []).join('\n'));

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
      const detectionConfig = JSON.parse(dslString);
      const data: CustomRuleCreate = {
        name,
        description: description || undefined,
        detection_config: detectionConfig,
        level_normalized: severity,
        log_source_category: logSourceCategory || undefined,
        log_source_product: logSourceProduct || undefined,
        log_source_service: logSourceService || undefined,
        mitre_technique_ids: mitreTechniques ? mitreTechniques.split(',').map(s => s.trim()).filter(Boolean) : [],
        mitre_tactic_ids: mitreTactics ? mitreTactics.split(',').map(s => s.trim()).filter(Boolean) : [],
        false_positives: falsePositives ? falsePositives.split('\n').map(s => s.trim()).filter(Boolean) : [],
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
          {isEditing ? t('drEditCustomRule') : t('drCreateCustomRule')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={onCancel}>{t('dpCancel')}</Button>
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={!name || !!jsonError}>
            {t('dpSave')}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 1.5 }}>
        <SectionHeader>{t('drSectionSummary')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('drRuleName')} value={name} onChange={e => setName(e.target.value)} required />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('drDescription')} value={description} onChange={e => setDescription(e.target.value)} multiline rows={2} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField fullWidth size="small" select label={t('dpSeverity')} value={severity} onChange={e => setSeverity(e.target.value)}>
              {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 8 }}>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Category" value={logSourceCategory} onChange={e => setLogSourceCategory(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" label="Product" value={logSourceProduct} onChange={e => setLogSourceProduct(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" label="Service" value={logSourceService} onChange={e => setLogSourceService(e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Grid>
        </Grid>

        <SectionHeader>{t('drSectionDetection')}</SectionHeader>
        <Box sx={{ px: 0.5 }}>
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
        </Box>

        <SectionHeader>{t('drSectionClassification')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('drTechnique')} value={mitreTechniques}
              onChange={e => setMitreTechniques(e.target.value)} placeholder="T1059, T1027" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label={t('drMitreTags')} value={mitreTactics}
              onChange={e => setMitreTactics(e.target.value)} placeholder="execution, defense_evasion" />
          </Grid>
        </Grid>

        <SectionHeader>{t('drSectionDocumentation')}</SectionHeader>
        <Grid container spacing={2} sx={{ px: 0.5, pb: 2 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label={t('drFalsePositives')} value={falsePositives}
              onChange={e => setFalsePositives(e.target.value)} multiline rows={2} placeholder="한 줄에 하나씩 입력" />
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
