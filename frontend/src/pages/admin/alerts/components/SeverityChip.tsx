import React from 'react';
import { Chip } from '@mui/material';

interface SeverityChipProps {
  severity: string | null;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const SeverityChip: React.FC<SeverityChipProps> = ({
  severity,
  size = 'small',
  variant = 'outlined'
}) => {
  if (!severity) return <>-</>;

  const getMuiColor = (s: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (s.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={severity.toUpperCase()}
      color={getMuiColor(severity)}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 'bold',
        height: 20,
        fontSize: '0.65rem',
      }}
    />
  );
};

