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
import { SeverityChip } from '../../../components/shared/SeverityChip';
import { useTranslation } from '../../../hooks/useTranslation';
import { detectorService } from '../../../services/detectionPolicyService';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { CustomRuleForm } from '../components/CustomRuleForm';
import { DetectionPolicyDetail } from '../components/DetectionPolicyDetail';
import { DetectionRuleDetail } from '../components/DetectionRuleDetail';
import { DetectionRuleList } from '../components/DetectionRuleList';
import { DetectorForm } from '../components/DetectorForm';
import { LogsourceSelect } from '../components/LogsourceSelect';

const FILTER_SX = {
  width: 130,
  '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.75rem' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
};

const TOGGLE_ALL = '__TOGGLE_ALL__';

const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters (복수선택)
  const [filterProduct, setFilterProduct] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterService, setFilterService] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string[]>([]);

  // Logsource options from API
  const [lsProducts, setLsProducts] = useState<{ value: string; count: number }[]>([]);
  const [lsCategories, setLsCategories] = useState<{ value: string; count: number }[]>([]);
  const [lsServices, setLsServices] = useState<{ value: string; count: number }[]>([]);
  const [lsLoading, setLsLoading] = useState(false);

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
  const [linkedRuleNames, setLinkedRuleNames] = useState<Record<string, string>>({});
  const [checkedDetectorIds, setCheckedDetectorIds] = useState<Set<string>>(new Set());

  // Rule preview panel (Panel 3)
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [previewRule, setPreviewRule] = useState<SigmaRuleDetailType | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Products: 항상 전체 조회
  useEffect(() => {
    let cancelled = false;
    setLsLoading(true);
    detectionRuleService.getLogsourceOptions().then(data => {
      if (!cancelled) setLsProducts(data.products);
    }).catch(() => {}).finally(() => { if (!cancelled) setLsLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

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
  }, [filterProduct, refreshKey]);

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
  }, [filterProduct, filterCategory, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { skip: rulePage * rulePageSize, limit: rulePageSize };
        if (searchQuery) params.search = searchQuery;
        if (filterProduct.length) params.log_source_product = filterProduct.join(',');
        if (filterCategory.length) params.log_source_category = filterCategory.join(',');
        if (filterService.length) params.log_source_service = filterService.join(',');
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
  }, [rulePage, rulePageSize, searchQuery, refreshKey, filterProduct, filterCategory, filterService, filterSeverity, filterSource]);

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
    if (!selectedDetectorId) { setSelectedDetector(null); setDetectorFindings([]); setLinkedRuleNames({}); return; }
    let cancelled = false;
    const fetchDetectorDetail = async () => {
      setDetailLoading(true);
      try {
        const detectorData = await detectorService.getById(selectedDetectorId);
        if (!cancelled) {
          setSelectedDetector(detectorData);
          const ruleIds = detectorData?.linked_rule_ids ?? [];
          if (ruleIds.length > 0) {
            const nameMap: Record<string, string> = {};
            await Promise.all(ruleIds.map(async (id) => {
              try {
                const rule = await detectionRuleService.getById(id);
                if (rule && !cancelled) nameMap[id] = rule.name;
              } catch { /* rule fetch failed */ }
            }));
            if (!cancelled) setLinkedRuleNames(nameMap);
          } else {
            if (!cancelled) setLinkedRuleNames({});
          }
        }
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
    try {
      const preview = await detectionRuleService.convertPreview(selectedRule.id);
      const appliedMappings = (preview?.applied_mappings ?? []).filter(
        (m: { rule_field: string; log_field: string }) => m.rule_field && m.log_field,
      );
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
        source_sigma_id: selectedRule.id,
        applied_field_mappings: appliedMappings,
      };
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
          linkedRuleNames={linkedRuleNames}
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

  const handleFilterProduct = useCallback((v: string[]) => { setRulePage(0); setFilterProduct(v); }, []);
  const handleFilterCategory = useCallback((v: string[]) => { setRulePage(0); setFilterCategory(v); }, []);
  const handleFilterService = useCallback((v: string[]) => { setRulePage(0); setFilterService(v); }, []);

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

  const handleExportDetectors = useCallback(async () => {
    try {
      const data = await detectorService.exportDetectors();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detectors_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* export failed */ }
  }, []);

  const handleImportDetectors = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const items = json.detectors || json.rules || [];
        if (items.length === 0) return;
        await detectorService.importDetectors(items, false);
        setRefreshKey(k => k + 1);
      } catch { /* import failed */ }
    };
    input.click();
  }, []);

  const handleToggleDetectorCheck = useCallback((detectorId: string) => {
    setCheckedDetectorIds(prev => {
      const next = new Set(prev);
      if (next.has(detectorId)) next.delete(detectorId); else next.add(detectorId);
      return next;
    });
  }, []);

  const handleBulkDeleteDetectors = useCallback(async () => {
    if (checkedDetectorIds.size === 0) return;
    if (!confirm(t('dpBulkDeleteConfirm', { count: String(checkedDetectorIds.size) }))) return;
    try {
      await detectorService.bulkDelete(Array.from(checkedDetectorIds));
      setDetectors(prev => prev.filter(d => !checkedDetectorIds.has(d.id)));
      if (selectedDetectorId && checkedDetectorIds.has(selectedDetectorId)) {
        setSelectedDetectorId(null);
        setSelectedDetector(null);
      }
      setCheckedDetectorIds(new Set());
    } catch { /* bulk delete failed */ }
  }, [checkedDetectorIds, selectedDetectorId, t]);

  const handleExportSelectedDetectors = useCallback(async () => {
    if (checkedDetectorIds.size === 0) return;
    try {
      const data = await detectorService.exportDetectors(Array.from(checkedDetectorIds));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detectors_selected_${checkedDetectorIds.size}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* export failed */ }
  }, [checkedDetectorIds]);

  const handleBulkDeleteRules = useCallback(async () => {
    if (checkedRuleIds.size === 0) return;
    if (!confirm(t('dpBulkDeleteRulesConfirm', { count: String(checkedRuleIds.size) }))) return;
    try {
      await detectionRuleService.bulkDelete(Array.from(checkedRuleIds));
      setRules(prev => prev.filter(r => !checkedRuleIds.has(r.id)));
      setRuleTotal(prev => prev - checkedRuleIds.size);
      if (selectedRuleId && checkedRuleIds.has(selectedRuleId)) {
        setSelectedRuleId(null);
        setSelectedRule(null);
      }
      setCheckedRuleIds(new Set());
    } catch { /* bulk delete failed */ }
  }, [checkedRuleIds, selectedRuleId, t]);

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.75, flexShrink: 0, flexWrap: 'wrap' }}>
        <LogsourceSelect label="Product" options={lsProducts} selected={filterProduct} onChange={handleFilterProduct} loading={lsLoading} minWidth={110} />
        <LogsourceSelect label="Category" options={lsCategories} selected={filterCategory} onChange={handleFilterCategory} loading={lsLoading} minWidth={120} />
        <LogsourceSelect label="Service" options={lsServices} selected={filterService} onChange={handleFilterService} loading={lsLoading} minWidth={110} />
        <FormControl size="small" sx={FILTER_SX}>
          <Select
            multiple displayEmpty value={filterSeverity}
            onChange={(e) => {
              const raw = e.target.value;
              const next = typeof raw === 'string' ? raw.split(',') : raw;
              if (next.includes(TOGGLE_ALL)) {
                setFilterSeverity(filterSeverity.length === severityOptions.length ? [] : [...severityOptions]);
              } else { setFilterSeverity(next); }
              setRulePage(0);
            }}
            renderValue={(selected) => (
              <Typography component="span" noWrap sx={{ fontSize: '0.75rem', color: selected.length === 0 ? 'text.secondary' : 'text.primary' }}>
                {t('filterSeverity')}{selected.length > 0 && selected.length < severityOptions.length && ` (${selected.length})`}
              </Typography>
            )}
            MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            sx={{ minHeight: 32 }}
          >
            <MenuItem value={TOGGLE_ALL} dense sx={{ px: 0.5, py: 0 }}>
              <Checkbox size="small" checked={filterSeverity.length === severityOptions.length} indeterminate={filterSeverity.length > 0 && filterSeverity.length < severityOptions.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
              <ListItemText primary={t('filterSelectAll')} primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
            </MenuItem>
            <Divider sx={{ my: 0.25 }} />
            {severityOptions.map((opt) => (
              <MenuItem key={opt} value={opt} dense sx={{ px: 0.5, py: 0 }}>
                <Checkbox size="small" checked={filterSeverity.includes(opt)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                <SeverityChip severity={opt} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={FILTER_SX}>
          <Select
            multiple displayEmpty value={filterSource}
            onChange={(e) => {
              const raw = e.target.value;
              const next = typeof raw === 'string' ? raw.split(',') : raw;
              if (next.includes(TOGGLE_ALL)) {
                setFilterSource(filterSource.length === sourceOptions.length ? [] : [...sourceOptions]);
              } else { setFilterSource(next); }
              setRulePage(0);
            }}
            renderValue={(selected) => (
              <Typography component="span" noWrap sx={{ fontSize: '0.75rem', color: selected.length === 0 ? 'text.secondary' : 'text.primary' }}>
                {t('filterSource')}{selected.length > 0 && selected.length < sourceOptions.length && ` (${selected.length})`}
              </Typography>
            )}
            MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
            sx={{ minHeight: 32 }}
          >
            <MenuItem value={TOGGLE_ALL} dense sx={{ px: 0.5, py: 0 }}>
              <Checkbox size="small" checked={filterSource.length === sourceOptions.length} indeterminate={filterSource.length > 0 && filterSource.length < sourceOptions.length} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
              <ListItemText primary={t('filterSelectAll')} primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
            </MenuItem>
            <Divider sx={{ my: 0.25 }} />
            {sourceOptions.map((opt) => (
              <MenuItem key={opt} value={opt} dense sx={{ px: 0.5, py: 0 }}>
                <Checkbox size="small" checked={filterSource.includes(opt)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {opt === 'sigma' ? 'Standard' : 'Custom'}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
              onToggleDetectorCheck={handleToggleDetectorCheck}
              checkedDetectorIds={checkedDetectorIds}
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
              onExportDetectors={handleExportDetectors}
              onImportDetectors={handleImportDetectors}
              onBulkDeleteDetectors={handleBulkDeleteDetectors}
              onExportSelectedDetectors={handleExportSelectedDetectors}
              onBulkDeleteRules={handleBulkDeleteRules}
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
