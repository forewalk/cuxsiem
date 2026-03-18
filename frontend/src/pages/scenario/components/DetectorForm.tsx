import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  ListItemText,
  ListSubheader,
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
import { Info as InfoIcon, Search as SearchIcon } from '@mui/icons-material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import {
  LOG_TYPE_GROUPS,
  ALL_LOG_TYPES,
  getLogTypeLabel,
} from '../constants/logTypes';
import type { DetectorCreate, SigmaRuleListItem } from '@/types';

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
const SOURCE_OPTIONS = ['all', 'standard', 'custom'] as const;

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
  const [selectedLogTypes, setSelectedLogTypes] = useState<string[]>([]);
  const [linkedRuleIds, setLinkedRuleIds] = useState<Set<string>>(
    new Set(initialData?.linked_rule_ids ?? [])
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | 'standard' | 'custom'>('all');

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

  // Build log_type_keywords from selected log types
  const logTypeKeywords = useMemo(() => {
    if (selectedLogTypes.length === 0) return '';
    const keywords: string[] = [];
    for (const ltValue of selectedLogTypes) {
      const item = ALL_LOG_TYPES.find(lt => lt.value === ltValue);
      if (item) keywords.push(...item.keywords);
    }
    return keywords.join(',');
  }, [selectedLogTypes]);

  // Reset page when filters change
  useEffect(() => { setRulePage(0); }, [debouncedSearch, logTypeKeywords, filterSeverity, filterSource]);

  // Fetch rules from API
  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setRulesLoading(true);
      try {
        const params: Record<string, unknown> = { skip: rulePage * pageSize, limit: pageSize };
        if (debouncedSearch) params.search = debouncedSearch;
        if (logTypeKeywords) params.log_type_keywords = logTypeKeywords;
        if (filterSeverity !== 'all') params.severity = filterSeverity;
        if (filterSource !== 'all') params.rule_type = filterSource === 'standard' ? 'sigma' : 'custom';
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
  }, [rulePage, debouncedSearch, logTypeKeywords, filterSeverity, filterSource, pageSize]);

  const totalPages = Math.ceil(ruleTotal / pageSize);

  const handleToggleRule = useCallback((ruleId: string) => {
    setLinkedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId); else next.add(ruleId);
      return next;
    });
  }, []);

  const handleSubmit = () => {
    const linked = Array.from(linkedRuleIds);
    const linkedRules = rules.filter(r => linkedRuleIds.has(r.id));
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    const highestSeverity = linkedRules.reduce((best, r) => {
      const idx = severityOrder.indexOf(r.level_normalized);
      return idx < severityOrder.indexOf(best) && idx >= 0 ? r.level_normalized : best;
    }, 'medium');

    const data: DetectorCreate = {
      name,
      description: description || undefined,
      detector_type: selectedLogTypes.length === 1
        ? (ALL_LOG_TYPES.find(lt => lt.value === selectedLogTypes[0])?.label ?? selectedLogTypes[0])
        : selectedLogTypes.length > 1 ? 'multi' : 'custom',
      target_indices: ['logs-*'],
      linked_rule_ids: linked,
      schedule_interval_min: intervalMin,
      severity: highestSeverity,
      is_active: true,
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
        </Stack>

        {/* Section 2: Rules selection */}
        <SectionHeader>{t('dpSectionRules')}</SectionHeader>

        {/* Filters row */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
          <Select
            multiple
            size="small"
            value={selectedLogTypes}
            onChange={e => {
              const val = e.target.value;
              setSelectedLogTypes(typeof val === 'string' ? val.split(',') : val);
            }}
            displayEmpty
            renderValue={(selected) =>
              selected.length === 0
                ? <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>{t('dpSelectLogType')}</Typography>
                : <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem' }}>
                    {selected.map(v => getLogTypeLabel(v)).join(', ')}
                  </Typography>
            }
            sx={{ minWidth: 140, maxWidth: 200, fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.75, px: 1 } }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
          >
            {LOG_TYPE_GROUPS.flatMap(group => [
              <ListSubheader key={`header-${group.group}`} sx={{ fontSize: '0.68rem', fontWeight: 'bold', lineHeight: '28px', bgcolor: 'action.hover', color: 'text.secondary' }}>
                {group.group}
              </ListSubheader>,
              ...group.items.map(item => (
                <MenuItem key={item.value} value={item.value} sx={{ fontSize: '0.75rem', py: 0.5, pl: 3 }}>
                  <Checkbox size="small" checked={selectedLogTypes.includes(item.value)}
                    sx={{ p: 0, mr: 1, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                </MenuItem>
              )),
            ])}
          </Select>
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
          <TextField select size="small" value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            InputProps={{ sx: inputSx }} sx={{ minWidth: 110 }}>
            <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>{t('dpFilterAll')}</MenuItem>
            {SEVERITIES.map(s => (
              <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>
                <SeverityChip severity={s} />
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" value={filterSource}
            onChange={e => setFilterSource(e.target.value as typeof filterSource)}
            InputProps={{ sx: inputSx }} sx={{ minWidth: 110 }}>
            {SOURCE_OPTIONS.map(s => (
              <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem' }}>
                {s === 'all' ? t('dpFilterAll') : s === 'standard' ? 'Standard' : 'Custom'}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Rule count */}
        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          {t('dpRuleCount').replace('{shown}', String(rules.length)).replace('{total}', String(ruleTotal))}
        </Typography>

        {/* Rules table */}
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={headCellSx} />
                <TableCell sx={headCellSx}>{t('dpColRuleName')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 80 }}>{t('dpColSeverity')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 110 }}>{t('dpColLogType')}</TableCell>
                <TableCell sx={{ ...headCellSx, width: 75 }}>Source</TableCell>
                <TableCell sx={headCellSx}>{t('dpColDescription')}</TableCell>
                {onRuleClick && <TableCell sx={{ ...headCellSx, width: 36 }} />}
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
                  <TableCell padding="checkbox" sx={cellSx}>
                    <Switch
                      size="small"
                      checked={linkedRuleIds.has(rule.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={() => handleToggleRule(rule.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, maxWidth: 200 }}>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.72rem', fontWeight: 600, display: 'block' }}>
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
                    <Chip
                      label={rule.type === 'custom' ? 'Custom' : 'Standard'}
                      size="small"
                      variant="outlined"
                      color={rule.type === 'custom' ? 'secondary' : 'default'}
                      sx={{ fontSize: '0.55rem', height: 18, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, maxWidth: 180 }}>
                    <Typography variant="caption" noWrap sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                      {rule.log_source_category || rule.log_source_product || '-'}
                    </Typography>
                  </TableCell>
                  {onRuleClick && (
                    <TableCell sx={{ ...cellSx, p: 0.25 }}>
                      <Tooltip title={t('dpRulePreview')} placement="left">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onRuleClick(rule.id); }}
                          sx={{ p: 0.25 }}
                        >
                          <InfoIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={onRuleClick ? 7 : 6} sx={{ textAlign: 'center', py: 4 }}>
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
      </Box>
    </Paper>
  );
};
