import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Autocomplete, Box, IconButton, TextField, Stack } from '@mui/material';
import React from 'react';

export interface HeaderEntry {
  key: string;
  value: string;
}

const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Language',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Api-Key',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Request-Id',
  'X-Correlation-Id',
];

interface WebhookHeadersEditorProps {
  headers: HeaderEntry[];
  onChange: (headers: HeaderEntry[]) => void;
  t: (key: string) => string;
}

export const WebhookHeadersEditor: React.FC<WebhookHeadersEditorProps> = ({ headers, onChange }) => {
  const ensureTrailingEmpty = (list: HeaderEntry[]): HeaderEntry[] => {
    if (list.length === 0 || list[list.length - 1].key || list[list.length - 1].value) {
      return [...list, { key: '', value: '' }];
    }
    return list;
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, key: newKey } : h));
    onChange(ensureTrailingEmpty(updated));
  };

  const handleValueChange = (index: number, newValue: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, value: newValue } : h));
    onChange(ensureTrailingEmpty(updated));
  };

  const handleDelete = (index: number) => {
    const filtered = headers.filter((_, i) => i !== index);
    onChange(ensureTrailingEmpty(filtered));
  };

  const isEmptyRow = (h: HeaderEntry) => !h.key && !h.value;
  const isLastRow = (index: number) => index === headers.length - 1;

  return (
    <Stack spacing={0.5}>
      {headers.map((header, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            freeSolo
            size="small"
            options={COMMON_HEADERS}
            value={header.key}
            onChange={(_, newValue) => handleKeyChange(index, newValue ?? '')}
            onInputChange={(_, newValue) => handleKeyChange(index, newValue)}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Key"
                InputProps={{ ...params.InputProps, sx: { fontSize: '0.75rem' } }}
              />
            )}
            ListboxProps={{ sx: { fontSize: '0.75rem' } }}
          />
          <TextField
            size="small"
            placeholder="Value"
            value={header.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            sx={{ flex: 2 }}
            InputProps={{ sx: { fontSize: '0.75rem' } }}
          />
          <IconButton
            size="small"
            data-testid="delete-header-btn"
            onClick={() => handleDelete(index)}
            disabled={isLastRow(index) && isEmptyRow(header)}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' }, visibility: isLastRow(index) && isEmptyRow(header) ? 'hidden' : 'visible' }}
          >
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Stack>
  );
};
