import MonacoEditor from '@monaco-editor/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { LogsourceSelect } from './LogsourceSelect';
import type { CustomRuleCreate, FieldMapping, SigmaRuleDetail, SigmaRuleListItem } from '@/types';

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
const SOURCE_OPTIONS = ['standard', 'custom'] as const;

const inputSx = { fontSize: '0.75rem' } as const;
const labelSx = { fontSize: '0.75rem' } as const;
const cellSx = { fontSize: '0.72rem', py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 'bold', color: 'text.secondary' } as const;

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
  const monacoTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'light';
  const { settings } = useSettingsStore();
  const pageSize = settings?.pagination_size ?? 20;

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

  // Standard rule picker state
  const [pickerExpanded, setPickerExpanded] = useState(false);
  const [sourceSigmaId, setSourceSigmaId] = useState<string | null>(initialData?.source_sigma_id ?? null);
  const [sourceSigmaName, setSourceSigmaName] = useState<string | null>(initialData?.source_sigma_name ?? null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialData?.applied_field_mappings ?? []);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (sourceSigmaId && !sourceSigmaName) {
      detectionRuleService.getById(sourceSigmaId).then(rule => {
        if (rule?.name) setSourceSigmaName(rule.name);
      }).catch(() => {});
    }
  }, [sourceSigmaId, sourceSigmaName]);

  // Picker filter/search state
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerDebouncedSearch, setPickerDebouncedSearch] = useState('');
  const [pickerProduct, setPickerProduct] = useState<string[]>([]);
  const [pickerCategory, setPickerCategory] = useState<string[]>([]);
  const [pickerService, setPickerService] = useState<string[]>([]);
  const [pickerSeverity, setPickerSeverity] = useState<string[]>([]);
  const [pickerSource, setPickerSource] = useState<string[]>([]);
  const [lsProducts, setLsProducts] = useState<{ value: string; count: number }[]>([]);
  const [lsCategories, setLsCategories] = useState<{ value: string; count: number }[]>([]);
  const [lsServices, setLsServices] = useState<{ value: string; count: number }[]>([]);
  const [lsLoading, setLsLoading] = useState(false);
  const [pickerRules, setPickerRules] = useState<SigmaRuleListItem[]>([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerPage, setPickerPage] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPickerDebouncedSearch(pickerSearch), 300);
    return () => clearTimeout(timer);
  }, [pickerSearch]);

  useEffect(() => { setPickerPage(0); }, [pickerDebouncedSearch, pickerProduct, pickerCategory, pickerService, pickerSeverity, pickerSource]);

  // Products: 전체 조회
  useEffect(() => {
    let cancelled = false;
    setLsLoading(true);
    detectionRuleService.getLogsourceOptions().then(data => {
      if (!cancelled) setLsProducts(data.products);
    }).catch(() => {}).finally(() => { if (!cancelled) setLsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Categories: product 선택에 따라 필터링
  useEffect(() => {
    let cancelled = false;
    const params: { product?: string } = {};
    if (pickerProduct.length) params.product = pickerProduct.join(',');
    detectionRuleService.getLogsourceOptions(params).then(data => {
      if (!cancelled) {
        setLsCategories(data.categories);
        setPickerCategory(prev => prev.filter(v => data.categories.some(c => c.value === v)));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pickerProduct]);

  // Services: product + category 선택에 따라 필터링
  useEffect(() => {
    let cancelled = false;
    const params: { product?: string; category?: string } = {};
    if (pickerProduct.length) params.product = pickerProduct.join(',');
    if (pickerCategory.length) params.category = pickerCategory.join(',');
    detectionRuleService.getLogsourceOptions(params).then(data => {
      if (!cancelled) {
        setLsServices(data.services);
        setPickerService(prev => prev.filter(v => data.services.some(s => s.value === v)));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pickerProduct, pickerCategory]);

  useEffect(() => {
    if (!pickerExpanded) return;
    let cancelled = false;
    const fetch = async () => {
      setPickerLoading(true);
      try {
        const params: Record<string, unknown> = {
          skip: pickerPage * pageSize,
          limit: pageSize,
          sort_by: 'name',
          sort_order: 'asc',
        };
        if (pickerDebouncedSearch) params.search = pickerDebouncedSearch;
        if (pickerProduct.length) params.log_source_product = pickerProduct.join(',');
        if (pickerCategory.length) params.log_source_category = pickerCategory.join(',');
        if (pickerService.length) params.log_source_service = pickerService.join(',');
        if (pickerSeverity.length) params.severity = pickerSeverity.join(',');
        if (pickerSource.length) {
          params.rule_type = pickerSource.map(s => s === 'standard' ? 'sigma' : 'custom').join(',');
        }
        const data = await detectionRuleService.list(params);
        if (!cancelled) {
          setPickerRules(data.items);
          setPickerTotal(data.total);
        }
      } catch { /* fetch failed */ }
      finally { if (!cancelled) setPickerLoading(false); }
    };
    fetch();
    return () => { cancelled = true; };
  }, [pickerExpanded, pickerPage, pickerDebouncedSearch, pickerProduct, pickerCategory, pickerService, pickerSeverity, pickerSource, pageSize]);

  const pickerTotalPages = Math.ceil(pickerTotal / pageSize);

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

  const handleSelectSigmaRule = useCallback(async (rule: SigmaRuleListItem) => {
    setLoadingPreview(true);
    try {
      const preview = await detectionRuleService.convertPreview(rule.id);
      setSourceSigmaId(rule.id);
      setSourceSigmaName(preview.rule_name);

      if (preview.opensearch_query) {
        setDslString(JSON.stringify(preview.opensearch_query, null, 2));
        setJsonError(null);
      }

      const meta = preview.metadata;
      if (meta.name) setName(meta.name);
      if (meta.description) setDescription(meta.description ?? '');
      if (meta.level_normalized) setSeverity(meta.level_normalized);
      if (meta.log_source_category) setLogSourceCategory(meta.log_source_category ?? '');
      if (meta.log_source_product) setLogSourceProduct(meta.log_source_product ?? '');
      if (meta.log_source_service) setLogSourceService(meta.log_source_service ?? '');
      if (meta.mitre_technique_ids?.length) setMitreTechniques(meta.mitre_technique_ids.join(', '));
      if (meta.mitre_tactic_ids?.length) setMitreTactics(meta.mitre_tactic_ids.join(', '));
      if (meta.false_positives?.length) setFalsePositives(meta.false_positives.join('\n'));

      setFieldMappings(preview.applied_mappings.map(m => ({
        rule_field: m.rule_field,
        log_field: m.log_field,
      })));

      setPickerExpanded(false);
    } catch { /* preview failed */ }
    finally { setLoadingPreview(false); }
  }, []);

  const handleMappingChange = useCallback((index: number, field: 'rule_field' | 'log_field', value: string) => {
    setFieldMappings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleAddMapping = useCallback(() => {
    setFieldMappings(prev => [...prev, { rule_field: '', log_field: '' }]);
  }, []);

  const handleRemoveMapping = useCallback((index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getRuleLogTypeLabel = (rule: SigmaRuleListItem): string => {
    const src = [rule.log_source_product, rule.log_source_category].filter(Boolean).join('/');
    return src || '-';
  };

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
      if (sourceSigmaId) data.source_sigma_id = sourceSigmaId;
      if (fieldMappings.length > 0) {
        data.applied_field_mappings = fieldMappings.filter(m => m.rule_field && m.log_field);
      }
      onSave(data);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
            {isEditing ? t('drEditCustomRule') : t('drCreateCustomRule')}
          </Typography>
          {sourceSigmaName && (
            <Typography variant="caption" color="primary" sx={{ fontSize: '0.65rem' }}>
              ← {sourceSigmaName}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={onCancel}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t('dpCancel')}
          </Button>
          <Button variant="contained" color="primary" size="small" onClick={handleSubmit}
            disabled={!name || !!jsonError}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t('dpSave')}
          </Button>
        </Stack>
      </Box>

      {/* Form body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Grid container spacing={3}>
          {/* 1. 기본 정보 */}
          <Grid size={12}>
            <SectionHeader>{t('drSectionSummary')}</SectionHeader>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField label={t('drRuleName')} fullWidth required value={name}
                  onChange={e => setName(e.target.value)} size="small"
                  InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
                <TextField select label={t('dpSeverity')} sx={{ minWidth: 140 }} value={severity}
                  onChange={e => setSeverity(e.target.value)} size="small"
                  InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }}
                  SelectProps={{ renderValue: (v) => <SeverityChip severity={v as string} /> }}>
                  {SEVERITIES.map(s => (
                    <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>
                      <SeverityChip severity={s} />
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField label={t('drDescription')} fullWidth multiline rows={2} value={description}
                onChange={e => setDescription(e.target.value)} size="small"
                InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
              <Stack direction="row" spacing={2}>
                <TextField size="small" label="Category" value={logSourceCategory}
                  onChange={e => setLogSourceCategory(e.target.value)} sx={{ flex: 1 }}
                  InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
                <TextField size="small" label="Product" value={logSourceProduct}
                  onChange={e => setLogSourceProduct(e.target.value)} sx={{ flex: 1 }}
                  InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
                <TextField size="small" label="Service" value={logSourceService}
                  onChange={e => setLogSourceService(e.target.value)} sx={{ flex: 1 }}
                  InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
              </Stack>
            </Stack>
          </Grid>

          {/* 2. 스탠다드 규칙 불러오기 (아코디언) */}
          <Grid size={12}>
              <Accordion
                expanded={pickerExpanded}
                onChange={(_, expanded) => setPickerExpanded(expanded)}
                disableGutters
                elevation={0}
                sx={{ border: 1, borderColor: 'divider', borderRadius: '6px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ minHeight: 36, px: 1.5, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.72rem', color: 'text.secondary' }}>
                    {t('fmLoadStandardRule')}
                    {sourceSigmaName && (
                      <Typography component="span" color="primary" sx={{ ml: 1, fontSize: '0.65rem' }}>
                        ({sourceSigmaName})
                      </Typography>
                    )}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  {/* Filter row */}
                  <Stack direction="row" spacing={0.75} sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider' }} alignItems="center">
                    <LogsourceSelect label="Product" options={lsProducts} selected={pickerProduct} onChange={setPickerProduct} loading={lsLoading} minWidth={110} allowCustomInput />
                    <LogsourceSelect label="Category" options={lsCategories} selected={pickerCategory} onChange={setPickerCategory} loading={lsLoading} minWidth={120} allowCustomInput />
                    <LogsourceSelect label="Service" options={lsServices} selected={pickerService} onChange={setPickerService} loading={lsLoading} minWidth={110} allowCustomInput />
                    <TextField
                      size="small" placeholder={t('dpSearchRules')} value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} /></InputAdornment>,
                        sx: { fontSize: '0.72rem' },
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Select
                      multiple size="small" value={pickerSeverity}
                      onChange={e => {
                        const raw = e.target.value;
                        const next = typeof raw === 'string' ? raw.split(',') : raw;
                        if (next.includes('__TOGGLE_ALL__')) { setPickerSeverity(pickerSeverity.length === SEVERITIES.length ? [] : [...SEVERITIES]); }
                        else { setPickerSeverity(next); }
                      }}
                      displayEmpty
                      renderValue={(sel) => (
                        <Typography component="span" noWrap sx={{ fontSize: '0.72rem', color: sel.length === 0 ? 'text.secondary' : 'text.primary' }}>
                          Severity{sel.length > 0 && sel.length < SEVERITIES.length && ` (${sel.length})`}
                        </Typography>
                      )}
                      sx={{ minWidth: 100, minHeight: 30, '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.72rem' } }}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    >
                      <MenuItem value="__TOGGLE_ALL__" dense sx={{ px: 0.5, py: 0 }}>
                        <Checkbox size="small" checked={pickerSeverity.length === SEVERITIES.length} indeterminate={pickerSeverity.length > 0 && pickerSeverity.length < SEVERITIES.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                        <ListItemText primary="All" primaryTypographyProps={{ fontSize: '0.72rem', fontWeight: 600 }} />
                      </MenuItem>
                      <Divider sx={{ my: 0.25 }} />
                      {SEVERITIES.map(s => (
                        <MenuItem key={s} value={s} dense sx={{ px: 0.5, py: 0 }}>
                          <Checkbox size="small" checked={pickerSeverity.includes(s)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                          <SeverityChip severity={s} />
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      multiple size="small" value={pickerSource}
                      onChange={e => {
                        const raw = e.target.value;
                        const next = typeof raw === 'string' ? raw.split(',') : raw;
                        if (next.includes('__TOGGLE_ALL__')) { setPickerSource(pickerSource.length === SOURCE_OPTIONS.length ? [] : [...SOURCE_OPTIONS]); }
                        else { setPickerSource(next); }
                      }}
                      displayEmpty
                      renderValue={(sel) => (
                        <Typography component="span" noWrap sx={{ fontSize: '0.72rem', color: sel.length === 0 ? 'text.secondary' : 'text.primary' }}>
                          Source{sel.length > 0 && sel.length < SOURCE_OPTIONS.length && ` (${sel.length})`}
                        </Typography>
                      )}
                      sx={{ minWidth: 90, minHeight: 30, '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.72rem' } }}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                    >
                      <MenuItem value="__TOGGLE_ALL__" dense sx={{ px: 0.5, py: 0 }}>
                        <Checkbox size="small" checked={pickerSource.length === SOURCE_OPTIONS.length} indeterminate={pickerSource.length > 0 && pickerSource.length < SOURCE_OPTIONS.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                        <ListItemText primary="All" primaryTypographyProps={{ fontSize: '0.72rem', fontWeight: 600 }} />
                      </MenuItem>
                      <Divider sx={{ my: 0.25 }} />
                      {SOURCE_OPTIONS.map(s => (
                        <MenuItem key={s} value={s} dense sx={{ px: 0.5, py: 0 }}>
                          <Checkbox size="small" checked={pickerSource.includes(s)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                            {s === 'standard' ? 'Standard' : 'Custom'}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </Stack>

                  {/* Rule count */}
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', px: 1.5, pb: 0.5, display: 'block' }}>
                    {t('dpRuleCount').replace('{shown}', String(pickerRules.length)).replace('{total}', String(pickerTotal))}
                  </Typography>

                  {/* Rules table */}
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headCellSx}>{t('dpColRuleName')}</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 70 }}>{t('dpColSeverity')}</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 110 }}>{t('dpColLogType')}</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 70 }}>Source</TableCell>
                          <TableCell sx={headCellSx}>{t('dpColDescription')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pickerLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                              <CircularProgress size={20} />
                            </TableCell>
                          </TableRow>
                        ) : pickerRules.length > 0 ? pickerRules.map(rule => (
                          <TableRow
                            key={rule.id}
                            hover
                            selected={sourceSigmaId === rule.id}
                            onClick={() => handleSelectSigmaRule(rule)}
                            sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ ...cellSx, fontWeight: 600, maxWidth: 220 }}>
                              <Typography variant="caption" noWrap sx={{ fontSize: '0.72rem', fontWeight: 600, display: 'block' }}>
                                {rule.name}
                              </Typography>
                            </TableCell>
                            <TableCell sx={cellSx}>
                              <SeverityChip severity={rule.level_normalized} />
                            </TableCell>
                            <TableCell sx={cellSx}>
                              <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>
                                {getRuleLogTypeLabel(rule)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={cellSx}>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary' }}>
                                {rule.type === 'custom' ? 'Custom' : 'Standard'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ ...cellSx, maxWidth: 160 }}>
                              <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                                {rule.log_source_category ?? '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                              <Typography variant="caption" color="text.disabled">{t('fmNoRulesFound')}</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  {pickerTotalPages > 1 && (
                    <Stack direction="row" spacing={1} sx={{ py: 0.75 }} alignItems="center" justifyContent="center">
                      <Button size="small" disabled={pickerPage === 0 || pickerLoading} onClick={() => setPickerPage(p => p - 1)}
                        sx={{ minWidth: 28, fontSize: '0.68rem', textTransform: 'none' }}>‹</Button>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                        {pickerPage + 1} / {pickerTotalPages}
                      </Typography>
                      <Button size="small" disabled={pickerPage >= pickerTotalPages - 1 || pickerLoading} onClick={() => setPickerPage(p => p + 1)}
                        sx={{ minWidth: 28, fontSize: '0.68rem', textTransform: 'none' }}>›</Button>
                    </Stack>
                  )}

                  {loadingPreview && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <CircularProgress size={18} />
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

          {/* 3. 탐지 쿼리 */}
          <Grid size={12}>
            <SectionHeader>{t('drSectionDetection')}</SectionHeader>
            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block', color: 'text.secondary' }}>
              DSL Query
            </Typography>
            <Box sx={{
              border: '1px solid',
              borderColor: jsonError ? 'error.main' : 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              '&:focus-within': { borderColor: jsonError ? 'error.main' : 'primary.main', borderWidth: 2 },
            }}>
              <MonacoEditor
                height={200}
                language="json"
                theme={monacoTheme}
                value={dslString}
                onChange={handleDslChange}
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
            {jsonError && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{jsonError}</Typography>}
          </Grid>

          {/* 4. 필드 매핑 (스탠다드 규칙 로드 시 표시) */}
          {fieldMappings.length > 0 && (
            <Grid size={12}>
              <SectionHeader>{t('fmFieldMappings')}</SectionHeader>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: '0.68rem' }}>
                {t('fmFieldMappingsDesc')}
              </Typography>
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>{t('fmRuleField')}</TableCell>
                      <TableCell sx={headCellSx}>{t('fmLogField')}</TableCell>
                      <TableCell sx={{ ...headCellSx, width: 40 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fieldMappings.map((mapping, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={cellSx}>
                          <TextField
                            fullWidth size="small" variant="standard"
                            value={mapping.rule_field}
                            onChange={e => handleMappingChange(idx, 'rule_field', e.target.value)}
                            InputProps={{ sx: { fontSize: '0.72rem', fontFamily: 'monospace' }, disableUnderline: true }}
                          />
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <TextField
                            fullWidth size="small" variant="standard"
                            value={mapping.log_field}
                            onChange={e => handleMappingChange(idx, 'log_field', e.target.value)}
                            placeholder={t('fmSelectLogField')}
                            InputProps={{ sx: { fontSize: '0.72rem', fontFamily: 'monospace' }, disableUnderline: true }}
                          />
                        </TableCell>
                        <TableCell sx={cellSx} align="center">
                          <Tooltip title={t('fmRemoveMapping')}>
                            <IconButton size="small" onClick={() => handleRemoveMapping(idx)}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddMapping}
                sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.7rem' }}
              >
                {t('fmAddMapping')}
              </Button>
            </Grid>
          )}

          {/* 5. 분류 */}
          <Grid size={12}>
            <SectionHeader>{t('drSectionClassification')}</SectionHeader>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth size="small" label={t('drTechnique')} value={mitreTechniques}
                onChange={e => setMitreTechniques(e.target.value)} placeholder="T1059, T1027"
                InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
              <TextField fullWidth size="small" label={t('drMitreTags')} value={mitreTactics}
                onChange={e => setMitreTactics(e.target.value)} placeholder="execution, defense_evasion"
                InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
            </Stack>
          </Grid>

          {/* 6. 문서화 */}
          <Grid size={12}>
            <SectionHeader>{t('drSectionDocumentation')}</SectionHeader>
            <TextField fullWidth size="small" label={t('drFalsePositives')} value={falsePositives}
              onChange={e => setFalsePositives(e.target.value)} multiline rows={2}
              placeholder={t('drFalsePositivesPlaceholder')}
              InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }}
              FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }} />
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
