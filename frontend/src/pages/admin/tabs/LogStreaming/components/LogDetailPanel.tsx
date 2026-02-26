import React, { useState, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { 
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment, 
  Table, TableBody, TableCell, TableRow, TableContainer 
} from '@mui/material';
import { 
  Close as CloseIcon, Search as DetailIcon, AddCircleOutline as AddFilterIcon 
} from '@mui/icons-material';
import type { LogEntry } from '@/types';
import { flattenObject } from '../utils/logUtils';

interface LogDetailPanelProps {
  log: LogEntry;
  onClose: () => void;
  onFilterAdd: (field: string, value: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LogDetailPanel = React.memo(({ log, onClose, onFilterAdd, t }: LogDetailPanelProps) => {
  const [search, setSearch] = useState("");
  const [fieldWidth, setFieldWidth] = useState(200);
  const isResizing = useRef(false);
  const deferredSearch = useDeferredValue(search);

  const handleMouseMove = useCallback((e: MouseEvent) => { 
    if (!isResizing.current) return; 
    const pe = document.getElementById('log-detail-panel'); 
    if (pe) { 
      const r = pe.getBoundingClientRect(); 
      const nw = e.clientX - r.left; 
      if (nw > 100 && nw < r.width - 100) setFieldWidth(nw); 
    } 
  }, []);

  const stopResizing = useCallback(() => { 
    isResizing.current = false; 
    document.removeEventListener('mousemove', handleMouseMove); 
    document.removeEventListener('mouseup', stopResizing); 
    document.body.style.cursor = 'default'; 
    document.body.style.userSelect = 'auto'; 
  }, [handleMouseMove]);

  const startResizing = useCallback(() => { 
    isResizing.current = true; 
    document.addEventListener('mousemove', handleMouseMove); 
    document.addEventListener('mouseup', stopResizing); 
    document.body.style.cursor = 'col-resize'; 
    document.body.style.userSelect = 'none'; 
  }, [handleMouseMove, stopResizing]);

  const flatD = useMemo(() => { 
    const c = { _id: log._id, _index: log._index, timestamp: log.timestamp, ...(log._source || {}) }; 
    const f = flattenObject(c); 
    return Object.entries(f).map(([k, v]) => ({ 
      k, v: typeof v === 'object' ? JSON.stringify(v) : String(v) 
    })).sort((a, b) => a.k.localeCompare(b.k)); 
  }, [log]);

  const filteredD = useMemo(() => { 
    if (!deferredSearch) return flatD; 
    const s = deferredSearch.toLowerCase(); 
    return flatD.filter(i => i.k.toLowerCase().includes(s) || i.v.toLowerCase().includes(s)); 
  }, [flatD, deferredSearch]);

  return (
    <Box 
      id="log-detail-panel" 
      sx={{ 
        width: { xs: '100%', md: '45%' }, ml: 1, display: 'flex', flexDirection: 'column', 
        border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', 
        mt: 1, overflow: 'hidden', opacity: search !== deferredSearch ? 0.7 : 1, transition: 'opacity 0.2s' 
      }}
    >
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DetailIcon fontSize="small" color="primary" />{t('logDetails')}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField 
          fullWidth size="small" autoFocus placeholder={t('searchFields')} 
          value={search} onChange={(e) => setSearch(e.target.value)} 
          InputProps={{ 
            startAdornment: (<InputAdornment position="start"><DetailIcon fontSize="small" color="action" /></InputAdornment>), 
            sx: { fontSize: '0.8rem' } 
          }} 
        />
      </Box>
      <TableContainer sx={{ flexGrow: 1, overflow: 'auto', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', position: 'relative' }}>
        <Box 
          onMouseDown={startResizing} 
          sx={{ 
            position: 'absolute', left: fieldWidth, top: 0, bottom: 0, width: '6px', marginLeft: '-3px', 
            cursor: 'col-resize', zIndex: 10, transition: 'background-color 0.2s', 
            '&:hover': { bgcolor: 'primary.main', opacity: 0.5 }, 
            '&:active': { bgcolor: 'primary.main', opacity: 0.8, width: '2px', marginLeft: '-1px' } 
          }} 
        />
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableBody>
            {filteredD.map((i) => (
              <TableRow key={i.k} hover sx={{ '&:hover .add-filter-btn': { opacity: 1 } }}>
                <TableCell 
                  sx={{ 
                    width: fieldWidth, fontWeight: 'bold', fontSize: '0.75rem', color: 'primary.main', 
                    fontFamily: 'monospace', verticalAlign: 'top', borderRight: '1px solid', 
                    borderColor: 'divider', py: 1, position: 'relative', overflow: 'hidden', 
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                  }}
                >
                  {i.k}
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'text.primary', py: 1 }}>
                  {i.v}
                </TableCell>
                <TableCell sx={{ width: 48, p: 0, textAlign: 'center', verticalAlign: 'top', pt: 0.5 }}>
                  <Tooltip title={t('addToFilter')}>
                    <IconButton 
                      size="small" 
                      className="add-filter-btn" 
                      onClick={() => onFilterAdd(i.k, i.v)}
                      sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'secondary.main' }}
                    >
                      <AddFilterIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredD.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.disabled', fontStyle: 'italic' }}>
                  {t('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

export default LogDetailPanel;
