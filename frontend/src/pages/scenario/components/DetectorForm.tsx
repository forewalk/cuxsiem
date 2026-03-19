import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { LogsourceSelect } from './LogsourceSelect';
import type { DetectorCreate, FieldMapping, SigmaRuleListItem } from '@/types';

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

const inputSx = { fontSize: '0.75rem' } as const;
const labelSx = { fontSize: '0.75rem' } as const;
const cellSx = { fontSize: '0.72rem', py: 0.75, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 'bold', color: 'text.secondary', borderBottom: 2, borderColor: 'divider' } as const;

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const SOURCE_OPTIONS = ['standard', 'custom'] as const;

interface DetectorFormProps {
  initialData?: Partial<DetectorCreate> & { id?: string; linked_rule_ids?: string[] };
  isEditing?: boolean;
  onSave: (data: DetectorCreate) => void;
  onCancel: () => void;
  onRuleClick?: (ruleId: string) => void;
  t: (key: string) => string;
}

export const DetectorForm: React.FC<DetectorFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  onRuleClick,
  t,
}) => {
  const { settings } = useSettingsStore();
  const pageSize = settings?.pagination_size ?? 20;

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [intervalMin, setIntervalMin] = useState(initialData?.schedule_interval_min ?? 5);
  const [timestampField, setTimestampField] = useState(initialData?.timestamp_field ?? '@timestamp');
  const [maxWindow, setMaxWindow] = useState(initialData?.max_search_window_min ?? 1440);
  const [linkedRuleIds, setLinkedRuleIds] = useState<Set<string>>(
    new Set(initialData?.linked_rule_ids ?? [])
  );

  // Logsource filters (from API)
  const [filterProduct, setFilterProduct] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterService, setFilterService] = useState<string[]>([]);
  const [lsProducts, setLsProducts] = useState<{ value: string; count: number }[]>([]);
  const [lsCategories, setLsCategories] = useState<{ value: string; count: number }[]>([]);
  const [lsServices, setLsServices] = useState<{ value: string; count: number }[]>([]);
  const [lsLoading, setLsLoading] = useState(false);

  // Other filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string[]>([]);

  // Field mappings
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(initialData?.field_mappings ?? []);

  // Server-side rule fetching
  const [rules, setRules] = useState<SigmaRuleListItem[]>([]);
  const [ruleTotal, setRuleTotal] = useState(0);
  const [rulePage, setRulePage] = useState(0);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    if (filterProduct.length) params.product = filterProduct.join(',');
    detectionRuleService.getLogsourceOptions(params).then(data => {
      if (!cancelled) {
        setLsCategories(data.categories);
        setFilterCategory(prev => prev.filter(v => data.categories.some(c => c.value === v)));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [filterProduct]);

  // Services: product + category 선택에 따라 필터링
  useEffect(() => {
    let cancelled = false;
    const params: { product?: string; category?: string } = {};
    if (filterProduct.length) params.product = filterProduct.join(',');
    if (filterCategory.length) params.category = filterCategory.join(',');
    detectionRuleService.getLogsourceOptions(params).then(data => {
      if (!cancelled) {
        setLsServices(data.services);
        setFilterService(prev => prev.filter(v => data.services.some(s => s.value === v)));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [filterProduct, filterCategory]);

  // Reset page when filters change
  useEffect(() => { setRulePage(0); }, [debouncedSearch, filterProduct, filterCategory, filterService, filterSeverity, filterSource]);

  // Fetch rules from API
  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setRulesLoading(true);
      try {
        const params: Record<string, unknown> = { skip: rulePage * pageSize, limit: pageSize };
        if (debouncedSearch) params.search = debouncedSearch;
        if (filterProduct.length) params.log_source_product = filterProduct.join(',');
        if (filterCategory.length) params.log_source_category = filterCategory.join(',');
        if (filterService.length) params.log_source_service = filterService.join(',');
        if (filterSeverity.length) params.severity = filterSeverity.join(',');
        if (filterSource.length) params.rule_type = filterSource.map(s => s === 'standard' ? 'sigma' : 'custom').join(',');
        const data = await detectionRuleService.list(params);
        if (!cancelled) {
          setRules(data.items);
          setRuleTotal(data.total);
        }
      } catch { /* fetch failed */ }
      finally { if (!cancelled) setRulesLoading(false); }
    };
    fetchRules();
    return () => { cancelled = true; };
  }, [rulePage, debouncedSearch, filterProduct, filterCategory, filterService, filterSeverity, filterSource, pageSize]);

  const totalPages = Math.ceil(ruleTotal / pageSize);

  const handleToggleRule = useCallback((ruleId: string) => {
    setLinkedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId); else next.add(ruleId);
      return next;
    });
  }, []);

  const allPageSelected = rules.length > 0 && rules.every(r => linkedRuleIds.has(r.id));
  const somePageSelected = rules.some(r => linkedRuleIds.has(r.id)) && !allPageSelected;

  const handleToggleAll = useCallback(() => {
    setLinkedRuleIds(prev => {
      const next = new Set(prev);
      const pageIds = rules.map(r => r.id);
      if (pageIds.every(id => next.has(id))) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [rules]);

  // 필드 매핑 프리셋 자동 로드
  useEffect(() => {
    if (fieldMappings.length > 0) return;
    let cancelled = false;
    const loadPreset = async () => {
      try {
        const detail = await detectionRuleService.getFieldMappingPresetDetail('sentinelone_edr_v1');
        if (!cancelled && detail?.mappings) {
          const entries = Object.entries(detail.mappings).map(([rule_field, log_field]) => ({ rule_field, log_field }));
          setFieldMappings(entries);
        }
      } catch { /* preset load failed */ }
    };
    loadPreset();
    return () => { cancelled = true; };
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

  const failedRulesInSelection = useMemo(() => {
    return rules.filter(r => linkedRuleIds.has(r.id) && r.query_conversion_status === 'failed');
  }, [rules, linkedRuleIds]);

  const allSelectedFailed = useMemo(() => {
    if (linkedRuleIds.size === 0) return false;
    const selectedRules = rules.filter(r => linkedRuleIds.has(r.id));
    return selectedRules.length > 0 && selectedRules.every(r => r.query_conversion_status === 'failed');
  }, [rules, linkedRuleIds]);

  const handleSubmit = () => {
    const linked = Array.from(linkedRuleIds);
    const linkedRules = rules.filter(r => linkedRuleIds.has(r.id));
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    const highestSeverity = linkedRules.reduce((best, r) => {
      const idx = severityOrder.indexOf(r.level_normalized);
      return idx < severityOrder.indexOf(best) && idx >= 0 ? r.level_normalized : best;
    }, 'medium');

    const validMappings = fieldMappings.filter(m => m.rule_field && m.log_field);
    const data: DetectorCreate = {
      name,
      description: description || undefined,
      detector_type: filterProduct.length === 1
        ? filterProduct[0]
        : filterProduct.length > 1 ? 'multi' : 'custom',
      target_indices: ['logs-*'],
      linked_rule_ids: linked,
      field_mappings: validMappings,
      schedule_interval_min: intervalMin,
      severity: highestSeverity,
      is_active: true,
      timestamp_field: timestampField || '@timestamp',
      max_search_window_min: maxWindow,
    };
    onSave(data);
  };

  const getRuleLogTypeLabel = (rule: SigmaRuleListItem): string => {
    const src = [rule.log_source_product, rule.log_source_category].filter(Boolean).join('/');
    return src || '-';
  };

  return (
    <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
            {isEditing ? t('dpEdit') : t('dpCreate')}
          </Typography>
          {linkedRuleIds.size > 0 && (
            <Chip label={`${linkedRuleIds.size} ${t('dpRulesSelected')}`} size="small" color="primary" variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20 }} />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={onCancel}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t('dpCancel')}
          </Button>
          <Button variant="contained" color="primary" size="small" onClick={handleSubmit}
            disabled={!name || linkedRuleIds.size === 0}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t('dpSave')}
          </Button>
        </Stack>
      </Box>

      {/* Form body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>

        {/* Section 1: Basic Info */}
        <SectionHeader>{t('dpSectionBasic')}</SectionHeader>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth size="small" label={t('dpDetectorName')} value={name}
              onChange={e => setName(e.target.value)} required
              InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
            <TextField size="small" type="number" label={t('dpInterval')} value={intervalMin}
              onChange={e => setIntervalMin(Math.max(1, Number(e.target.value)))}
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
              InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }}
              sx={{ minWidth: 140 }} />
          </Stack>
          <TextField fullWidth size="small" label={t('dpDescription')} value={description}
            onChange={e => setDescription(e.target.value)} multiline rows={2}
            InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }} />
          <Stack direction="row" spacing={2}>
            <TextField size="small" label={t('dpTimestampField')} value={timestampField}
              onChange={e => setTimestampField(e.target.value)}
              InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }}
              sx={{ minWidth: 180 }} />
            <Tooltip title={t('dpMaxWindowHelp')} arrow placement="top">
              <TextField size="small" type="number" label={t('dpMaxWindow')} value={maxWindow}
                onChange={e => setMaxWindow(Math.max(5, Math.min(10080, Number(e.target.value))))}
                slotProps={{ htmlInput: { min: 5, max: 10080 } }}
                InputProps={{ sx: inputSx }} InputLabelProps={{ sx: labelSx }}
                sx={{ minWidth: 160 }} />
            </Tooltip>
          </Stack>
        </Stack>

        {/* Section 2: Rules selection */}
        <SectionHeader>{t('dpSectionRules')}</SectionHeader>

        {/* Filters row */}
        <Stack direction="row" spacing={0.75} sx={{ mb: 1 }} alignItems="center">
          <LogsourceSelect label="Product" options={lsProducts} selected={filterProduct} onChange={setFilterProduct} loading={lsLoading} minWidth={110} allowCustomInput />
          <LogsourceSelect label="Category" options={lsCategories} selected={filterCategory} onChange={setFilterCategory} loading={lsLoading} minWidth={120} allowCustomInput />
          <LogsourceSelect label="Service" options={lsServices} selected={filterService} onChange={setFilterService} loading={lsLoading} minWidth={110} allowCustomInput />
          <TextField
            size="small"
            placeholder={t('dpSearchRules')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.disabled' }} />,
              sx: { fontSize: '0.75rem' },
            }}
            sx={{ flex: 1 }}
          />
          <Select
            multiple size="small" value={filterSeverity}
            onChange={e => {
              const raw = e.target.value;
              const next = typeof raw === 'string' ? raw.split(',') : raw;
              if (next.includes('__TOGGLE_ALL__')) { setFilterSeverity(filterSeverity.length === SEVERITIES.length ? [] : [...SEVERITIES]); }
              else { setFilterSeverity(next); }
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
              <Checkbox size="small" checked={filterSeverity.length === SEVERITIES.length} indeterminate={filterSeverity.length > 0 && filterSeverity.length < SEVERITIES.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
              <ListItemText primary="All" primaryTypographyProps={{ fontSize: '0.72rem', fontWeight: 600 }} />
            </MenuItem>
            <Divider sx={{ my: 0.25 }} />
            {SEVERITIES.map(s => (
              <MenuItem key={s} value={s} dense sx={{ px: 0.5, py: 0 }}>
                <Checkbox size="small" checked={filterSeverity.includes(s)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                <SeverityChip severity={s} />
              </MenuItem>
            ))}
          </Select>
          <Select
            multiple size="small" value={filterSource}
            onChange={e => {
              const raw = e.target.value;
              const next = typeof raw === 'string' ? raw.split(',') : raw;
              if (next.includes('__TOGGLE_ALL__')) { setFilterSource(filterSource.length === SOURCE_OPTIONS.length ? [] : [...SOURCE_OPTIONS]); }
              else { setFilterSource(next); }
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
              <Checkbox size="small" checked={filterSource.length === SOURCE_OPTIONS.length} indeterminate={filterSource.length > 0 && filterSource.length < SOURCE_OPTIONS.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
              <ListItemText primary="All" primaryTypographyProps={{ fontSize: '0.72rem', fontWeight: 600 }} />
            </MenuItem>
            <Divider sx={{ my: 0.25 }} />
            {SOURCE_OPTIONS.map(s => (
              <MenuItem key={s} value={s} dense sx={{ px: 0.5, py: 0 }}>
                <Checkbox size="small" checked={filterSource.includes(s)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {s === 'standard' ? 'Standard' : 'Custom'}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </Stack>

        {/* Conversion warnings */}
        {allSelectedFailed && linkedRuleIds.size > 0 && (
          <Alert severity="error" sx={{ mb: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.72rem' } }}>
            {t('dpAllRulesFailedWarning')}
          </Alert>
        )}
        {!allSelectedFailed && failedRulesInSelection.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.72rem' } }}>
            {t('dpFailedRulesWarning').replace('{count}', String(failedRulesInSelection.length))}
          </Alert>
        )}

        {/* Rule count */}
        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          {t('dpRuleCount').replace('{shown}', String(rules.length)).replace('{total}', String(ruleTotal))}
        </Typography>

        {/* Rules table */}
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCellSx, width: 56, textAlign: 'center', px: 0 }}>
                  <Switch
                    size="small"
                    checked={allPageSelected}
                    onChange={handleToggleAll}
                    disabled={rules.length === 0}
                    color={somePageSelected ? 'default' : 'primary'}
                  />
                </TableCell>
                <TableCell sx={headCellSx}>{t('dpColRuleName')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 80 }}>{t('dpColSeverity')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 110 }}>{t('dpColLogType')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 75 }}>Source</TableCell>
                <TableCell sx={headCellSx}>{t('dpColDescription')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length > 0 ? rules.map(rule => (
                <TableRow
                  key={rule.id}
                  hover
                  onClick={() => handleToggleRule(rule.id)}
                  sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                >
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                    <Switch
                      size="small"
                      checked={linkedRuleIds.has(rule.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={() => handleToggleRule(rule.id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, maxWidth: 200 }}>
                    <Typography
                      variant="caption" noWrap
                      onClick={onRuleClick ? (e) => { e.stopPropagation(); onRuleClick(rule.id); } : undefined}
                      sx={{
                        fontSize: '0.72rem', fontWeight: 600, display: 'block',
                        ...(onRuleClick && { cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }),
                      }}
                    >
                      {rule.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <SeverityChip severity={rule.level_normalized} />
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.68rem' }}>
                      {getRuleLogTypeLabel(rule)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={cellSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary' }}>
                        {rule.type === 'custom' ? 'Custom' : 'Standard'}
                      </Typography>
                      {rule.type === 'sigma' && rule.query_conversion_status === 'failed' && (
                        <Tooltip title={t('dpRuleConversionFailed')} arrow>
                          <Typography component="span" sx={{ fontSize: '0.7rem', cursor: 'default' }}>⚠</Typography>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...cellSx, maxWidth: 180 }}>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                      {rule.log_source_category || rule.log_source_product || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                      {rulesLoading ? '' : t('dpNoMatchingRules')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" justifyContent="center">
            <Button size="small" disabled={rulePage === 0 || rulesLoading} onClick={() => setRulePage(p => p - 1)}
              sx={{ minWidth: 32, fontSize: '0.7rem', textTransform: 'none' }}>
              ‹
            </Button>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {rulePage + 1} / {totalPages}
            </Typography>
            <Button size="small" disabled={rulePage >= totalPages - 1 || rulesLoading} onClick={() => setRulePage(p => p + 1)}
              sx={{ minWidth: 32, fontSize: '0.7rem', textTransform: 'none' }}>
              ›
            </Button>
          </Stack>
        )}

        {/* Section 3: Field Mappings */}
        <SectionHeader>{t('fmFieldMappings')}</SectionHeader>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: '0.68rem' }}>
          {t('fmDetectorMappingsDesc')}
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
              {fieldMappings.length > 0 ? fieldMappings.map((mapping, idx) => (
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
              )) : (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="caption" color="text.disabled">{t('fmNoMappings')}</Typography>
                  </TableCell>
                </TableRow>
              )}
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
      </Box>
    </Paper>
  );
};
