import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Button, IconButton, TextField, Stack } from '@mui/material';
import React from 'react';

export interface HeaderEntry {
  key: string;
  value: string;
}

interface WebhookHeadersEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
  t: (key: string) => string;
}

export const WebhookHeadersEditor: React.FC<WebhookHeadersEditorProps> = ({ headers, onChange, t }) => {
  const handleKeyChange = (index: number, newKey: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, key: newKey } : h));
    onChange(updated);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, value: newValue } : h));
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...headers, { key: '', value: '' }]);
  };

  const handleDelete = (index: number) => {
    if (headers.length <= 1) {
      onChange([{ key: '', value: '' }]);
      return;
    }
    onChange(headers.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={0.5}>
      {headers.map((header, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={t('webhookHeaderKey')}
            value={header.key}
            onChange={(e) => handleKeyChange(index, e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder={t('webhookHeaderValue')}
            value={header.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            sx={{ flex: 2 }}
          />
          <IconButton
            size="small"
            data-testid="delete-header-btn"
            onClick={() => handleDelete(index)}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          data-testid="add-header-btn"
          onClick={handleAdd}
          sx={{ textTransform: 'none' }}
        >
          {t('webhookAddHeader')}
        </Button>
      </Box>
    </Stack>
  );
};
