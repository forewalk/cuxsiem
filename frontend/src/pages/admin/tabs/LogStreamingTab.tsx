import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon,
  DeleteSweep as ClearIcon,
  VerticalAlignBottom as AutoScrollIcon,
  Terminal as TerminalIcon,
  Search as DetailIcon,
  Close as CloseIcon,
  Stop as StopIcon,
  CalendarMonth as CalendarIcon,
  KeyboardArrowDown as ArrowDownIcon,
  ArrowForward as ArrowForwardIcon,
  Storage as StorageIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { 
  Box, Typography, Paper, Stack, Button, IconButton, Tooltip, 
  Divider, LinearProgress, CircularProgress, Chip, TextField,
  InputAdornment, Table, TableBody, TableCell, TableRow, TableContainer,
  Popover, Tabs, Tab, MenuItem, Select, FormControl, Divider as MuiDivider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { logService } from '../../../services/logService';
import { useLanguageStore } from "../../../stores/useLanguageStore";
import useTabStore from '../../../stores/tabStore';
import type { LogEntry } from '../../../types';
import dayjs, { Dayjs } from 'dayjs';

// dayjs 로케일
import 'dayjs/locale/ko';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';

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

/**
 * 로그 스트리밍 전용 컨트롤바 (인덱스 선택 및 검색)
 */
const LogStreamControlBar: React.FC<{
  t: any;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  indexOptions: string[];
  selectedIndex: string;
  onIndexChange: (idx: string) => void;
}> = ({ t, searchQuery, onSearchQueryChange, indexOptions, selectedIndex, onIndexChange }) => {
  const [tempQuery, setTempQuery] = useState("");
  const [indexAnchorEl, setIndexAnchorEl] = useState<HTMLDivElement | null>(null);
  const KIBANA_TEAL = "#005a5e";

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempQuery.trim();
    if (trimmed) {
      const newQuery = searchQuery ? `${searchQuery} AND ${trimmed}` : trimmed;
      onSearchQueryChange(newQuery);
      setTempQuery("");
    }
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    const filters = searchQuery.split(" AND ").map(s => s.trim());
    const newFilters = filters.filter(f => f !== filterToRemove);
    onSearchQueryChange(newFilters.join(" AND "));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2, width: '100%' }}>
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5, width: '100%' }}>
        {/* 인덱스 선택기 */}
        <Box 
          onClick={(e) => setIndexAnchorEl(e.currentTarget)}
          sx={{ 
            display: 'flex', alignItems: 'center', bgcolor: 'action.hover', 
            border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, gap: 1, minHeight: 36, cursor: 'pointer',
            '&:hover': { bgcolor: 'action.selected' }
          }}
        >
          <StorageIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            {selectedIndex === '*' ? t('allLogs') : selectedIndex}
          </Typography>
          <ArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
        </Box>

        {/* 검색 입력창 */}
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, flexGrow: 1, overflow: 'hidden', minHeight: 36 }}>
          <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
          </Box>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <TextField 
              fullWidth size="small" variant="standard" placeholder={t('searchPlaceholder')}
              value={tempQuery} onChange={(e) => setTempQuery(e.target.value)}
              sx={{ "& .MuiInput-underline:before, & .MuiInput-underline:after": { border: 'none' }, "& .MuiInputBase-input": { py: 0.5, px: 0.5, fontSize: '0.85rem' } }} 
            />
          </Box>
          {tempQuery && (
            <IconButton size="small" onClick={() => setTempQuery("")} sx={{ p: 0.5, mr: 0.5 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* 필터 태그 목록 */}
      {searchQuery && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          {searchQuery.split(" AND ").map((filter, index) => (
            <Chip
              key={index} label={filter.trim()} size="small" color="primary" variant="outlined"
              onDelete={() => handleRemoveFilter(filter.trim())}
              sx={{ borderRadius: 1, height: 24, fontSize: '0.75rem', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0, 90, 94, 0.1)' : '#eef6f6' }}
            />
          ))}
        </Box>
      )}

      {/* 인덱스 선택 Popover */}
      <Popover 
        open={Boolean(indexAnchorEl)} anchorEl={indexAnchorEl} onClose={() => setIndexAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 300, mt: 1, maxHeight: 400 } }}
      >
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <TextField 
            fullWidth size="small" placeholder={t('search')} 
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              const items = document.querySelectorAll('.index-menu-item');
              items.forEach((item: any) => {
                item.style.display = item.innerText.toLowerCase().includes(val) ? 'flex' : 'none';
              });
            }}
          />
        </Box>
        <Box sx={{ overflowY: 'auto', py: 0.5 }}>
          {indexOptions.map((index) => (
            <MenuItem 
              key={index} className="index-menu-item"
              onClick={() => { onIndexChange(index); setIndexAnchorEl(null); }} 
              selected={selectedIndex === index}
              sx={{ fontSize: '0.85rem', py: 1 }}
            >
              {index === '*' ? t('allLogs') : index}
            </MenuItem>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

// 로그 상세 정보 전용 컴포넌트
const LogDetailPanel = React.memo(({ log, onClose, t }: { log: LogEntry; onClose: () => void; t: any }) => {
  const [search, setSearch] = useState("");
  const [fieldWidth, setFieldWidth] = useState(200);
  const isResizing = useRef(false);
  const deferredSearch = useDeferredValue(search);

  const startResizing = useCallback(() => {
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
    const panelElement = document.getElementById('log-detail-panel');
    if (panelElement) {
      const rect = panelElement.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth > 100 && newWidth < rect.width - 100) setFieldWidth(newWidth);
    }
  }, []);

  const flattenedDetail = useMemo(() => {
    const combinedData = { _id: log._id, _index: log._index, timestamp: log.timestamp, ...(log._source || {}) };
    const flat = flattenObject(combinedData);
    return Object.entries(flat).map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) })).sort((a, b) => a.key.localeCompare(b.key));
  }, [log]);

  const filteredDetail = useMemo(() => {
    if (!deferredSearch) return flattenedDetail;
    const s = deferredSearch.toLowerCase();
    return flattenedDetail.filter(item => item.key.toLowerCase().includes(s) || item.value.toLowerCase().includes(s));
  }, [flattenedDetail, deferredSearch]);

  return (
    <Box id="log-detail-panel" sx={{ width: { xs: '100%', md: '45%' }, ml: 1, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mt: 1, overflow: 'hidden', opacity: search !== deferredSearch ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}><DetailIcon fontSize="small" color="primary" />{t('logDetails')}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField fullWidth size="small" autoFocus placeholder={t('searchFields')} value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><DetailIcon fontSize="small" color="action" /></InputAdornment>), sx: { fontSize: '0.8rem' } }} />
      </Box>
      <TableContainer sx={{ flexGrow: 1, overflow: 'auto', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', position: 'relative' }}>
        <Box onMouseDown={startResizing} sx={{ position: 'absolute', left: fieldWidth, top: 0, bottom: 0, width: '6px', marginLeft: '-3px', cursor: 'col-resize', zIndex: 10, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'primary.main', opacity: 0.5 }, '&:active': { bgcolor: 'primary.main', opacity: 0.8, width: '2px', marginLeft: '-1px' } }} />
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableBody>
            {filteredDetail.map((item) => (
              <TableRow key={item.key} hover>
                <TableCell sx={{ width: fieldWidth, fontWeight: 'bold', fontSize: '0.75rem', color: 'primary.main', fontFamily: 'monospace', verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', py: 1, position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.key}</TableCell>
                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'text.primary', py: 1 }}>{item.value}</TableCell>
              </TableRow>
            ))}
            {filteredDetail.length === 0 && (<TableRow><TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.disabled', fontStyle: 'italic' }}>{t('noResults')}</TableCell></TableRow>)}
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

  const [searchQuery, setSearchQuery] = useState("");

  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [timeAnchorEl, setTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverType, setPopoverType] = useState<'quick' | 'detailed'>('quick');
  const [editingPoint, setEditingPoint] = useState<'from' | 'to'>('from');
  const [tabValue, setTabValue] = useState(1);
  const [popoverVal, setPopoverVal] = useState(15);
  const [popoverUnit, setPopoverUnit] = useState("m");
  const [popoverDate, setPopoverDate] = useState<Dayjs>(dayjs());
  const [popoverTime, setPopoverTime] = useState("12:00");

  const { language } = useLanguageStore();
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  const [visibleFields] = useState<string[]>(['timestamp', '_index', 'message']);

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) Object.entries(params).forEach(([paramKey, value]) => { text = text.replace(`{${paramKey}}`, value); });
    return text;
  }, [language]);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const response = await logService.getIndices();
        const indices = response.indices.includes('*') ? response.indices : ['*', ...response.indices];
        setIndexOptions(indices);
        if (indices.length > 0 && !indices.includes(selectedIndex)) setSelectedIndex('*');
      } catch (error) { setIndexOptions(['*']); }
    };
    if (isActive) fetchIndices();
  }, [isActive, selectedIndex]);

  const fetchLogs = useCallback(async (isManualRefresh = false) => {
    if ((!isActive || isPaused) && !isManualRefresh) return;
    try {
      if (isManualRefresh) setLoading(true);
      let fromTime: string | undefined = undefined;
      let toTime: string | undefined = undefined;
      if (isPaused) {
        if (fromDate) fromTime = fromDate; else if (fromValue !== null) fromTime = `now-${fromValue}${fromUnit}`;
        if (toDate) toTime = toDate; else if (toValue !== null) toTime = `now-${toValue}${toUnit}`;
      } else {
        if (!lastTimestampRef.current) fromTime = "now-15m";
      }
      const response = await logService.getLogStream(lastTimestampRef.current, MAX_LOGS, searchQuery, selectedIndex, fromTime, toTime);
      if (response.logs.length > 0) {
        setLogs(prevLogs => {
          if (!lastTimestampRef.current) return response.logs.slice(-MAX_LOGS);
          const newLogs = response.logs.filter(newLog => !prevLogs.some(prevLog => prevLog._id === newLog._id));
          if (newLogs.length === 0) return prevLogs;
          const combined = [...prevLogs, ...newLogs];
          return combined.slice(-MAX_LOGS);
        });
        lastTimestampRef.current = response.last_timestamp;
      }
    } catch (error) { console.error('Failed to fetch logs:', error); } finally { if (isManualRefresh) setLoading(false); }
  }, [isActive, isPaused, searchQuery, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit]);

  useEffect(() => {
    if (isActive) { setLogs([]); lastTimestampRef.current = null; fetchLogs(true); }
  }, [searchQuery, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit, isActive]);

  useEffect(() => {
    const timer = setInterval(() => fetchLogs(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && scrollRef.current && isActive) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, autoScroll, isActive]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (!isAtBottom && autoScroll) setAutoScroll(false); else if (isAtBottom && !autoScroll) setAutoScroll(true);
  };

  const scrollToBottom = () => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; setAutoScroll(true); } };
  const togglePaused = () => { const nextPaused = !isPaused; setIsPaused(nextPaused); if (!nextPaused) setTimeout(scrollToBottom, 50); };

  const formatPoint = (val: number | null, unit: string, date: string | null, isTo: boolean) => {
    if (isTo && val === null && date === null) return t('now');
    if (date) return dayjs(date).locale(language).format("MMM D, YYYY @ HH:mm");
    const unitText: any = { 'm': t('minutesAgo'), 'h': t('hoursAgo'), 'd': t('daysAgo') };
    return `~ ${val} ${unitText[unit]}`;
  };

  const handleQuickTimeClick = (event: React.MouseEvent<HTMLDivElement>) => { if (!isPaused) return; setPopoverType('quick'); setTimeAnchorEl(event.currentTarget.parentElement as HTMLDivElement); };
  const handleDetailedTimeClick = (point: 'from' | 'to', event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPaused) return; setPopoverType('detailed'); setEditingPoint(point);
    const dateVal = point === 'from' ? fromDate : toDate;
    const relVal = point === 'from' ? fromValue : toValue;
    const relUnit = point === 'from' ? fromUnit : toUnit;
    if (dateVal) { const d = dayjs(dateVal); setPopoverDate(d); setPopoverTime(d.format("HH:mm")); setTabValue(0); }
    else if (relVal !== null) { setPopoverVal(relVal); setPopoverUnit(relUnit); setTabValue(1); }
    else { setTabValue(point === 'from' ? 1 : 2); }
    setTimeAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleApplyTime = () => {
    const absoluteISO = popoverDate.hour(parseInt(popoverTime.split(":")[0])).minute(parseInt(popoverTime.split(":")[1])).second(0).toISOString();
    if (editingPoint === 'from') { if (tabValue === 0) { setFromDate(absoluteISO); setFromValue(null); } else if (tabValue === 1) { setFromValue(popoverVal); setFromUnit(popoverUnit); setFromDate(null); } else { setFromDate(dayjs().toISOString()); setFromValue(null); } }
    else { if (tabValue === 0) { setToDate(absoluteISO); setToValue(null); } else if (tabValue === 1) { setToValue(popoverVal); setToUnit(popoverUnit); setToDate(null); } else { setToDate(null); setToValue(null); } }
    setTimeAnchorEl(null);
  };

  const handleCommonTime = (val: number, unit: string) => {
    if (val === 0 && unit === 'd') { setFromDate(dayjs().startOf('day').toISOString()); setFromValue(null); } else { setFromValue(val); setFromUnit(unit); setFromDate(null); }
    setToValue(null); setToUnit("m"); setToDate(null); setTimeAnchorEl(null);
  };

  const timeOptions = useMemo(() => {
    const times = [];
    for (let h = 0; h < 24; h++) { for (let m = 0; m < 60; m += 30) { times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`); } }
    return times;
  }, []);

  const renderFieldValue = (log: LogEntry, field: string) => {
    if (field === 'timestamp') return `[${dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}]`;
    if (field === '_index') return log._index;
    if (field === 'message') return log.message;
    const source = (log as any)._source || {};
    const value = field.split('.').reduce((obj, key) => obj?.[key], source);
    return value !== undefined ? String(value) : '-';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', p: 3, gap: 1 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      {/* 로그 스트리밍 전용 컨트롤바 (외부 ControlBar 제거) */}
      <LogStreamControlBar 
        t={t}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} 
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
            {/* 시간 설정 UI (내부) */}
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: timeAnchorEl ? 'primary.main' : 'divider', borderRadius: 1, overflow: 'hidden', height: 32, opacity: isPaused ? 1 : 0.6, pointerEvents: isPaused ? 'auto' : 'none', transition: 'all 0.2s' }}>
              <Box onClick={handleQuickTimeClick} sx={{ px: 0.75, borderRight: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><CalendarIcon sx={{ color: 'primary.main', fontSize: 18 }} /><ArrowDownIcon sx={{ color: 'primary.main', fontSize: 14 }} /></Box>
              <Box onClick={(e) => handleDetailedTimeClick('from', e)} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>{formatPoint(fromValue, fromUnit, fromDate, false)}</Typography></Box>
              <ArrowForwardIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
              <Box onClick={(e) => handleDetailedTimeClick('to', e)} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>{formatPoint(toValue, toUnit, toDate, true)}</Typography></Box>
            </Box>

            <Tooltip title={t('clearLogs')}><IconButton size="small" onClick={() => { setLogs([]); lastTimestampRef.current = null; }}><ClearIcon /></IconButton></Tooltip>
            <Button variant="contained" size="small" startIcon={isPaused ? <PlayArrowIcon /> : <StopIcon />} onClick={togglePaused} color={isPaused ? 'error' : 'success'} sx={{ textTransform: 'none', borderRadius: 1.5, minWidth: 110, height: 32, fontWeight: 'bold', boxShadow: (theme) => isPaused ? 'none' : `0 0 8px ${theme.palette.success.main}44` }}>{isPaused ? t('paused') : t('streaming')}</Button>
          </Stack>
        </Stack>
        
        <Divider />

        <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
            <Box sx={{ display: 'flex', gap: 1, px: 3, py: 1, bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider', mt: 1, borderRadius: '4px 4px 0 0' }}>
              {visibleFields.map((field) => (<Typography key={field} variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', flexShrink: 0, width: field === 'timestamp' ? 230 : field === '_index' ? 180 : 'auto', flexGrow: field === 'message' ? 1 : 0, minWidth: 0 }}>{field.toUpperCase()}</Typography>))}
              <Box sx={{ width: 40 }} />
            </Box>
            <Box ref={scrollRef} onScroll={handleScroll} sx={{ flexGrow: 1, bgcolor: 'action.hover', borderRadius: '0 0 4px 4px', p: 1.5, overflowY: 'auto', overflowX: 'hidden', border: '1px solid', borderColor: 'divider', borderTop: 'none', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' } }}>
              {logs.length === 0 ? (<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, color: 'text.disabled' }}>{loading ? <CircularProgress size={24} /> : <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('waitingForLogs')}</Typography>}</Box>) : (
                logs.map((log) => (
                  <Box key={log._id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'baseline', gap: 1, width: '100%', bgcolor: selectedLog?._id === log._id ? 'action.selected' : 'transparent', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'action.selected' } }}>
                    {visibleFields.map((field) => (<Typography key={field} variant={field === 'message' ? 'body2' : 'caption'} sx={{ fontFamily: 'monospace', fontSize: field === 'message' ? '0.85rem' : '0.7rem', color: field === 'timestamp' ? 'text.primary' : field === '_index' ? 'text.secondary' : 'text.primary', fontWeight: (field === 'timestamp' || field === '_index') ? 'bold' : 'normal', flexShrink: field === 'message' ? 1 : 0, width: field === 'timestamp' ? 230 : field === '_index' ? 180 : 'auto', flexGrow: field === 'message' ? 1 : 0, minWidth: 0, wordBreak: 'break-all', whiteSpace: field === 'timestamp' ? 'nowrap' : 'normal', lineHeight: 1.4, ...(field === 'message' && { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }), ...(field === '_index' && { bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5 }) }}>{renderFieldValue(log, field)}</Typography>))}
                    <Box sx={{ flexShrink: 0, ml: 'auto', display: 'flex', alignItems: 'center' }}><Tooltip title="View Detail"><IconButton size="small" onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)} color={selectedLog?._id === log._id ? "primary" : "default"}><DetailIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip></Box>
                  </Box>
                ))
              )}
            </Box>
            {!autoScroll && logs.length > 0 && (<Button variant="contained" size="small" startIcon={<AutoScrollIcon />} onClick={scrollToBottom} sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', borderRadius: 5, textTransform: 'none', bgcolor: 'primary.main', color: 'white', boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } }}>Go to Bottom</Button>)}
          </Box>
          {selectedLog && <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} t={t} />}
        </Stack>
      </Paper>

      {/* 시간 설정 Popover */}
      <Popover open={Boolean(timeAnchorEl)} anchorEl={timeAnchorEl} onClose={() => setTimeAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} PaperProps={{ sx: { width: popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: 10 } }}>
        {popoverType === 'quick' ? (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>{t('quickSelect')}</Typography><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><FormControl size="small" sx={{ width: 100 }}><Select value="Last" sx={{ height: 32, fontSize: '0.85rem' }}><MenuItem value="Last">Last</MenuItem></Select></FormControl><TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem' } }} /><FormControl size="small" sx={{ flexGrow: 1 }}><Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)} sx={{ height: 32, fontSize: '0.85rem' }}><MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem></Select></FormControl><Button variant="outlined" size="small" onClick={handleApplyTime} sx={{ height: 32, fontWeight: 'bold', textTransform: 'none' }}>{t('apply')}</Button></Box></Box>
            <MuiDivider sx={{ my: 2 }} />
            <Box><Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>{t('commonlyUsed')}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>{['today', 'last24h', 'thisWeek', 'last7d', 'last15m', 'last30d'].map(key => { const opts: any = { today: { v: 0, u: 'd' }, last24h: { v: 24, u: 'h' }, thisWeek: { v: 7, u: 'd' }, last7d: { v: 7, u: 'd' }, last15m: { v: 15, u: 'm' }, last30d: { v: 30, u: 'd' } }; return <Typography key={key} variant="body2" onClick={() => handleCommonTime(opts[key].v, opts[key].u)} sx={{ color: 'primary.main', fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}>{t(key)}</Typography>; })}</Box></Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', p: 1, textAlign: 'center' }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{editingPoint === 'from' ? t('setStartPoint') : t('setEndPoint')}</Typography></Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth" sx={{ "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold' } }}><Tab label={t('absolute')} /><Tab label={t('relative')} /><Tab label={t('now')} /></Tabs></Box>
            <Box sx={{ p: 2 }}>{tabValue === 0 && (<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}><Box sx={{ display: 'flex', gap: 1 }}><DateCalendar value={popoverDate} onChange={(newValue) => newValue && setPopoverDate(newValue)} sx={{ width: '100%', maxHeight: 280 }} /><Box sx={{ width: 100, borderLeft: '1px solid', borderColor: 'divider', pl: 1, maxHeight: 280, overflowY: 'auto' }}>{timeOptions.map(time => (<Typography key={time} variant="caption" onClick={() => setPopoverTime(time)} sx={{ display: 'block', p: 0.8, cursor: 'pointer', borderRadius: 0.5, textAlign: 'center', bgcolor: popoverTime === time ? 'action.selected' : 'transparent', fontWeight: popoverTime === time ? 'bold' : 'normal' }}>{time}</Typography>))}</Box></Box></LocalizationProvider>)} {tabValue === 1 && (<Box sx={{ display: 'flex', gap: 1, mb: 2 }}><TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 150 }} /><FormControl size="small" sx={{ flexGrow: 1 }}><Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)}><MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem></Select></FormControl></Box>)} {tabValue === 2 && (<Box sx={{ py: 2, textAlign: 'center' }}><Button fullWidth variant="contained" onClick={() => { setTabValue(2); handleApplyTime(); }} sx={{ textTransform: 'none', fontWeight: 'bold' }}>{t('setToNow')}</Button></Box>)}</Box>
            {tabValue !== 2 && (<Box sx={{ p: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{tabValue === 0 ? popoverDate.locale(language).hour(parseInt(popoverTime.split(":")[0])).minute(parseInt(popoverTime.split(":")[1])).format("MMM D, YYYY @ HH:mm:ss") : dayjs().locale(language).format("MMM D, YYYY @ HH:mm:ss")}</Typography><Button size="small" variant="contained" onClick={handleApplyTime} sx={{ fontWeight: 'bold', textTransform: 'none' }}>{t('apply')}</Button></Box>)}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default LogStreamingTab;
