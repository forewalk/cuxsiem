import React, { useState, useMemo } from 'react';
import {
  Box, Typography, TextField, IconButton, Popover, MenuItem, Chip, ListItemText, Tooltip
} from '@mui/material';
import {
  Storage as StorageIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { KIBANA_TEAL } from '../constants';

interface LogStreamControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
  indexOptions: string[];
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  onRefresh: () => void;
  onClearKeyword: () => void;
}

const LogStreamControlBar = React.memo(({
  t, keyword, onKeywordChange, filters, onFiltersChange,
  indexOptions, selectedIndex, onIndexChange, onRefresh, onClearKeyword
}: LogStreamControlBarProps) => {
  const [indexAnchorEl, setIndexAnchorEl] = useState<HTMLDivElement | null>(null);
  const [indexSearch, setIndexSearch] = useState("");

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onRefresh();
  };

  const handleSelectIndex = (index: string) => {
    onIndexChange(index);
    setIndexAnchorEl(null);
  };

  const filteredIndexOptions = indexOptions.filter(opt =>
    opt.toLowerCase().includes(indexSearch.toLowerCase())
  );

  const displayLabel = useMemo(() => {
    if (!selectedIndex) return t('selectIndex');
    return selectedIndex;
  }, [selectedIndex, t]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2, width: '100%' }}>
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            onClick={(e) => setIndexAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid',
              borderColor: selectedIndex ? 'divider' : 'warning.main', borderRadius: 1, px: 1.5, gap: 1, minHeight: 36, cursor: 'pointer',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <StorageIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap', color: selectedIndex ? 'text.primary' : 'text.disabled' }}>
              {displayLabel}
            </Typography>
            <ArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
          </Box>
          <Tooltip title={t('timestampRequiredNote')} placement="bottom-start" arrow>
            <InfoIcon sx={{ fontSize: 16, color: 'warning.main', cursor: 'help' }} />
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid',
            borderColor: 'divider', borderRadius: 1, flexGrow: 1, overflow: 'hidden', minHeight: 36
          }}
        >
          <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
          </Box>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth size="small" variant="standard"
              placeholder={t('searchPlaceholder')}
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              sx={{
                "& .MuiInput-underline:before, & .MuiInput-underline:after": { border: 'none' },
                "& .MuiInputBase-input": { py: 0.5, px: 0.5, fontSize: '0.85rem' }
              }}
            />
          </Box>
          {keyword && (
            <IconButton size="small" onClick={onClearKeyword} sx={{ p: 0.5, mr: 0.5 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>
      {filters.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          {filters.map((filter: string, index: number) => (
            <Chip
              key={index}
              label={filter}
              size="small"
              color="primary"
              variant="outlined"
              onDelete={() => {
                onFiltersChange(filters.filter(f => f !== filter));
              }}
              sx={{
                borderRadius: 1,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0, 90, 94, 0.1)' : '#eef6f6',
                "& .MuiChip-label": { userSelect: 'text', cursor: 'text' }
              }}
            />
          ))}
        </Box>
      )}
      <Popover
        open={Boolean(indexAnchorEl)}
        anchorEl={indexAnchorEl}
        onClose={() => setIndexAnchorEl(null)}
        PaperProps={{ sx: { width: 350, mt: 1, maxHeight: 500, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <TextField
            fullWidth size="small" placeholder={t('search')}
            value={indexSearch}
            onChange={(e) => setIndexSearch(e.target.value)}
          />
        </Box>
        <Box sx={{ overflowY: 'auto', py: 0.5, flexGrow: 1 }}>
          {filteredIndexOptions.map((index: string) => (
            <MenuItem
              key={index}
              onClick={() => handleSelectIndex(index)}
              selected={selectedIndex === index}
              sx={{
                fontSize: '0.85rem', py: 0.75,
                '&.Mui-selected': { bgcolor: `${KIBANA_TEAL}22`, fontWeight: 'bold' }
              }}
            >
              <ListItemText
                primary={index}
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                }}
              />
            </MenuItem>
          ))}
          {filteredIndexOptions.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.disabled' }}>
              <Typography variant="caption">{t('noResults')}</Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
});

export default LogStreamControlBar;
