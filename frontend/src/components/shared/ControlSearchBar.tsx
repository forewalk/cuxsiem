import React, { useState } from 'react';
import { Box, TextField, IconButton, Button } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const ACCENT = '#005a5e';

export interface ControlSearchBarProps {
  t: (key: string) => string;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

const ControlSearchBar: React.FC<ControlSearchBarProps> = ({ t, placeholder, onSubmit }) => {
  const theme = useTheme();
  const BORDER_COLOR = theme.palette.divider;
  const BG_COLOR = theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f5f7fa';
  const TEXT_COLOR = theme.palette.text.primary;

  const [tempQuery, setTempQuery] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSubmit(tempQuery);
  };

  const handleClear = () => {
    setTempQuery('');
    onSubmit('');
  };

  return (
    <>
      {/* 검색 입력 박스 */}
      <Box sx={{
        display: 'flex', alignItems: 'center', bgcolor: BG_COLOR,
        border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, flexGrow: 1,
        overflow: 'hidden', minHeight: 32,
      }}>
        <Box sx={{ px: 0.75, display: 'flex', alignItems: 'center' }}>
          <SearchIcon sx={{ color: ACCENT, fontSize: 16 }} />
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth size="small" variant="standard"
            placeholder={placeholder ?? t('search')}
            value={tempQuery}
            onChange={(e) => setTempQuery(e.target.value)}
            sx={{
              '& .MuiInputBase-root': { mt: 0 },
              '& .MuiInput-underline:before, & .MuiInput-underline:after': { border: 'none' },
              '& .MuiInput-underline:hover:not(.Mui-disabled):before': { border: 'none' },
              '& .MuiInputBase-input': { py: 0.5, px: 0.5, fontSize: '0.85rem', color: TEXT_COLOR },
            }}
          />
        </Box>
        {tempQuery && (
          <IconButton size="small" onClick={handleClear} sx={{ p: 0.5, mr: 0.5 }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      {/* 검색 버튼 */}
      <Button
        variant="contained" disableElevation
        startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
        onClick={() => handleSubmit()}
        sx={{
          bgcolor: ACCENT, color: '#fff', textTransform: 'none', fontWeight: 'bold',
          px: 1.5, minWidth: 70, minHeight: 32, fontSize: '0.75rem',
          '&:hover': { bgcolor: '#004a4d' },
        }}
      >
        {t('search')}
      </Button>
    </>
  );
};

export default ControlSearchBar;
