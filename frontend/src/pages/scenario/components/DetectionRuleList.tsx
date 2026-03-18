import { SeverityChip } from '@/components/shared/SeverityChip';
import type { Detector, SigmaRuleListItem } from '@/types';
import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import React from 'react';

interface DetectionRuleListProps {
  rules: SigmaRuleListItem[];
  detectors: Detector[];
  selectedRuleId: string | null;
  selectedDetectorId: string | null;
  checkedRuleIds: Set<string>;
  onSelect: (ruleId: string) => void;
  onSelectDetector: (detectorId: string) => void;
  onToggleEnabled: (ruleId: string) => void;
  onToggleCheck: (ruleId: string) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  width?: number;
  activeTab: number;
  onTabChange: (tab: number) => void;
  rulePage: number;
  ruleTotal: number;
  detectorPage: number;
  detectorTotal: number;
  pageSize: number;
  onRulePageChange: (page: number) => void;
  onDetectorPageChange: (page: number) => void;
  onCreateCustomRule: () => void;
  onCreateDetector: () => void;
  onCreateDetectorWithRules: () => void;
}

const extractFirstTechnique = (ids: string[]): string | null => ids.length > 0 ? ids[0] : null;

const platformLabel = (product: string | null): string => {
  if (!product) return '-';
  const lower = product.toLowerCase();
  if (lower.includes('linux')) return 'Linux';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('network')) return 'Network';
  if (lower.includes('macos') || lower.includes('mac')) return 'macOS';
  return product.charAt(0).toUpperCase() + product.slice(1);
};

const PaginationBar: React.FC<{
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = ({ page, total, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.5, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
        {from}–{to} / {total}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <IconButton size="small" disabled={page === 0} onClick={() => onPageChange(page - 1)} sx={{ p: 0.25 }}>
          <ChevronLeftIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', mx: 0.5 }}>
          {page + 1}/{totalPages}
        </Typography>
        <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} sx={{ p: 0.25 }}>
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export const DetectionRuleList: React.FC<DetectionRuleListProps> = ({
  rules,
  detectors,
  selectedRuleId,
  selectedDetectorId,
  checkedRuleIds,
  onSelect,
  onSelectDetector,
  onToggleEnabled,
  onToggleCheck,
  loading,
  t,
  width = 320,
  activeTab,
  onTabChange,
  rulePage,
  ruleTotal,
  detectorPage,
  detectorTotal,
  pageSize,
  onRulePageChange,
  onDetectorPageChange,
  onCreateCustomRule,
  onCreateDetector,
  onCreateDetectorWithRules,
}) => {
  return (
    <Paper
      elevation={1}
      sx={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {loading && <LinearProgress sx={{ flexShrink: 0 }} />}

      <Tabs
        value={activeTab}
        onChange={(_e, v) => onTabChange(v)}
        variant="fullWidth"
        sx={{
          flexShrink: 0,
          minHeight: 36,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 36, py: 0.75, fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'none' },
        }}
      >
        <Tab label={`${t('drTabDetector')} (${detectorTotal})`} />
        <Tab label={`${t('drTabRule')} (${ruleTotal})`} />
      </Tabs>

      {activeTab === 0 && (<>
        <Box sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button size="small" variant="contained" startIcon={<AddIcon />} fullWidth
            onClick={onCreateDetector}
            sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.5 }}>
            {t('dpCreate')}
          </Button>
        </Box>
        <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {detectors.length > 0 ? detectors.map((detector) => (
            <ListItemButton
              key={detector.id}
              selected={detector.id === selectedDetectorId}
              onClick={() => onSelectDetector(detector.id)}
              sx={{ py: 1, px: 1.5, borderBottom: 1, borderColor: 'divider', gap: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={detector.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <Chip label={detector.detector_type || '-'} size="small" variant="outlined"
                      sx={{ height: 16, fontSize: '0.55rem', fontWeight: 500, borderRadius: 0.5 }} />
                    <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      {detector.schedule_interval_min}min · {detector.linked_rule_ids?.length ?? 0} rules
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ variant: 'caption', fontWeight: 600, noWrap: true, sx: { fontSize: '0.75rem' } }}
                secondaryTypographyProps={{ component: 'div' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                <SeverityChip severity={detector.severity} size="small" />
                <Chip
                  label={detector.is_active ? '●' : '○'}
                  size="small"
                  color={detector.is_active ? 'success' : 'default'}
                  variant={detector.is_active ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.55rem', height: 18, minWidth: 18, p: 0 }}
                />
              </Box>
            </ListItemButton>
          )) : !loading && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">{t('drDetectorEmpty')}</Typography>
            </Box>
          )}
        </List>
        <PaginationBar page={detectorPage} total={detectorTotal} pageSize={pageSize} onPageChange={onDetectorPageChange} />
      </>)}

      {activeTab === 1 && (<>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button size="small" variant="contained" startIcon={<AddIcon />} fullWidth
            onClick={onCreateCustomRule}
            sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.5 }}>
            {t('drCreateCustomRule')}
          </Button>
          {checkedRuleIds.size > 0 && (
            <Button size="small" variant="contained" color="secondary" startIcon={<AddIcon />} fullWidth
              onClick={onCreateDetectorWithRules}
              sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.5 }}>
              {t('dpCreate')} ({checkedRuleIds.size})
            </Button>
          )}
        </Box>
        <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {rules.length > 0 ? rules.map((rule) => {
            const technique = extractFirstTechnique(rule.mitre_technique_ids);
            const platform = platformLabel(rule.log_source_product);
            const isActive = rule.status === 'active';

            return (
              <ListItemButton
                key={rule.id}
                selected={rule.id === selectedRuleId}
                onClick={() => onSelect(rule.id)}
                sx={{
                  py: 0.75,
                  px: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 0.5,
                }}
              >
                {/* Row 1: checkbox + name + severity + toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Checkbox
                    size="small"
                    checked={checkedRuleIds.has(rule.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleCheck(rule.id)}
                    sx={{ p: 0, flexShrink: 0, '& .MuiSvgIcon-root': { fontSize: 16 } }}
                  />
                  <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 600, fontSize: '0.75rem', minWidth: 0 }}>
                    {rule.name}
                  </Typography>
                  <SeverityChip severity={rule.level_normalized} size="small" />
                  <Switch
                    size="small"
                    checked={isActive}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleEnabled(rule.id)}
                    sx={{ flexShrink: 0 }}
                  />
                </Box>
                {/* Row 2: tags */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 3.5 }}>
                  <Chip
                    label={rule.type === 'custom' ? 'Custom' : 'Standard'}
                    size="small"
                    color={rule.type === 'custom' ? 'secondary' : 'default'}
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600, borderRadius: 0.5 }}
                  />
                  <Chip label={platform} size="small" variant="outlined"
                    sx={{ height: 16, fontSize: '0.55rem', fontWeight: 500, borderRadius: 0.5 }} />
                  {technique && (
                    <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                      {technique}
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            );
          }) : !loading && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">{t('drRuleEmpty')}</Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                {t('drRuleEmptySubtext')}
              </Typography>
            </Box>
          )}
        </List>
        <PaginationBar page={rulePage} total={ruleTotal} pageSize={pageSize} onPageChange={onRulePageChange} />
      </>)}
    </Paper>
  );
};
