import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Popover, TextField, List, ListItemButton,
  ListItemIcon, ListItemText, ListSubheader, Checkbox
} from '@mui/material';
import { RestartAlt as ResetIcon } from '@mui/icons-material';

interface FieldSelectorPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  availableFields: string[];
  visibleFields: string[];
  onToggleField: (field: string) => void;
  onReset: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const FieldSelectorPopover = React.memo(({ 
  open, anchorEl, onClose, availableFields, visibleFields, onToggleField, onReset, t 
}: FieldSelectorPopoverProps) => {
  const [search, setSearch] = useState("");
  
  const filteredFields = useMemo(() => {
    if (!search) return availableFields;
    return availableFields.filter((f: string) => f.toLowerCase().includes(search.toLowerCase()));
  }, [availableFields, search]);

  const sortedFields = useMemo(() => {
    return [...filteredFields].sort((a: string, b: string) => {
      const aVisible = visibleFields.includes(a);
      const bVisible = visibleFields.includes(b);
      if (aVisible && !bVisible) return -1;
      if (!aVisible && bVisible) return 1;
      return a.localeCompare(b);
    });
  }, [filteredFields, visibleFields]);

  return (
    <Popover 
      open={open} anchorEl={anchorEl} onClose={onClose} 
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
      transformOrigin={{ vertical: 'top', horizontal: 'right' }} 
      PaperProps={{ sx: { width: 320, maxHeight: 480, mt: 1, display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('selectFields')}</Typography>
          <Button size="small" variant="text" startIcon={<ResetIcon />} onClick={onReset} sx={{ fontSize: '0.7rem' }}>
            {t('resetFields')}
          </Button>
        </Box>
        <TextField 
          fullWidth size="small" placeholder={t('searchFields')} 
          value={search} onChange={(e) => setSearch(e.target.value)} 
          sx={{ "& .MuiInputBase-input": { fontSize: '0.8rem' } }} 
        />
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0.5 }}>
        <List
          subheader={
            <ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '32px', fontSize: '0.7rem' }}>
              {search ? t('searchResults') : t('availableFields')}
            </ListSubheader>
          }
        >
          {sortedFields.map((field: string) => {
            const isVisible = visibleFields.includes(field);
            const isRequired = field === 'timestamp';
            return (
              <ListItemButton key={field} dense onClick={() => !isRequired && onToggleField(field)} disabled={isRequired} sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox size="small" edge="start" checked={isVisible} disableRipple disabled={isRequired} />
                </ListItemIcon>
                <ListItemText
                  primary={field}
                  primaryTypographyProps={{
                    fontSize: '0.8rem', fontFamily: 'monospace',
                    sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Popover>
  );
});

export default FieldSelectorPopover;
