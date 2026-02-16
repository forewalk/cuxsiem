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

  let color: "info" | "warning" | "error" | "default" = "default";
  switch (severity.toLowerCase()) {
    case 'info': color = "info"; break;
    case 'warning': color = "warning"; break;
    case 'error': color = "error"; break;
  }

  return (
    <Chip
      label={severity.toUpperCase()}
      color={color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 'bold',
        height: 20,
        fontSize: '0.65rem'
      }}
    />
  );
};

