import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon,
  DeleteSweep as ClearIcon,
  VerticalAlignBottom as AutoScrollIcon,
  Terminal as TerminalIcon,
  Search as DetailIcon,
  Close as CloseIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { 
  Box, Typography, Paper, Stack, Button, IconButton, Tooltip, 
  Divider, LinearProgress, CircularProgress, Chip, TextField,
  InputAdornment, Table, TableBody, TableCell, TableRow, TableContainer
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

// 객체 평탄화 유틸리티 함수
const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  if (!obj) return {};
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

// 로그 상세 정보 전용 컴포넌트 (성능 최적화)
const LogDetailPanel = React.memo(({ 
  log, 
  onClose, 
  t 
}: { 
  log: LogEntry; 
  onClose: () => void; 
  t: any 
}) => {
  const [search, setSearch] = useState("");
  const [fieldWidth, setFieldWidth] = useState(200); // 필드 열 너비 상태
  const isResizing = useRef(false);
  
  // useDeferredValue를 사용하여 검색어 입력 반응성을 확보하고 필터링 렌더링을 지연시킴
  const deferredSearch = useDeferredValue(search);

  // 리사이징 핸들러
  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    // 상세 패널의 위치를 기준으로 마우스의 상대적 위치 계산
    const panelElement = document.getElementById('log-detail-panel');
    if (panelElement) {
      const rect = panelElement.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth > 100 && newWidth < rect.width - 100) {
        setFieldWidth(newWidth);
      }
    }
  }, []);

  const flattenedDetail = useMemo(() => {
    const combinedData = {
      _id: log._id,
      _index: log._index,
      timestamp: log.timestamp,
      ...(log._source || {})
    };
    const flat = flattenObject(combinedData);
    return Object.entries(flat)
      .map(([key, value]) => ({ 
        key, 
        value: typeof value === 'object' ? JSON.stringify(value) : String(value) 
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [log]);

  const filteredDetail = useMemo(() => {
    if (!deferredSearch) return flattenedDetail;
    const s = deferredSearch.toLowerCase();
    return flattenedDetail.filter(item => 
      item.key.toLowerCase().includes(s) || 
      item.value.toLowerCase().includes(s)
    );
  }, [flattenedDetail, deferredSearch]);

  return (
    <Box 
      id="log-detail-panel"
      sx={{ 
        width: { xs: '100%', md: '45%' }, 
        ml: 1, 
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        mt: 1,
        overflow: 'hidden',
        opacity: search !== deferredSearch ? 0.7 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DetailIcon fontSize="small" color="primary" />
          {t('logDetails')}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          placeholder={t('searchFields')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <DetailIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            sx: { fontSize: '0.8rem' }
          }}
        />
      </Box>

      <TableContainer sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
      }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableBody>
            {filteredDetail.map((item) => (
              <TableRow key={item.key} hover>
                <TableCell sx={{ 
                  width: fieldWidth, 
                  fontWeight: 'bold', 
                  fontSize: '0.75rem', 
                  color: 'primary.main',
                  fontFamily: 'monospace',
                  verticalAlign: 'top',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  py: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.key}
                  {/* 리사이징 핸들 */}
                  <Box
                    onMouseDown={startResizing}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      cursor: 'col-resize',
                      '&:hover': {
                        bgcolor: 'primary.main',
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  fontSize: '0.75rem', 
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: 'text.primary',
                  py: 1
                }}>
                  {item.value}
                </TableCell>
              </TableRow>
            ))}
            {filteredDetail.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.disabled', fontStyle: 'italic' }}>
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

const LogStreamingTab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('*');
  const [indexOptions, setIndexOptions] = useState<string[]>(['*']);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeTabId } = useTabStore();
  const isActive = activeTabId === 'LogStreamingTab';

  // 인덱스 목록 동적 로드
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const response = await logService.getIndices();
        // '*' (전체 로그)를 항상 최상단에 배치
        const indices = response.indices.includes('*') 
          ? response.indices 
          : ['*', ...response.indices];
        setIndexOptions(indices);
        
        // 현재 선택된 인덱스가 목록에 없으면 '*'로 설정
        if (indices.length > 0 && !indices.includes(selectedIndex)) {
          setSelectedIndex('*');
        }
      } catch (error) {
        console.error('Failed to fetch indices:', error);
        setIndexOptions(['*']);
      }
    };

    if (isActive) {
      fetchIndices();
    }
  }, [isActive]);

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
      
      // 시간 범위 변환
      let fromTime: string | undefined = undefined;
      let toTime: string | undefined = undefined;

      // 시작 시간 설정
      if (!lastTimestampRef.current) {
        if (fromDate) {
          fromTime = fromDate;
        } else if (fromValue !== null) {
          fromTime = `now-${fromValue}${fromUnit}`;
        }
      }

      // 종료 시간 설정 (항상 유지)
      if (toDate) {
        toTime = toDate;
      } else if (toValue !== null) {
        toTime = `now-${toValue}${toUnit}`;
      }

      const response = await logService.getLogStream(
        lastTimestampRef.current, 
        MAX_LOGS, 
        searchQuery, 
        selectedIndex,
        fromTime,
        toTime
      );
      
      if (response.logs.length > 0) {
        setLogs(prevLogs => {
          // 검색어/인덱스/시간이 변경되어 새로 조회를 시작하는 경우 기존 로그 무시
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
  }, [isActive, isPaused, searchQuery, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit]);

  // 검색어, 인덱스 또는 시간 범위가 변경되면 로그를 비우고 다시 조회를 시작함
  useEffect(() => {
    if (isActive) {
      setLogs([]);
      lastTimestampRef.current = null;
      fetchLogs(true);
    }
  }, [searchQuery, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit, isActive]);

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
    // 최하단에서 50px 이내에 있으면 바닥에 붙은 것으로 간주
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  // 스트리밍 상태 변경 시 처리
  const togglePaused = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    // 일시정지를 해제(스트리밍 시작)할 때 즉시 최하단으로 이동
    if (!nextPaused) {
      setTimeout(scrollToBottom, 50);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', p: 3, gap: 1 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={handleTimeChange}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={() => fetchLogs(true)}
        indexOptions={indexOptions}
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
      />

      <Paper elevation={1} sx={{ p: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('logStreaming')}</Typography>
            <Chip label={`${logs.length} logs`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={t('clearLogs')}>
              <IconButton size="small" onClick={() => { setLogs([]); lastTimestampRef.current = null; }}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Button 
              variant="contained"
              size="small" 
              startIcon={isPaused ? <PlayArrowIcon /> : <StopIcon />}
              onClick={togglePaused}
              color={isPaused ? 'error' : 'success'}
              sx={{ 
                textTransform: 'none', 
                borderRadius: 1.5,
                minWidth: 110,
                height: 32,
                fontWeight: 'bold',
                boxShadow: (theme) => isPaused ? 'none' : `0 0 8px ${theme.palette.success.main}44`
              }}
            >
              {isPaused ? t('paused') : t('streaming')}
            </Button>
          </Stack>
        </Stack>
        
        <Divider />

        <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* 로그 리스트 영역 */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
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
                    width: field === 'timestamp' ? 230 : field === '_index' ? 180 : 'auto',
                    flexGrow: field === 'message' ? 1 : 0,
                    minWidth: 0
                  }}
                >
                  {field.toUpperCase()}
                </Typography>
              ))}
              <Box sx={{ width: 40 }} /> {/* 상세 버튼 공간 확보 */}
            </Box>

            <Box 
              ref={scrollRef}
              onScroll={handleScroll}
              sx={{ 
                flexGrow: 1, 
                bgcolor: 'action.hover', 
                borderRadius: '0 0 4px 4px',
                p: 1.5, 
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                borderTop: 'none',
                // 스크롤바 스타일링
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' }
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
                    onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)}
                    sx={{ 
                      py: 0.5,
                      borderBottom: '1px solid', 
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 1,
                      width: '100%',
                      cursor: 'pointer',
                      bgcolor: selectedLog?._id === log._id ? 'action.selected' : 'transparent',
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
                          fontSize: field === 'message' ? '0.85rem' : field === 'timestamp' ? '0.7rem' : '0.7rem', 
                          color: field === 'timestamp' ? 'text.primary' : field === '_index' ? 'text.secondary' : 'text.primary',
                          fontWeight: (field === 'timestamp' || field === '_index') ? 'bold' : 'normal',
                          flexShrink: field === 'message' ? 1 : 0,
                          width: field === 'timestamp' ? 230 : field === '_index' ? 180 : 'auto',
                          flexGrow: field === 'message' ? 1 : 0,
                          minWidth: 0, 
                          wordBreak: 'break-all', 
                          whiteSpace: field === 'timestamp' ? 'nowrap' : 'normal', 
                          lineHeight: 1.4,
                          ...(field === 'message' && {
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }),
                          ...(field === '_index' && {
                            bgcolor: 'action.selected',
                            px: 0.5,
                            borderRadius: 0.5,
                          })
                        }}
                      >
                        {renderFieldValue(log, field)}
                      </Typography>
                    ))}
                    <Box sx={{ flexShrink: 0, ml: 'auto', display: 'flex', alignItems: 'center' }}>
                      <Tooltip title="View Detail">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(selectedLog?._id === log._id ? null : log);
                          }}
                          color={selectedLog?._id === log._id ? "primary" : "default"}
                        >
                          <DetailIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* 최하단 이동 부동 버튼 */}
            {!autoScroll && logs.length > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AutoScrollIcon />}
                onClick={scrollToBottom}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: 5,
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  color: 'white',
                  boxShadow: 3,
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                Go to Bottom
              </Button>
            )}
          </Box>

          {/* 로그 상세 정보 패널 */}
          {selectedLog && (
            <LogDetailPanel 
              log={selectedLog} 
              onClose={() => setSelectedLog(null)} 
              t={t} 
            />
          )}
        </Stack>
      </Paper>
    </Box>
  );

};

export default LogStreamingTab;


