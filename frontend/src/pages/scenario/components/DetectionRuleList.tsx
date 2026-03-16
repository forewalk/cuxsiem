import {
  Box,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import { SeverityChip } from '../../admin/alerts/components/SeverityChip';

export interface DetectionRuleListItem {
  id: string;
  name: string;
  severity: string;
  logType: string;
  tags: string[];
  enabled: boolean;
}

interface DetectionRuleListProps {
  rules: DetectionRuleListItem[];
  selectedRuleId: string | null;
  onSelect: (ruleId: string) => void;
  onToggleEnabled: (ruleId: string) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  width?: number;
}

const extractMitreTechnique = (tags: string[]): string | null => {
  for (const tag of tags) {
    const match = tag.match(/^attack\.t(\d+(?:\.\d+)?)$/i);
    if (match) return `T${match[1].toUpperCase()}`;
  }
  return null;
};

const extractLogPlatform = (logType: string): string => {
  const lower = logType.toLowerCase();
  if (lower.includes('linux')) return 'Linux';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('network')) return 'Network';
  if (lower.includes('macos') || lower.includes('mac os')) return 'macOS';
  return logType.split(' ')[0];
};

export const DetectionRuleList: React.FC<DetectionRuleListProps> = ({
  rules,
  selectedRuleId,
  onSelect,
  onToggleEnabled,
  loading,
  t,
  width = 320,
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

      <Box sx={{ p: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
          {t('drRuleLibrary')} ({rules.length})
        </Typography>
      </Box>

      <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {rules.length > 0 ? rules.map((rule) => {
          const technique = extractMitreTechnique(rule.tags);
          const platform = extractLogPlatform(rule.logType);

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
              {/* 왼쪽: 이름 + 보조 정보 */}
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

              {/* 오른쪽: 심각도 + 토글 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                <SeverityChip severity={rule.severity} size="small" />
                <Switch
                  size="small"
                  checked={rule.enabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleEnabled(rule.id)}
                />
              </Box>
            </ListItemButton>
          );
        }) : !loading && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">{t('drNoRules')}</Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
