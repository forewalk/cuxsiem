import { Chip } from '@mui/material';
import React from 'react';
import { mapSeverityToMui } from './AlertTableStyles';

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

  return (
    <Chip
      label={severity.toUpperCase()}
      color={mapSeverityToMui(severity)}
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
