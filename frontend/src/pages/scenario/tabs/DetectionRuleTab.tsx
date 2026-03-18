import type {
  CustomRuleCreate,
  Detector,
  DetectorCreate,
  Finding,
  SigmaRuleDetail as SigmaRuleDetailType,
  SigmaRuleListItem,
} from '@/types';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Button, Checkbox, CircularProgress, Divider, FormControl, IconButton, ListItemText, MenuItem, Paper, Select, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ControlSearchBar from '../../../components/shared/ControlSearchBar';
import ResizablePanel from '../../../components/shared/ResizablePanel';
import { useTranslation } from '../../../hooks/useTranslation';
import { detectorService } from '../../../services/detectionPolicyService';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { CustomRuleForm } from '../components/CustomRuleForm';
import { DetectionPolicyDetail } from '../components/DetectionPolicyDetail';
import { DetectionRuleDetail } from '../components/DetectionRuleDetail';
import { DetectionRuleList } from '../components/DetectionRuleList';
import { DetectorForm } from '../components/DetectorForm';
import { ALL_LOG_TYPES, LOG_TYPE_GROUPS } from '../constants/logTypes';

const FILTER_SX = {
  width: 130,
  '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.75rem' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
};

const TOGGLE_ALL = '__TOGGLE_ALL__';

