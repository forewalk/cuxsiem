import {
  ConstructionOutlined as ConstructionIcon,
  Rule as RuleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { DetectionRuleDetail } from '../components/DetectionRuleDetail';
import { DetectionRuleList } from '../components/DetectionRuleList';
import { DetectionPolicyDetail } from '../components/DetectionPolicyDetail';
import { DetectionPolicyForm } from '../components/DetectionPolicyForm';
import { sigmaRuleService } from '../../../services/sigmaRuleService';
import { detectionPolicyService } from '../../../services/detectionPolicyService';
import type { SigmaRuleListItem, SigmaRuleDetail as SigmaRuleDetailType, DetectionPolicy, DetectionEvent, DetectionPolicyCreate } from '@/types';

const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  // Sigma rules state
  const [rules, setRules] = useState<SigmaRuleListItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<SigmaRuleDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Detection policies state
  const [policies, setPolicies] = useState<DetectionPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<DetectionPolicy | null>(null);
  const [policyEvents, setPolicyEvents] = useState<DetectionEvent[]>([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DetectionPolicy | null>(null);

  // Fetch sigma rules
  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      setLoading(true);
      try {
        const data = await sigmaRuleService.list({ limit: 200 });
        if (!cancelled) setRules(data.items);
      } catch {
        if (!cancelled) setRules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRules();
    return () => { cancelled = true; };
  }, []);

  // Fetch policies
  useEffect(() => {
    let cancelled = false;
    const fetchPolicies = async () => {
      try {
        const data = await detectionPolicyService.list({ limit: 200 });
        if (!cancelled) setPolicies(data.items);
      } catch {
        if (!cancelled) setPolicies([]);
      }
    };
    fetchPolicies();
    return () => { cancelled = true; };
  }, []);

  // Fetch rule detail
  useEffect(() => {
    if (!selectedRuleId) { setSelectedRule(null); return; }
    let cancelled = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await sigmaRuleService.getById(selectedRuleId);
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

  // Fetch policy detail + events
  useEffect(() => {
    if (!selectedPolicyId) { setSelectedPolicy(null); setPolicyEvents([]); return; }
    let cancelled = false;
    const fetchPolicyDetail = async () => {
      setDetailLoading(true);
      try {
        const [policyData, eventsData] = await Promise.all([
          detectionPolicyService.getById(selectedPolicyId),
          detectionPolicyService.listEvents({ policy_id: selectedPolicyId, limit: 10 }),
        ]);
        if (!cancelled) {
          setSelectedPolicy(policyData);
          setPolicyEvents(eventsData.items);
        }
      } catch {
        if (!cancelled) { setSelectedPolicy(null); setPolicyEvents([]); }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    fetchPolicyDetail();
    return () => { cancelled = true; };
  }, [selectedPolicyId]);

  const handleToggleEnabled = useCallback(async (ruleId: string) => {
    try {
      const result = await sigmaRuleService.toggle(ruleId);
      setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, status: result.status } : r));
      if (selectedRule?.id === ruleId) {
        setSelectedRule((prev) => prev ? { ...prev, status: result.status } : prev);
      }
    } catch { /* toggle failed */ }
  }, [selectedRule?.id]);

  const handleTabChange = useCallback((tab: number) => {
    setActiveTab(tab);
    setShowPolicyForm(false);
    setEditingPolicy(null);
  }, []);

  const handleCreatePolicy = useCallback(async (data: DetectionPolicyCreate) => {
    try {
      const created = await detectionPolicyService.create(data);
      setPolicies(prev => [created, ...prev]);
      setShowPolicyForm(false);
      setSelectedPolicyId(created.id);
    } catch { /* save failed */ }
  }, []);

  const handleUpdatePolicy = useCallback(async (data: DetectionPolicyCreate) => {
    if (!editingPolicy) return;
    try {
      const updated = await detectionPolicyService.update(editingPolicy.id, data);
      setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPolicy(updated);
      setEditingPolicy(null);
      setShowPolicyForm(false);
    } catch { /* update failed */ }
  }, [editingPolicy]);

  const handleDeletePolicy = useCallback(async () => {
    if (!selectedPolicy || !confirm(t('dpDeleteConfirm'))) return;
    try {
      await detectionPolicyService.delete(selectedPolicy.id);
      setPolicies(prev => prev.filter(p => p.id !== selectedPolicy.id));
      setSelectedPolicyId(null);
      setSelectedPolicy(null);
    } catch { /* delete failed */ }
  }, [selectedPolicy, t]);

  const handleEditPolicy = useCallback(() => {
    if (selectedPolicy) {
      setEditingPolicy(selectedPolicy);
      setShowPolicyForm(true);
    }
  }, [selectedPolicy]);

  const [listWidth, setListWidth] = useState(320);
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
    if (activeTab === 0) {
      if (showPolicyForm) {
        return (
          <DetectionPolicyForm
            initialData={editingPolicy ?? undefined}
            isEditing={!!editingPolicy}
            onSave={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
            onCancel={() => { setShowPolicyForm(false); setEditingPolicy(null); }}
            t={t}
          />
        );
      }
      return (
        <DetectionPolicyDetail
          policy={selectedPolicy}
          events={policyEvents}
          loading={detailLoading}
          onEdit={handleEditPolicy}
          onDelete={handleDeletePolicy}
          t={t}
        />
      );
    }
    return (
      <DetectionRuleDetail
        rule={selectedRule}
        t={t}
        loading={detailLoading}
      />
    );
  };

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>

      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <RuleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            {t('detectionRules')}
          </Typography>
          <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />}
            sx={{ fontSize: '0.6rem', height: 22 }} />
        </Stack>
        {activeTab === 0 && !showPolicyForm && (
          <Button size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => { setShowPolicyForm(true); setEditingPolicy(null); }}
            sx={{ fontSize: '0.72rem' }}>
            {t('dpCreate')}
          </Button>
        )}
      </Box>

      <Box id="detection-master-detail" sx={{ flex: '1 1 0', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <DetectionRuleList
          width={listWidth}
          rules={rules}
          policies={policies}
          selectedRuleId={selectedRuleId}
          selectedPolicyId={selectedPolicyId}
          onSelect={setSelectedRuleId}
          onSelectPolicy={setSelectedPolicyId}
          onToggleEnabled={handleToggleEnabled}
          loading={loading}
          t={t}
          activeTab={activeTab}
          onTabChange={handleTabChange}
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
