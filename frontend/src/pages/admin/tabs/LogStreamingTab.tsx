import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon,
  DeleteSweep as ClearIcon,
  VerticalAlignBottom as AutoScrollIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import { 
  Box, Typography, Paper, Stack, Button, IconButton, Tooltip, 
  Divider, LinearProgress, CircularProgress, Chip
} from '@mui/material';
import ControlBar from "../../dashboard/components/ControlBar";
import { logService } from '../../../services/logService';
import { useLanguageStore } from "../../../stores/useLanguageStore";
import useTabStore from '../../../stores/tabStore';
import type { LogEntry } from '../../../types';
import dayjs from 'dayjs';

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const MAX_LOGS = 1000;
const POLL_INTERVAL = 10000; // 10초

const LogStreamingTab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeTabId } = useTabStore();
  const isActive = activeTabId === 'LogStreamingTab';

  // ControlBar states
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { language } = useLanguageStore();
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  
  // 표시할 필드 리스트 상태
  const [visibleFields] = useState<string[]>(['timestamp', '_index', 'message']);

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [language]);

  const handleTimeChange = (
    fVal: number | null, 
    fUnit: string, 
    tVal: number | null, 
    tUnit: string,
    fDate: string | null = null,
    tDate: string | null = null
  ) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
    setFromDate(fDate);
    setToDate(tDate);
  };

  const fetchLogs = useCallback(async (isManualRefresh = false) => {
    // 탭이 활성화되지 않았거나 일시 중지 상태이면 (수동 새로고침이나 초기화가 아닌 경우) 중단
    if ((!isActive || isPaused) && !isManualRefresh) return;

    try {
      if (isManualRefresh) setLoading(true);
      
      const response = await logService.getLogStream(lastTimestampRef.current, 100, searchQuery);
      
      if (response.logs.length > 0) {
        setLogs(prevLogs => {
          // 검색어가 있는 상태에서 새로 조회를 시작하는 경우(lastTimestamp가 없는 경우)는 기존 로그 무시
          if (!lastTimestampRef.current) return response.logs.slice(-MAX_LOGS);

          const newLogs = response.logs.filter(
            newLog => !prevLogs.some(prevLog => prevLog._id === newLog._id)
          );
          
          if (newLogs.length === 0) return prevLogs;

          const combined = [...prevLogs, ...newLogs];
          return combined.slice(-MAX_LOGS);
        });
        lastTimestampRef.current = response.last_timestamp;
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      if (isManualRefresh) setLoading(false);
    }
  }, [isActive, isPaused, searchQuery]);

  // 검색어가 변경되면 로그를 비우고 다시 조회를 시작함
  useEffect(() => {
    if (isActive) {
      setLogs([]);
      lastTimestampRef.current = null;
      fetchLogs(true);
    }
  }, [searchQuery, isActive]);

  useEffect(() => {
    // 탭이 활성화될 때 한 번 즉시 호출 (searchQuery useEffect가 처리하므로 중복 방지 필요)
    const timer = setInterval(() => fetchLogs(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && scrollRef.current && isActive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isActive]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // 필드 값 렌더링 함수
  const renderFieldValue = (log: LogEntry, field: string) => {
    if (field === 'timestamp') {
      return `[${dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}]`;
    }
    if (field === '_index') {
      return log._index;
    }
    if (field === 'message') {
      return log.message;
    }
    // _source 내의 깊은 필드 접근 지원 (예: 'endpoint.name')
    const source = (log as any)._source || {};
    const value = field.split('.').reduce((obj, key) => obj?.[key], source);
    return value !== undefined ? String(value) : '-';
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={() => fetchLogs(true)}
      />

      <Paper elevation={1} sx={{ p: 3, height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('logStreaming')}</Typography>
            <Chip label={`${logs.length} logs`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title={isPaused ? t('resume') : t('pause')}>
              <IconButton size="small" onClick={() => setIsPaused(!isPaused)} color={isPaused ? 'secondary' : 'default'}>
                {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={t('clearLogs')}>
              <IconButton size="small" onClick={() => { setLogs([]); lastTimestampRef.current = null; }}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Button 
              variant={autoScroll ? "contained" : "outlined"} 
              size="small" 
              startIcon={<AutoScrollIcon />}
              onClick={() => setAutoScroll(!autoScroll)}
              sx={{ textTransform: 'none', borderRadius: 1.5 }}
            >
              {t('autoScroll')}
            </Button>
          </Stack>
        </Stack>
        
        <Divider />

        {/* 필드 헤더 영역 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          px: 3, 
          py: 1, 
          bgcolor: 'action.selected', 
          borderBottom: '1px solid',
          borderColor: 'divider',
          mt: 1,
          borderRadius: '4px 4px 0 0'
        }}>
          {visibleFields.map((field) => (
            <Typography 
              key={field} 
              variant="caption" 
              sx={{ 
                fontWeight: 'bold', 
                color: 'text.secondary',
                flexShrink: 0,
                width: field === 'timestamp' ? 230 : field === '_index' ? 150 : 'auto',
                flexGrow: field === 'message' ? 1 : 0,
                minWidth: 0
              }}
            >
              {field.toUpperCase()}
            </Typography>
          ))}
        </Box>

        <Box 
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{ 
            flexGrow: 1, 
            bgcolor: 'action.hover', 
            borderRadius: '0 0 4px 4px',
            p: 2, 
            overflowY: 'auto',
            overflowX: 'hidden', // 가로 스크롤 방지
            border: '1px solid',
            borderColor: 'divider',
            borderTop: 'none'
          }}
        >
          {logs.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, color: 'text.disabled' }}>
              {loading ? <CircularProgress size={24} /> : <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('waitingForLogs')}</Typography>}
            </Box>
          ) : (
            logs.map((log) => (
              <Box 
                key={log._id} 
                sx={{ 
                  py: 0.2,
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 1,
                  width: '100%',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: 'action.selected' }
                }}
              >
                {visibleFields.map((field) => (
                  <Typography 
                    key={field}
                    variant={field === 'message' ? 'body2' : 'caption'}
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: field === 'message' ? '0.85rem' : field === 'timestamp' ? '0.8rem' : '0.75rem', 
                      color: field === 'timestamp' ? 'primary.main' : field === '_index' ? 'text.secondary' : 'text.primary',
                      fontWeight: (field === 'timestamp' || field === '_index') ? 'bold' : 'normal',
                      // 고정 필드는 수축 방지(0), 메시지 필드는 수축 허용(1)
                      flexShrink: field === 'message' ? 1 : 0,
                      // 메시지 필드는 flexGrow로 남은 공간 차지, 나머지는 고정 너비
                      width: field === 'timestamp' ? 230 : field === '_index' ? 150 : 'auto',
                      flexGrow: field === 'message' ? 1 : 0,
                      minWidth: 0, 
                      wordBreak: 'break-all', 
                      whiteSpace: field === 'message' ? 'normal' : 'nowrap', 
                      lineHeight: 1.4,
                      ...(field === '_index' && {
                        bgcolor: 'action.selected',
                        px: 0.5,
                        borderRadius: 0.5,
                        width: 'fit-content',
                        minWidth: 142
                      })
                    }}
                  >
                    {renderFieldValue(log, field)}
                  </Typography>
                ))}
              </Box>
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );

};

export default LogStreamingTab;


