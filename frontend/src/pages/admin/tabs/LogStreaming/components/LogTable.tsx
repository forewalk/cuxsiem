import React, { useRef, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { 
  VerticalAlignBottom as AutoScrollIcon, 
  Search as DetailIcon 
} from '@mui/icons-material';
import dayjs from 'dayjs';
import type { LogEntry } from '@/types';
import { renderFieldValue } from '../utils/logUtils';

interface LogTableProps {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  visibleFields: string[];
  selectedLog: LogEntry | null;
  onSelectLog: (log: LogEntry | null) => void;
  loading: boolean;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
  currentLogDate: string;
  t: (key: string, params?: Record<string, string>) => string;
}

const LogTable = ({ 
  logs, filteredLogs, visibleFields, selectedLog, onSelectLog, 
  loading, autoScroll, onAutoScrollChange, currentLogDate, t 
}: LogTableProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (!isAtBottom && autoScroll) onAutoScrollChange(false);
    else if (isAtBottom && !autoScroll) onAutoScrollChange(true);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      onAutoScrollChange(true);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: 1, px: 3, py: 1, bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider', mt: 1, borderRadius: '4px 4px 0 0' }}>
        {visibleFields.map((f) => {
          const isTimestamp = f === 'timestamp';
          const isIndex = f === '_index';
          const isMessage = f === 'message';
          return (
            <Typography 
              key={f} variant="caption" 
              sx={{ 
                fontWeight: 'bold', color: 'text.secondary', flexShrink: 0, 
                width: isTimestamp ? 120 : isIndex ? 180 : (isMessage ? 'auto' : 150),
                flexGrow: isMessage ? 1 : 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'
              }}
            >
              {isTimestamp ? currentLogDate : f.toUpperCase()}
            </Typography>
          );
        })}
        <Box sx={{ width: 40 }} />
      </Box>
      <Box 
        ref={scrollRef} onScroll={handleScroll} 
        sx={{ 
          flexGrow: 1, bgcolor: 'action.hover', borderRadius: '0 0 4px 4px', p: 1.5, 
          overflowY: 'auto', overflowX: 'hidden', border: '1px solid', borderColor: 'divider', 
          borderTop: 'none', '&::-webkit-scrollbar': { width: '8px' }, 
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' } 
        }}
      >
        {filteredLogs.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, color: 'text.disabled' }}>
            {loading ? <CircularProgress size={24} /> : <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('noResults')}</Typography>}
          </Box>
        ) : (
          filteredLogs.map((l) => (
            <Box 
              key={l._id} 
              sx={{ 
                py: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', 
                alignItems: 'baseline', gap: 1, width: '100%', 
                bgcolor: selectedLog?._id === l._id ? 'action.selected' : 'transparent', 
                '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'action.selected' } 
              }}
            >
              {visibleFields.map((f) => {
                const isTimestamp = f === 'timestamp';
                const isIndex = f === '_index';
                const isMessage = f === 'message';
                return (
                  <Typography 
                    key={f} variant={isMessage ? 'body2' : 'caption'} 
                    sx={{ 
                      fontFamily: 'monospace', fontSize: isMessage ? '0.85rem' : '0.7rem', 
                      color: isTimestamp ? 'text.primary' : isIndex ? 'text.secondary' : 'text.primary', 
                      fontWeight: (isTimestamp || isIndex) ? 'bold' : 'normal', flexShrink: isMessage ? 1 : 0, 
                      width: isTimestamp ? 120 : isIndex ? 180 : (isMessage ? 'auto' : 150),
                      flexGrow: isMessage ? 1 : 0, minWidth: 0, wordBreak: 'break-all', 
                      whiteSpace: isTimestamp ? 'nowrap' : 'normal', lineHeight: 1.4, 
                      ...(isMessage && { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }), 
                      ...(isIndex && { bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5 }) 
                    }}
                  >
                    {isTimestamp ? (renderFieldValue(l, f) !== '-' ? dayjs(renderFieldValue(l, f)).format('HH:mm:ss.SSS') : '-') : renderFieldValue(l, f)}
                  </Typography>
                );
              })}
              <Box sx={{ flexShrink: 0, ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <Tooltip title="View Detail">
                  <IconButton 
                    size="small" 
                    onClick={() => onSelectLog(selectedLog?._id === l._id ? null : l)} 
                    color={selectedLog?._id === l._id ? "primary" : "default"}
                  >
                    <DetailIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}
      </Box>
      {!autoScroll && filteredLogs.length > 0 && (
        <Button 
          variant="contained" size="small" startIcon={<AutoScrollIcon />} onClick={scrollToBottom} 
          sx={{ 
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', 
            borderRadius: 5, textTransform: 'none', bgcolor: 'primary.main', color: 'white', 
            boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } 
          }}
        >
          Go to Bottom
        </Button>
      )}
    </Box>
  );
};

export default LogTable;
