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
import React, { useCallback, useMemo, useState } from 'react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import {
  LOG_TYPE_GROUPS,
  ALL_LOG_TYPES,
  matchLogTypes,
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
  rules: SigmaRuleListItem[];
  onRuleClick?: (ruleId: string) => void;
  t: (key: string) => string;
}

export const DetectorForm: React.FC<DetectorFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  rules,
  onRuleClick,
  t,
}) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [intervalMin, setIntervalMin] = useState(initialData?.schedule_interval_min ?? 5);
  const [selectedLogTypes, setSelectedLogTypes] = useState<string[]>([]);
  const [linkedRuleIds, setLinkedRuleIds] = useState<Set<string>>(
    new Set(initialData?.linked_rule_ids ?? [])
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState<'all' | 'standard' | 'custom'>('all');

  // Precompute rule → log type mapping
  const ruleLogTypeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rule of rules) {
      map.set(rule.id, matchLogTypes(rule.log_source_product, rule.log_source_category, null));
    }
    return map;
  }, [rules]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (selectedLogTypes.length > 0) {
        const ruleTypes = ruleLogTypeMap.get(rule.id) ?? [];
        if (!selectedLogTypes.some(lt => ruleTypes.includes(lt))) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!rule.name.toLowerCase().includes(q) && !(rule.description ?? '').toLowerCase().includes(q)) return false;
      }
      if (filterSeverity !== 'all' && rule.level_normalized !== filterSeverity) return false;
      if (filterSource === 'standard' && rule.type !== 'sigma') return false;
      if (filterSource === 'custom' && rule.type !== 'custom') return false;
      return true;
    });
  }, [rules, selectedLogTypes, searchQuery, filterSeverity, filterSource, ruleLogTypeMap]);

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
    const types = ruleLogTypeMap.get(rule.id) ?? [];
    if (types.length === 0) return rule.log_source_product || rule.log_source_category || '-';
    return getLogTypeLabel(types[0]);
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

        {/* Section 2: Log Type */}
        <SectionHeader>{t('dpSectionLogType')}</SectionHeader>
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
              : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(v => (
                    <Chip key={v} label={getLogTypeLabel(v)} size="small"
                      sx={{ height: 20, fontSize: '0.6rem' }}
                      onDelete={() => setSelectedLogTypes(prev => prev.filter(p => p !== v))}
                      onMouseDown={e => e.stopPropagation()} />
                  ))}
                </Box>
          }
          sx={{ width: '100%', fontSize: '0.75rem', '& .MuiSelect-select': { minHeight: 32 } }}
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

        {/* Section 3: Rules selection */}
        <SectionHeader>{t('dpSectionRules')}</SectionHeader>

        {/* Filters row */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
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
              {filteredRules.length > 0 ? filteredRules.map(rule => (
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
                      {rule.description || '-'}
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
                      {selectedLogTypes.length === 0 ? t('dpSelectLogTypeFirst') : t('dpNoMatchingRules')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};
