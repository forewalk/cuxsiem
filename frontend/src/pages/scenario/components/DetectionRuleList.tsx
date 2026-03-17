import {
  Box,
  Chip,
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
import { SeverityChip } from '../../admin/alerts/components/SeverityChip';
import type { SigmaRuleListItem, DetectionPolicy } from '@/types';

interface DetectionRuleListProps {
  rules: SigmaRuleListItem[];
  policies: DetectionPolicy[];
  selectedRuleId: string | null;
  selectedPolicyId: string | null;
  onSelect: (ruleId: string) => void;
  onSelectPolicy: (policyId: string) => void;
  onToggleEnabled: (ruleId: string) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  width?: number;
  activeTab: number;
  onTabChange: (tab: number) => void;
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

export const DetectionRuleList: React.FC<DetectionRuleListProps> = ({
  rules,
  policies,
  selectedRuleId,
  selectedPolicyId,
  onSelect,
  onSelectPolicy,
  onToggleEnabled,
  loading,
  t,
  width = 320,
  activeTab,
  onTabChange,
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
        <Tab label={t('drTabDetector')} />
        <Tab label={`${t('drTabRule')} (${rules.length})`} />
      </Tabs>

      {activeTab === 0 && (
        <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {policies.length > 0 ? policies.map((policy) => (
            <ListItemButton
              key={policy.id}
              selected={policy.id === selectedPolicyId}
              onClick={() => onSelectPolicy(policy.id)}
              sx={{ py: 1, px: 1.5, borderBottom: 1, borderColor: 'divider', gap: 0.5, alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={policy.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <Chip label={policy.target_index} size="small" variant="outlined"
                      sx={{ height: 16, fontSize: '0.55rem', fontWeight: 500, borderRadius: 0.5, maxWidth: 120 }} />
                    <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      {policy.interval_min}min
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ variant: 'caption', fontWeight: 600, noWrap: true, sx: { fontSize: '0.75rem' } }}
                secondaryTypographyProps={{ component: 'div' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                <SeverityChip severity={policy.severity} size="small" />
                <Chip
                  label={policy.is_active ? '●' : '○'}
                  size="small"
                  color={policy.is_active ? 'success' : 'default'}
                  variant={policy.is_active ? 'filled' : 'outlined'}
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
      )}

      {activeTab === 1 && (
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
                  py: 1,
                  px: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  gap: 0.5,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemText
                  primary={rule.name}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Chip label={platform} size="small" variant="outlined"
                        sx={{ height: 16, fontSize: '0.55rem', fontWeight: 500, borderRadius: 0.5 }} />
                      {technique && (
                        <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                          MITRE: {technique}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{
                    variant: 'caption',
                    fontWeight: 600,
                    noWrap: true,
                    sx: { fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                  }}
                  secondaryTypographyProps={{ component: 'div' }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                  <SeverityChip severity={rule.level_normalized} size="small" />
                  <Switch
                    size="small"
                    checked={isActive}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleEnabled(rule.id)}
                  />
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
      )}
    </Paper>
  );
};
