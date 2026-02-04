import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, Stack, Button, IconButton, Tooltip } from '@mui/material';
import { 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon,
  DeleteSweep as ClearIcon,
  VerticalAlignBottom as AutoScrollIcon
} from '@mui/icons-material';
import { logService } from '../../../services/logService';
import type { LogEntry } from '../../../types';
import dayjs from 'dayjs';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const MAX_LOGS = 1000;
const POLL_INTERVAL = 10000; // 10초

const LogStreamingTab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastTimestampRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // i18n
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages };
  const t = useCallback((key: string): string => {
    return (translations[savedLanguage] || translations["ko"])[key] || key;
  }, [savedLanguage]);

  const fetchLogs = useCallback(async () => {
    if (isPaused) return;

    try {
      const response = await logService.getLogStream(lastTimestampRef.current);
      if (response.logs.length > 0) {
        setLogs(prevLogs => {
          // 중복 제거 (ID 기준)
          const newLogs = response.logs.filter(
            newLog => !prevLogs.some(prevLog => prevLog._id === newLog._id)
          );
          
          if (newLogs.length === 0) return prevLogs;

          const combined = [...prevLogs, ...newLogs];
          // 최대 개수 제한
          return combined.slice(-MAX_LOGS);
        });
        lastTimestampRef.current = response.last_timestamp;
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [isPaused]);

  useEffect(() => {
    fetchLogs(); // 최초 로드
    const timer = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  // 자동 스크롤 로직
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // 사용자가 위로 스크롤하면 자동 스크롤 해제
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('logStreaming')}</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title={isPaused ? t('resume') : t('pause')}>
            <IconButton onClick={() => setIsPaused(!isPaused)} color={isPaused ? 'secondary' : 'default'}>
              {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('clearLogs')}>
            <IconButton onClick={() => setLogs([])}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant={autoScroll ? "contained" : "outlined"} 
            size="small" 
            startIcon={<AutoScrollIcon />}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {t('autoScroll')} {autoScroll ? 'ON' : 'OFF'}
          </Button>
        </Stack>
      </Stack>

      <Paper 
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{ 
          flexGrow: 1, 
          bgcolor: '#1e1e1e', 
          color: '#d4d4d4', 
          p: 2, 
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}
      >
        {logs.length === 0 ? (
          <Typography sx={{ color: '#888', fontStyle: 'italic' }}>{t('waitingForLogs')}</Typography>
        ) : (
          logs.map((log) => (
            <Box key={log._id} sx={{ mb: 0.5, borderBottom: '1px solid #333', pb: 0.5 }}>
              <Typography component="span" sx={{ color: '#569cd6', mr: 1, fontWeight: 'bold' }}>
                [{dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}]
              </Typography>
              <Typography component="span" sx={{ color: '#ce9178', mr: 1 }}>
                [{log._index}]
              </Typography>
              <Typography component="span">
                {log.message}
              </Typography>
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
};

export default LogStreamingTab;
