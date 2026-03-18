import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import ControlSearchBar from '../../../components/shared/ControlSearchBar';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { DetectionRuleDetail } from '../components/DetectionRuleDetail';
import { DetectionRuleList } from '../components/DetectionRuleList';
import { DetectionPolicyDetail } from '../components/DetectionPolicyDetail';
import { DetectorForm } from '../components/DetectorForm';
import { CustomRuleForm } from '../components/CustomRuleForm';
import { detectionRuleService } from '../../../services/sigmaRuleService';
import { detectorService } from '../../../services/detectionPolicyService';
import type {
  SigmaRuleListItem,
  SigmaRuleDetail as SigmaRuleDetailType,
  Detector,
  Finding,
  DetectorCreate,
  CustomRuleCreate,
} from '@/types';

const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { skip: rulePage * rulePageSize, limit: rulePageSize };
        if (searchQuery) params.search = searchQuery;
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
  }, [rulePage, rulePageSize, searchQuery, refreshKey]);

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

  const [listWidth, setListWidth] = useState(600);
  const isResizing = React.useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const containerLeft = document.getElementById('detection-master-detail')?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - containerLeft;
      setListWidth(Math.max(200, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const renderDetailPanel = () => {
    // Tab 0: Detection Rules
    if (activeTab === 0) {
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
    }

    // Tab 1: Detectors
    if (showDetectorForm) {
      return (
        <DetectorForm
          initialData={editingDetector ?? (checkedRuleIds.size > 0 ? { linked_rule_ids: Array.from(checkedRuleIds) } : undefined)}
          isEditing={!!editingDetector}
          onSave={editingDetector ? handleUpdateDetector : handleCreateDetector}
          onCancel={() => { setShowDetectorForm(false); setEditingDetector(null); }}
          rules={rules}
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
        t={t}
      />
    );
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setRulePage(0);
    setDetectorPage(0);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleCreateDetectorWithCheckedRules = useCallback(() => {
    setActiveTab(1);
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, flexShrink: 0 }}>
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
        <DetectionRuleList
          width={listWidth}
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

        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: 10,
            flexShrink: 0,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover > div, &:active > div': { bgcolor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 2, height: 40, borderRadius: 1, bgcolor: 'divider', transition: 'background-color 0.2s' }} />
        </Box>

        {renderDetailPanel()}
      </Box>
    </Box>
  );
};

export default DetectionRuleTab;
