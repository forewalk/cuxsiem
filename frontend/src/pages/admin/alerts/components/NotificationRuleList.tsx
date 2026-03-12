import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Checkbox,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import type { NotificationRule } from '@/types';
import { SeverityChip } from './SeverityChip';

interface NotificationRuleListProps {
  rules: NotificationRule[];
  selectedRuleId: string | null;
  selectedRuleIds: Set<string>;
  onSelect: (rule: NotificationRule) => void;
  onToggleSelect: (ruleId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onAdd: () => void;
  onToggleActive: (rule: NotificationRule) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  width?: number;
}

export const NotificationRuleList: React.FC<NotificationRuleListProps> = ({
  rules,
  selectedRuleId,
  selectedRuleIds,
  onSelect,
  onToggleSelect,
  onSelectAll,
  onAdd,
  onToggleActive,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Checkbox
            size="small"
            checked={rules.length > 0 && selectedRuleIds.size === rules.length}
            indeterminate={selectedRuleIds.size > 0 && selectedRuleIds.size < rules.length}
            onChange={(e) => onSelectAll(e.target.checked)}
            sx={{ p: 0.25 }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
            {t('rules')} ({rules.length})
          </Typography>
        </Box>
        <Button
          variant="contained"
          disableElevation
          size="small"
          startIcon={<AddIcon />}
          data-testid="add-rule-btn"
          onClick={onAdd}
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}
        >
          {t('addRule')}
        </Button>
      </Box>

      <List disablePadding sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {rules.length > 0 ? rules.map((rule) => (
          <ListItemButton
            key={rule.id}
            selected={rule.id === selectedRuleId}
            onClick={() => onSelect(rule)}
            sx={{
              py: 1,
              px: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              gap: 1,
            }}
          >
            <Checkbox
              size="small"
              checked={selectedRuleIds.has(rule.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(rule.id)}
              sx={{ p: 0.25 }}
            />
            <ListItemText
              primary={rule.name}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 500,
                noWrap: true,
                sx: { fontSize: '0.8rem' },
              }}
            />
            <SeverityChip severity={rule.severity} size="small" />
            <Switch
              size="small"
              checked={rule.is_active}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleActive(rule)}
            />
          </ListItemButton>
        )) : !loading && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">{t('noRulesRegistered')}</Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
