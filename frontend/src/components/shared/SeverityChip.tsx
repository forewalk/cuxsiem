import { Chip } from '@mui/material';
import React from 'react';

type MuiSeverityColor = 'error' | 'warning' | 'info' | 'success' | 'default';

export const mapSeverityToMui = (severity: string | null | undefined): MuiSeverityColor => {
  if (!severity) return 'info';
  const s = severity.toLowerCase().trim();
  if (s === 'critical' || s === 'high' || s === 'error') return 'error';
  if (s === 'medium' || s === 'warning') return 'warning';
  if (s === 'success') return 'success';
  return 'info';
};

export const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

interface SeverityChipProps {
  severity: string | null;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const SeverityChip: React.FC<SeverityChipProps> = ({
  severity,
  size = 'small',
  variant = 'outlined',
}) => {
  if (!severity) return <>-</>;

  return (
    <Chip
      label={capitalize(severity)}
      color={mapSeverityToMui(severity)}
      size={size}
      variant={variant}
      sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }}
    />
  );
};