const FilterSelect: React.FC<{
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  labelMap?: Record<string, string>;
  selectAllLabel?: string;
}> = ({ label, value, options, onChange, labelMap, selectAllLabel }) => {
  const allSelected = options.length > 0 && value.length === options.length;
  const someSelected = value.length > 0 && value.length < options.length;

  const handleChange = (raw: string | string[]) => {
    const next = typeof raw === 'string' ? raw.split(',') : raw;
    if (next.includes(TOGGLE_ALL)) {
      onChange(allSelected || someSelected ? [] : [...options]);
    } else {
      onChange(next);
    }
  };

  return (
    <FormControl size="small" sx={FILTER_SX}>
      <Select
        multiple
        displayEmpty
        value={value}
        onChange={(e) => handleChange(e.target.value as string[])}
        renderValue={(selected) => (
          <Typography component="span" noWrap sx={{ fontSize: '0.75rem', color: selected.length === 0 ? 'text.secondary' : 'text.primary' }}>
            {label}{selected.length > 0 && selected.length < options.length && ` (${selected.length})`}
          </Typography>
        )}
        MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
        sx={{ minHeight: 32 }}
      >
        <MenuItem value={TOGGLE_ALL} dense sx={{ px: 0.5, py: 0 }}>
          <Checkbox size="small" checked={allSelected} indeterminate={someSelected} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
          <ListItemText primary={selectAllLabel ?? label} primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
        </MenuItem>
        <Divider sx={{ my: 0.25 }} />
        {options.map((opt) => (
          <MenuItem key={opt} value={opt} dense sx={{ px: 0.5, py: 0 }}>
            <Checkbox size="small" checked={value.includes(opt)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
            <ListItemText primary={labelMap?.[opt] ?? opt} primaryTypographyProps={{ fontSize: '0.75rem' }} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters (복수선택)
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterLogType, setFilterLogType] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string[]>([]);

  const categoryOptions = useMemo(() => LOG_TYPE_GROUPS.map(g => g.group), []);
  const logTypeOptions = useMemo(() => {
    if (filterCategory.length === 0) return ALL_LOG_TYPES.map(lt => lt.value);
    return LOG_TYPE_GROUPS
      .filter(g => filterCategory.includes(g.group))
      .flatMap(g => g.items.map(i => i.value));
  }, [filterCategory]);
  const logTypeLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const lt of ALL_LOG_TYPES) map[lt.value] = lt.label;
    return map;
  }, []);
  const severityOptions = useMemo(() => ['critical', 'high', 'medium', 'low', 'info'], []);
  const sourceOptions = useMemo(() => ['sigma', 'custom'], []);

  // Detection rules state (Sigma + Custom)
  const [rules, setRules] = useState<SigmaRuleListItem[]>([]);
  const [rulePage, setRulePage] = useState(0);
  const [ruleTotal, setRuleTotal] = useState(0);
  const rulePageSize = settings?.pagination_size ?? 20;
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<SigmaRuleDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCustomRuleForm, setShowCustomRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<SigmaRuleDetailType | null>(null);

  // Checked rule IDs for linking to detector
  const [checkedRuleIds, setCheckedRuleIds] = useState<Set<string>>(new Set());

  // Detector state
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [detectorPage, setDetectorPage] = useState(0);
  const [detectorTotal, setDetectorTotal] = useState(0);
  const [selectedDetectorId, setSelectedDetectorId] = useState<string | null>(null);
  const [selectedDetector, setSelectedDetector] = useState<Detector | null>(null);
  const [detectorFindings, setDetectorFindings] = useState<Finding[]>([]);
  const [showDetectorForm, setShowDetectorForm] = useState(false);
  const [editingDetector, setEditingDetector] = useState<Detector | null>(null);

  // Rule preview panel (Panel 3)
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [previewRule, setPreviewRule] = useState<SigmaRuleDetailType | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { skip: rulePage * rulePageSize, limit: rulePageSize };
        if (searchQuery) params.search = searchQuery;
        if (filterLogType.length) {
          const kws = filterLogType.flatMap(v => ALL_LOG_TYPES.find(lt => lt.value === v)?.keywords ?? []);
          if (kws.length) params.log_type_keywords = kws.join(',');
        }
        if (filterSeverity.length) params.severity = filterSeverity.join(',');
        if (filterSource.length) params.rule_type = filterSource.join(',');
        const data = await detectionRuleService.list(params);
        if (!cancelled) {
          setRules(data.items);
          setRuleTotal(data.total);
        }
      } catch {
        if (!cancelled) setRules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRules();
    return () => { cancelled = true; };
  }, [rulePage, rulePageSize, searchQuery, refreshKey, filterLogType, filterSeverity, filterSource]);

  useEffect(() => {
    let cancelled = false;
    const fetchDetectors = async () => {
      try {
        const params: Record<string, unknown> = { skip: detectorPage * rulePageSize, limit: rulePageSize };
        if (searchQuery) params.query = searchQuery;
        const data = await detectorService.list(params);
        if (!cancelled) {
          setDetectors(data.items);
          setDetectorTotal(data.total);
        }
      } catch {
        if (!cancelled) setDetectors([]);
      }
    };
    fetchDetectors();
    return () => { cancelled = true; };
  }, [detectorPage, rulePageSize, searchQuery, refreshKey]);

  useEffect(() => {
    if (!selectedRuleId) { setSelectedRule(null); return; }
    let cancelled = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await detectionRuleService.getById(selectedRuleId);
        if (!cancelled) setSelectedRule(data);
      } catch {
        if (!cancelled) setSelectedRule(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    fetchDetail();
    return () => { cancelled = true; };
  }, [selectedRuleId]);

  useEffect(() => {
    if (!selectedDetectorId) { setSelectedDetector(null); setDetectorFindings([]); return; }
    let cancelled = false;
    const fetchDetectorDetail = async () => {
      setDetailLoading(true);
      try {
        const detectorData = await detectorService.getById(selectedDetectorId);
        if (!cancelled) setSelectedDetector(detectorData);
      } catch {
        if (!cancelled) setSelectedDetector(null);
      }
      try {
        const findingsData = await detectorService.listFindings({ detector_id: selectedDetectorId, limit: 10 });
        if (!cancelled) setDetectorFindings(findingsData.items);
      } catch {
        if (!cancelled) setDetectorFindings([]);
      }
      if (!cancelled) setDetailLoading(false);
    };
    fetchDetectorDetail();
    return () => { cancelled = true; };
  }, [selectedDetectorId]);

  useEffect(() => {
    if (!previewRuleId) { setPreviewRule(null); setPreviewLoading(false); setPreviewError(null); return; }
    let cancelled = false;
    setPreviewRule(null);
    setPreviewError(null);
    setPreviewLoading(true);
    const fetchPreview = async () => {
      try {
        const data = await detectionRuleService.getById(previewRuleId);
        if (!cancelled) {
          if (data) {
            setPreviewRule(data);
          } else {
            setPreviewError(`Rule not found: ${previewRuleId}`);
          }
        }
      } catch (err) {
        console.error('[Panel3] Failed to fetch rule:', previewRuleId, err);
        if (!cancelled) setPreviewError(`${previewRuleId}`);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    fetchPreview();
    return () => { cancelled = true; };
  }, [previewRuleId]);

  const handlePreviewRule = useCallback((ruleId: string) => {
    setPreviewRuleId(prev => prev === ruleId ? null : ruleId);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewRuleId(null);
  }, []);

  const handleToggleEnabled = useCallback(async (ruleId: string) => {
    try {
      const result = await detectionRuleService.toggle(ruleId);
      setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, status: result.status } : r));
      if (selectedRule?.id === ruleId) {
        setSelectedRule((prev) => prev ? { ...prev, status: result.status } : prev);
      }
    } catch { /* toggle failed */ }
  }, [selectedRule?.id]);

  const handleToggleCheck = useCallback((ruleId: string) => {
    setCheckedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId); else next.add(ruleId);
      return next;
    });
  }, []);

  const handleTabChange = useCallback((tab: number) => {
    setActiveTab(tab);
    setShowDetectorForm(false);
    setShowCustomRuleForm(false);
    setEditingDetector(null);
    setEditingRule(null);
    setPreviewRuleId(null);
  }, []);

  // Custom Rule handlers
  const handleCreateCustomRule = useCallback(async (data: CustomRuleCreate) => {
    try {
      const created = await detectionRuleService.create(data);
      setRules(prev => [{ ...created, type: 'custom' as const } as SigmaRuleListItem, ...prev]);
      setShowCustomRuleForm(false);
      setSelectedRuleId(created.id);
    } catch { /* save failed */ }
  }, []);

  const handleUpdateCustomRule = useCallback(async (data: CustomRuleCreate) => {
    if (!editingRule) return;
    try {
      const updated = await detectionRuleService.update(editingRule.id, data);
      setRules(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } as SigmaRuleListItem : r));
      setSelectedRule(updated);
      setEditingRule(null);
      setShowCustomRuleForm(false);
    } catch { /* update failed */ }
  }, [editingRule]);

  const handleEditCustomRule = useCallback(() => {
    if (selectedRule && selectedRule.type === 'custom') {
      setEditingRule(selectedRule);
      setShowCustomRuleForm(true);
    }
  }, [selectedRule]);

  const handleDeleteRule = useCallback(async () => {
    if (!selectedRule || !confirm(t('dpDeleteConfirm'))) return;
    try {
      await detectionRuleService.delete(selectedRule.id);
      setRules(prev => prev.filter(r => r.id !== selectedRule.id));
      setSelectedRuleId(null);
      setSelectedRule(null);
    } catch { /* delete failed */ }
  }, [selectedRule, t]);

  const handleCloneSigmaRule = useCallback(async () => {
    if (!selectedRule || selectedRule.type !== 'sigma') return;
    const cloneData: CustomRuleCreate = {
      name: `${selectedRule.name}_copy`,
      description: selectedRule.description || undefined,
      detection_config: selectedRule.detection_config || {},
      level_normalized: selectedRule.level_normalized || 'medium',
      log_source_category: selectedRule.log_source_category || undefined,
      log_source_product: selectedRule.log_source_product || undefined,
      log_source_service: selectedRule.log_source_service || undefined,
      mitre_technique_ids: selectedRule.mitre_technique_ids || [],
      mitre_tactic_ids: selectedRule.mitre_tactic_ids || [],
      false_positives: selectedRule.false_positives || [],
    };
    try {
      const created = await detectionRuleService.create(cloneData);
      setRules(prev => [{ ...created, type: 'custom' as const } as SigmaRuleListItem, ...prev]);
      setSelectedRuleId(created.id);
    } catch { /* clone failed */ }
  }, [selectedRule]);

  // Detector handlers
  const handleCreateDetector = useCallback(async (data: DetectorCreate) => {
    try {
      const created = await detectorService.create(data);
      setDetectors(prev => [created, ...prev]);
      setShowDetectorForm(false);
      setSelectedDetectorId(created.id);
      setCheckedRuleIds(new Set());
    } catch { /* save failed */ }
  }, []);

  const handleUpdateDetector = useCallback(async (data: DetectorCreate) => {
    if (!editingDetector) return;
    try {
      const updated = await detectorService.update(editingDetector.id, data);
      setDetectors(prev => prev.map(d => d.id === updated.id ? updated : d));
      setSelectedDetector(updated);
      setEditingDetector(null);
      setShowDetectorForm(false);
    } catch { /* update failed */ }
  }, [editingDetector]);

  const handleDeleteDetector = useCallback(async () => {
    if (!selectedDetector || !confirm(t('dpDeleteConfirm'))) return;
    try {
      await detectorService.delete(selectedDetector.id);
      setDetectors(prev => prev.filter(d => d.id !== selectedDetector.id));
      setSelectedDetectorId(null);
      setSelectedDetector(null);
    } catch { /* delete failed */ }
  }, [selectedDetector, t]);

  const handleEditDetector = useCallback(() => {
    if (selectedDetector) {
      setEditingDetector(selectedDetector);
      setShowDetectorForm(true);
    }
  }, [selectedDetector]);

  const renderDetailPanel = () => {
    // Tab 0: Detectors
    if (activeTab === 0) {
      if (showDetectorForm) {
        return (
          <DetectorForm
            initialData={editingDetector ?? (checkedRuleIds.size > 0 ? { linked_rule_ids: Array.from(checkedRuleIds) } : undefined)}
            isEditing={!!editingDetector}
            onSave={editingDetector ? handleUpdateDetector : handleCreateDetector}
            onCancel={() => { setShowDetectorForm(false); setEditingDetector(null); }}
            rules={rules}
            onRuleClick={handlePreviewRule}
            t={t}
          />
        );
      }
      return (
        <DetectionPolicyDetail
          detector={selectedDetector}
          findings={detectorFindings}
          loading={detailLoading}
          onEdit={handleEditDetector}
          onDelete={handleDeleteDetector}
          onRuleClick={handlePreviewRule}
          rules={rules}
          t={t}
        />
      );
    }

    // Tab 1: Detection Rules
    if (showCustomRuleForm) {
      return (
        <CustomRuleForm
          initialData={editingRule ?? undefined}
          isEditing={!!editingRule}
          onSave={editingRule ? handleUpdateCustomRule : handleCreateCustomRule}
          onCancel={() => { setShowCustomRuleForm(false); setEditingRule(null); }}
          t={t}
        />
      );
    }
    return (
      <DetectionRuleDetail
        rule={selectedRule}
        t={t}
        loading={detailLoading}
        onEdit={selectedRule?.type === 'custom' ? handleEditCustomRule : undefined}
        onDelete={selectedRule ? handleDeleteRule : undefined}
        onClone={selectedRule?.type === 'sigma' ? handleCloneSigmaRule : undefined}
      />
    );
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setRulePage(0);
    setDetectorPage(0);
  }, []);

  const handleFilterChange = useCallback((key: 'logType' | 'category' | 'severity' | 'source', value: string[]) => {
    setRulePage(0);
    if (key === 'category') {
      setFilterCategory(value);
      if (value.length > 0) {
        const validLogTypes = LOG_TYPE_GROUPS
          .filter(g => value.includes(g.group))
          .flatMap(g => g.items.map(i => i.value));
        setFilterLogType(prev => prev.filter(v => validLogTypes.includes(v)));
      }
    } else if (key === 'logType') {
      setFilterLogType(value);
    } else if (key === 'severity') {
      setFilterSeverity(value);
    } else if (key === 'source') {
      setFilterSource(value);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleCreateDetectorWithCheckedRules = useCallback(() => {
    setActiveTab(0);
    setEditingDetector(null);
    setShowDetectorForm(true);
  }, []);

  const handleOpenCustomRuleForm = useCallback(() => {
    setShowCustomRuleForm(true);
    setEditingRule(null);
  }, []);

  const handleOpenDetectorForm = useCallback(() => {
    setShowDetectorForm(true);
    setEditingDetector(null);
  }, []);

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.75, flexShrink: 0, flexWrap: 'wrap' }}>
        <FilterSelect label={t('filterCategory')} value={filterCategory} options={categoryOptions} onChange={(v) => handleFilterChange('category', v)} selectAllLabel={t('filterSelectAll')} />
        <FilterSelect label={t('filterLogType')} value={filterLogType} options={logTypeOptions} onChange={(v) => handleFilterChange('logType', v)} labelMap={logTypeLabelMap} selectAllLabel={t('filterSelectAll')} />
        <FilterSelect label={t('filterSeverity')} value={filterSeverity} options={severityOptions} onChange={(v) => handleFilterChange('severity', v)} labelMap={{ critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }} selectAllLabel={t('filterSelectAll')} />
        <FilterSelect label={t('filterSource')} value={filterSource} options={sourceOptions} onChange={(v) => handleFilterChange('source', v)} labelMap={{ sigma: 'Standard', custom: 'Custom' }} selectAllLabel={t('filterSelectAll')} />
        <ControlSearchBar
          t={t}
          placeholder={t('drSearchPlaceholder')}
          onSubmit={handleSearch}
        />
        <Button
          variant="contained" disableElevation
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={handleRefresh}
          sx={{ bgcolor: '#005a5e', color: '#fff', textTransform: 'none', fontWeight: 'bold', px: 1.5, minWidth: 80, minHeight: 32, fontSize: '0.75rem', '&:hover': { bgcolor: '#004a4d' } }}
        >
          {t('refresh')}
        </Button>
      </Box>

      <Box id="detection-master-detail" sx={{ flex: '1 1 0', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Panel 1: 목록 */}
        <ResizablePanel initialWidth={320} minWidth={200} maxWidth={600}>
          {(width) => (
            <DetectionRuleList
              width={width}
              rules={rules}
              detectors={detectors}
              selectedRuleId={selectedRuleId}
              selectedDetectorId={selectedDetectorId}
              checkedRuleIds={checkedRuleIds}
              onSelect={(ruleId: string) => {
                setSelectedRuleId(ruleId);
                setShowCustomRuleForm(false);
                setEditingRule(null);
              }}
              onSelectDetector={(detectorId: string) => {
                setSelectedDetectorId(detectorId);
                setShowDetectorForm(false);
                setEditingDetector(null);
                setPreviewRuleId(null);
              }}
              onToggleEnabled={handleToggleEnabled}
              onToggleCheck={handleToggleCheck}
              loading={loading}
              t={t}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              rulePage={rulePage}
              ruleTotal={ruleTotal}
              detectorPage={detectorPage}
              detectorTotal={detectorTotal}
              pageSize={rulePageSize}
              onRulePageChange={setRulePage}
              onDetectorPageChange={setDetectorPage}
              onCreateCustomRule={handleOpenCustomRuleForm}
              onCreateDetector={handleOpenDetectorForm}
              onCreateDetectorWithRules={handleCreateDetectorWithCheckedRules}
            />
          )}
        </ResizablePanel>

        {/* Panel 2: 상세/폼 */}
        <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          {renderDetailPanel()}
        </Box>

        {/* Panel 3: 규칙 미리보기 (On-Demand) */}
        {previewRuleId && (
          <ResizablePanel direction="right" initialWidth={420} minWidth={280} maxWidth={700}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 6, right: 10, zIndex: 1 }}>
                <IconButton size="small" onClick={handleClosePreview} sx={{ p: 0.25, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
              {previewLoading ? (
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
                  <CircularProgress size={24} />
                </Paper>
              ) : previewRule ? (
                <DetectionRuleDetail
                  rule={previewRule}
                  t={t}
                  loading={false}
                  compact
                />
              ) : previewError ? (
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, p: 2 }}>
                  <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem', mb: 0.5 }}>
                    {t('dpRulePreview')}: 규칙을 찾을 수 없습니다
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', wordBreak: 'break-all' }}>
                    ID: {previewError}
                  </Typography>
                </Paper>
              ) : (
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {t('dpRulePreview')}
                  </Typography>
                </Paper>
              )}
            </Box>
          </ResizablePanel>
        )}
      </Box>
    </Box>
  );
};

export default DetectionRuleTab;
