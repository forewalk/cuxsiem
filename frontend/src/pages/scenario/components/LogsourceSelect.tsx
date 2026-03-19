import {
  Checkbox,
  Divider,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

interface LogsourceOption {
  value: string;
  count: number;
}

interface LogsourceSelectProps {
  label: string;
  options: LogsourceOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  loading?: boolean;
  minWidth?: number;
  allowCustomInput?: boolean;
}

const CUSTOM_INPUT_SENTINEL = '__CUSTOM_INPUT__';

export const LogsourceSelect: React.FC<LogsourceSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  loading,
  minWidth = 120,
  allowCustomInput = false,
}) => {
  const { t } = useTranslation();
  const [customInputMode, setCustomInputMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleChange = useCallback((e: { target: { value: unknown } }) => {
    const raw = e.target.value;
    const next = typeof raw === 'string' ? raw.split(',') : (raw as string[]);

    if (allowCustomInput && next.includes(CUSTOM_INPUT_SENTINEL)) {
      setCustomInputMode(true);
      return;
    }

    onChange(next.filter(v => v !== CUSTOM_INPUT_SENTINEL));
  }, [onChange, allowCustomInput]);

  const handleCustomSubmit = useCallback(() => {
    const trimmed = customValue.trim().toLowerCase();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomValue('');
    setCustomInputMode(false);
  }, [customValue, selected, onChange]);

  const handleCustomKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setCustomInputMode(false);
      setCustomValue('');
    }
  }, [handleCustomSubmit]);

  const displayCount = selected.length;

  return (
    <Select
      multiple
      size="small"
      value={selected}
      onChange={handleChange}
      displayEmpty
      open={customInputMode ? true : undefined}
      renderValue={() => (
        <Typography variant="caption" noWrap sx={{ fontSize: '0.72rem', color: displayCount === 0 ? 'text.disabled' : 'text.primary' }}>
          {displayCount === 0 ? label : `${label} (${displayCount})`}
        </Typography>
      )}
      sx={{ minWidth, '& .MuiSelect-select': { py: 0.5, px: 1, fontSize: '0.72rem' } }}
      MenuProps={{ PaperProps: { sx: { maxHeight: 360, minWidth: 180 } }, MenuListProps: { autoFocusItem: false } }}
    >
      {loading && (
        <MenuItem disabled dense>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>Loading...</Typography>
        </MenuItem>
      )}

      {options.map(opt => (
        <MenuItem key={opt.value} value={opt.value} dense sx={{ py: 0.25, px: 0.5 }}>
          <Checkbox size="small" checked={selected.includes(opt.value)} sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
          <ListItemText
            primary={opt.value}
            secondary={`${opt.count}`}
            primaryTypographyProps={{ fontSize: '0.72rem', fontFamily: 'monospace' }}
            secondaryTypographyProps={{ fontSize: '0.6rem', color: 'text.disabled' }}
            sx={{ my: 0 }}
          />
        </MenuItem>
      ))}

      {allowCustomInput && options.length > 0 && <Divider sx={{ my: 0.25 }} />}

      {allowCustomInput && (customInputMode ? (
        <MenuItem dense disableRipple sx={{ px: 1, py: 0.5, '&:hover': { bgcolor: 'transparent' } }}
          onKeyDown={e => e.stopPropagation()}>
          <TextField
            autoFocus
            size="small"
            variant="standard"
            placeholder={t('lsCustomInputPlaceholder')}
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            onBlur={handleCustomSubmit}
            InputProps={{ sx: { fontSize: '0.72rem', fontFamily: 'monospace' } }}
            sx={{ width: '100%' }}
          />
        </MenuItem>
      ) : (
        <MenuItem value={CUSTOM_INPUT_SENTINEL} dense sx={{ px: 0.5, py: 0.25 }}>
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'primary.main', fontWeight: 600 }}>
            + {t('lsCustomInput')}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  );
};
