import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { 
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
  Search as SearchIcon,
  FilterList as FilterIcon,
  AddCircleOutline as AddFilterIcon,
  Settings as SettingsIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import { 
  Box, Typography, Paper, Stack, Button, IconButton, Tooltip, 
  Divider, LinearProgress, CircularProgress, Chip, TextField,
  InputAdornment, Table, TableBody, TableCell, TableRow, TableContainer,
  Popover, Tabs, Tab, MenuItem, Select, FormControl, Divider as MuiDivider,
  Checkbox, List, ListItem, ListItemIcon, ListItemText, ListSubheader
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
 * 로그 스트리밍 전용 컨트롤바
 */
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
}

const LogStreamControlBar = React.memo(({ t, keyword, onKeywordChange, filters, onFiltersChange, indexOptions, selectedIndex, onIndexChange, onRefresh }: LogStreamControlBarProps) => {
  const [indexAnchorEl, setIndexAnchorEl] = useState<HTMLDivElement | null>(null);
  const KIBANA_TEAL = "#005a5e";

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onRefresh(); // 엔터 시 즉시 검색 실행
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2, width: '100%' }}>
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5, width: '100%' }}>
        <Box onClick={(e) => setIndexAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, gap: 1, minHeight: 36, cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}>
          <StorageIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} /><Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{selectedIndex === '*' ? t('allLogs') : selectedIndex}</Typography><ArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, flexGrow: 1, overflow: 'hidden', minHeight: 36 }}>
          <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}><SearchIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} /></Box>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <TextField 
              fullWidth size="small" variant="standard" 
              placeholder={t('searchPlaceholder')} 
              value={keyword} 
              onChange={(e) => onKeywordChange(e.target.value)} 
              sx={{ "& .MuiInput-underline:before, & .MuiInput-underline:after": { border: 'none' }, "& .MuiInputBase-input": { py: 0.5, px: 0.5, fontSize: '0.85rem' } }} 
            />
          </Box>
          {keyword && (
            <IconButton size="small" onClick={() => onKeywordChange("")} sx={{ p: 0.5, mr: 0.5 }}>
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
      <Popover open={Boolean(indexAnchorEl)} anchorEl={indexAnchorEl} onClose={() => setIndexAnchorEl(null)} PaperProps={{ sx: { width: 300, mt: 1, maxHeight: 400 } }}>
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}><TextField fullWidth size="small" placeholder={t('search')} onChange={(e) => { const val = e.target.value.toLowerCase(); document.querySelectorAll('.index-menu-item').forEach((item: any) => { item.style.display = item.innerText.toLowerCase().includes(val) ? 'flex' : 'none'; }); }} /></Box>
        <Box sx={{ overflowY: 'auto', py: 0.5 }}>{indexOptions.map((index: string) => (<MenuItem key={index} className="index-menu-item" onClick={() => { onIndexChange(index); setIndexAnchorEl(null); }} selected={selectedIndex === index} sx={{ fontSize: '0.85rem', py: 1 }}>{index === '*' ? t('allLogs') : index}</MenuItem>))}</Box>
      </Popover>
    </Box>
  );
});

/**
 * 시간 설정 Popover
 */
interface TimeSettingData {
  editingPoint: 'from' | 'to';
  tabValue: number;
  val: number;
  unit: string;
  date: Dayjs;
  time: string;
  popoverType?: 'quick' | 'detailed';
  popoverVal?: number;
  popoverUnit?: string;
  popoverDate?: Dayjs;
  popoverTime?: string;
}

interface TimeSettingPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onApply: (data: TimeSettingData) => void;
  onCommon: (v: number, u: string) => void;
  initialData: TimeSettingData | null;
  t: (key: string, params?: Record<string, string>) => string;
  language: string;
}

const TimeSettingPopover = React.memo(({ open, anchorEl, onClose, onApply, onCommon, initialData, t, language }: TimeSettingPopoverProps) => {
  const [localTab, setLocalTab] = useState(1);
  const [localEditingPoint, setLocalEditingPoint] = useState<'from' | 'to'>('from');
  const [localVal, setLocalVal] = useState(15);
  const [localUnit, setLocalUnit] = useState("m");
  const [localDate, setLocalDate] = useState<Dayjs>(dayjs().second(0).millisecond(0));
  const [localTime, setLocalTime] = useState("12:00:00");

  useEffect(() => {
    if (open && initialData) {
      setLocalEditingPoint(initialData.editingPoint);
      setLocalTab(initialData.tabValue);
      setLocalVal(initialData.popoverVal ?? initialData.val);
      setLocalUnit(initialData.popoverUnit ?? initialData.unit);
      setLocalDate(initialData.popoverDate ?? initialData.date);
      setLocalTime(initialData.popoverTime ?? initialData.time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApply = () => { onApply({ editingPoint: localEditingPoint, tabValue: localTab, val: localVal, unit: localUnit, date: localDate, time: localTime }); };
  const timeOptions = useMemo(() => { const ts = []; for (let h = 0; h < 24; h++) { for (let m = 0; m < 60; m += 30) { ts.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`); } } return ts; }, []);
  const formatDisplayTime = () => { if (localTab === 0) { const [h, m, s] = localTime.split(":").map(Number); return localDate.locale(language).hour(h || 0).minute(m || 0).second(s || 0).format("MMM D, YYYY @ HH:mm:ss"); } return dayjs().locale(language).format("MMM D, YYYY @ HH:mm:ss"); };

  return (
    <Popover open={open} anchorEl={anchorEl} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} PaperProps={{ sx: { width: initialData?.popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: 10 } }}>
      {initialData?.popoverType === 'quick' ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>{t('quickSelect')}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><FormControl size="small" sx={{ width: 100 }}><Select value="Last" sx={{ height: 32, fontSize: '0.85rem' }}><MenuItem value="Last">Last</MenuItem></Select></FormControl><TextField size="small" type="number" value={localVal} onChange={(e) => setLocalVal(Number(e.target.value))} sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem' } }} /><FormControl size="small" sx={{ flexGrow: 1 }}><Select value={localUnit} onChange={(e) => setLocalUnit(e.target.value)} sx={{ height: 32, fontSize: '0.85rem' }}><MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem></Select></FormControl><Button variant="outlined" size="small" onClick={handleApply} sx={{ height: 32, fontWeight: 'bold', textTransform: 'none' }}>{t('apply')}</Button></Box>
          <MuiDivider sx={{ my: 2 }} /><Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>{t('commonlyUsed')}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>{['today', 'last24h', 'thisWeek', 'last7d', 'last15m', 'last30d'].map(key => { const opts: Record<string, {v: number, u: string}> = { today: { v: 0, u: 'd' }, last24h: { v: 24, u: 'h' }, thisWeek: { v: 7, u: 'd' }, last7d: { v: 7, u: 'd' }, last15m: { v: 15, u: 'm' }, last30d: { v: 30, u: 'd' } }; return <Typography key={key} variant="body2" onClick={() => onCommon(opts[key].v, opts[key].u)} sx={{ color: 'primary.main', fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}>{t(key)}</Typography>; })}</Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', p: 1, textAlign: 'center' }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{localEditingPoint === 'from' ? t('setStartPoint') : t('setEndPoint')}</Typography></Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={localTab} onChange={(_, v) => setLocalTab(v)} variant="fullWidth" sx={{ "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold' } }}><Tab label={t('absolute')} /><Tab label={t('relative')} /><Tab label={t('now')} /></Tabs></Box>
          <Box sx={{ p: 2 }}>{localTab === 0 && (<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}><Box sx={{ display: 'flex', gap: 1 }}><DateCalendar value={localDate} onChange={(nv) => nv && setLocalDate(nv.second(0).millisecond(0))} sx={{ width: '100%', maxHeight: 280 }} /><Box sx={{ width: 110, borderLeft: '1px solid', borderColor: 'divider', pl: 1, maxHeight: 280, overflowY: 'auto' }}>{timeOptions.map(time => (<Typography key={time} variant="caption" onClick={() => setLocalTime(time)} sx={{ display: 'block', p: 0.8, cursor: 'pointer', borderRadius: 0.5, textAlign: 'center', bgcolor: localTime === time ? 'action.selected' : 'transparent', fontWeight: localTime === time ? 'bold' : 'normal', fontSize: '0.7rem' }}>{time}</Typography>))}</Box></Box></LocalizationProvider>)} {localTab === 1 && (<Box sx={{ display: 'flex', gap: 1, mb: 2 }}><TextField size="small" type="number" value={localVal} onChange={(e) => setLocalVal(Number(e.target.value))} sx={{ width: 150 }} /><FormControl size="small" sx={{ flexGrow: 1 }}><Select value={localUnit} onChange={(e) => setLocalUnit(e.target.value)}><MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem></Select></FormControl></Box>)} {localTab === 2 && (<Box sx={{ py: 2, textAlign: 'center' }}><Button fullWidth variant="contained" onClick={() => { setLocalTab(2); handleApply(); }} sx={{ textTransform: 'none', fontWeight: 'bold' }}>{t('setToNow')}</Button></Box>)}</Box>
          {localTab !== 2 && (<Box sx={{ p: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{formatDisplayTime()}</Typography><Button size="small" variant="contained" onClick={handleApply} sx={{ fontWeight: 'bold', textTransform: 'none' }}>{t('apply')}</Button></Box>)}
        </Box>
      )}
    </Popover>
  );
});

// 로그 상세 정보 패널
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

  const startResizingBound = useCallback(() => startResizing(), [startResizing]);

  const flatD = useMemo(() => { const c = { _id: log._id, _index: log._index, timestamp: log.timestamp, ...(log._source || {}) }; const f = flattenObject(c); return Object.entries(f).map(([k, v]) => ({ k, v: typeof v === 'object' ? JSON.stringify(v) : String(v) })).sort((a, b) => a.k.localeCompare(b.k)); }, [log]);
  const filteredD = useMemo(() => { if (!deferredSearch) return flatD; const s = deferredSearch.toLowerCase(); return flatD.filter(i => i.k.toLowerCase().includes(s) || i.v.toLowerCase().includes(s)); }, [flatD, deferredSearch]);

  return (
    <Box id="log-detail-panel" sx={{ width: { xs: '100%', md: '45%' }, ml: 1, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mt: 1, overflow: 'hidden', opacity: search !== deferredSearch ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}><DetailIcon fontSize="small" color="primary" />{t('logDetails')}</Typography><IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton></Box>
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}><TextField fullWidth size="small" autoFocus placeholder={t('searchFields')} value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><DetailIcon fontSize="small" color="action" /></InputAdornment>), sx: { fontSize: '0.8rem' } }} /></Box>
      <TableContainer sx={{ flexGrow: 1, overflow: 'auto', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', position: 'relative' }}><Box onMouseDown={startResizingBound} sx={{ position: 'absolute', left: fieldWidth, top: 0, bottom: 0, width: '6px', marginLeft: '-3px', cursor: 'col-resize', zIndex: 10, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'primary.main', opacity: 0.5 }, '&:active': { bgcolor: 'primary.main', opacity: 0.8, width: '2px', marginLeft: '-1px' } }} /><Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}><TableBody>{filteredD.map((i) => (
        <TableRow key={i.k} hover sx={{ '&:hover .add-filter-btn': { opacity: 1 } }}>
          <TableCell sx={{ width: fieldWidth, fontWeight: 'bold', fontSize: '0.75rem', color: 'primary.main', fontFamily: 'monospace', verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider', py: 1, position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        </TableRow>))}{filteredD.length === 0 && (<TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.disabled', fontStyle: 'italic' }}>{t('noResults')}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
    </Box>
  );
});

/**
 * 필드 선택기 Popover
 */
interface FieldSelectorPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  availableFields: string[];
  visibleFields: string[];
  onToggleField: (field: string) => void;
  onReset: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const FieldSelectorPopover = React.memo(({ open, anchorEl, onClose, availableFields, visibleFields, onToggleField, onReset, t }: FieldSelectorPopoverProps) => {
  const [search, setSearch] = useState("");
  const filteredFields = useMemo(() => {
    if (!search) return availableFields;
    return availableFields.filter((f: string) => f.toLowerCase().includes(search.toLowerCase()));
  }, [availableFields, search]);

  const sortedFields = useMemo(() => {
    return [...filteredFields].sort((a: string, b: string) => {
      const aVisible = visibleFields.includes(a);
      const bVisible = visibleFields.includes(b);
      if (aVisible && !bVisible) return -1;
      if (!aVisible && bVisible) return 1;
      return a.localeCompare(b);
    });
  }, [filteredFields, visibleFields]);

  return (
    <Popover open={open} anchorEl={anchorEl} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 320, maxHeight: 480, mt: 1, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{t('selectFields')}</Typography>
          <Button size="small" variant="text" startIcon={<ResetIcon />} onClick={onReset} sx={{ fontSize: '0.7rem' }}>{t('resetFields')}</Button>
        </Box>
        <TextField fullWidth size="small" placeholder={t('searchFields')} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ "& .MuiInputBase-input": { fontSize: '0.8rem' } }} />
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0.5 }}>
        <List size="small" subheader={<ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '32px', fontSize: '0.7rem' }}>{search ? t('searchResults') : t('availableFields')}</ListSubheader>}>
          {sortedFields.map((field: string) => {
            const isVisible = visibleFields.includes(field);
            const isRequired = field === 'timestamp';
            return (
              <ListItem key={field} dense button onClick={() => !isRequired && onToggleField(field)} disabled={isRequired} sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}><Checkbox size="small" edge="start" checked={isVisible} disableRipple disabled={isRequired} /></ListItemIcon>
                <ListItemText primary={field} primaryTypographyProps={{ fontSize: '0.8rem', fontFamily: 'monospace', sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Popover>
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
  
  // 검색어(Input)와 필터(Chips) 분리
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<string[]>([]);

  // 사용 가능한 모든 필드 추출
  const availableFields = useMemo(() => {
    const fieldSet = new Set<string>(['timestamp', '_index', 'message']);
    logs.slice(0, 100).forEach(log => {
      if (log._source) {
        const flat = flattenObject(log._source);
        Object.keys(flat).forEach(k => fieldSet.add(k));
      }
    });
    return Array.from(fieldSet).sort();
  }, [logs]);

  // 백엔드에서 이미 검색 결과가 오므로 클라이언트 측 중복 필터링은 제거하고 정렬이나 형식만 보장
  const filteredLogs = useMemo(() => {
    return logs; // 백엔드 검색 결과(logs)를 그대로 사용
  }, [logs]);

  // 현재 보고 있는 로그의 날짜 (헤더용)
  const currentLogDate = useMemo(() => {
    if (filteredLogs.length === 0) return dayjs().format('YYYY-MM-DD');
    return dayjs(filteredLogs[0].timestamp).format('YYYY-MM-DD');
  }, [filteredLogs]);

  const [visibleFields, setVisibleFields] = useState<string[]>(['timestamp', '_index', 'message']);
  const [fieldAnchorEl, setFieldAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverInfo, setPopoverInfo] = useState<TimeSettingData | null>(null);

  const handleToggleField = (field: string) => {
    setVisibleFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const handleResetFields = () => {
    setVisibleFields(['timestamp', '_index', 'message']);
  };

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const newFilter = `${field}: "${value}"`;
    setFilters(prev => {
      if (prev.includes(newFilter)) return prev;
      return [...prev, newFilter];
    });
  }, []);

  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const { language } = useLanguageStore();
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  const t = useMemo(() => (key: string, params?: Record<string, string>): string => { const ct = translations[language] || translations["ko"] || {}; let text = ct[key] || key; if (params) Object.entries(params).forEach(([pk, v]) => { text = text.replace(`{${pk}}`, v); }); return text; }, [language, translations]);

  useEffect(() => {
    const fetchI = async () => { try { const r = await logService.getIndices(); const i = r.indices.includes('*') ? r.indices : ['*', ...r.indices]; setIndexOptions(i); if (i.length > 0 && !i.includes(selectedIndex)) setSelectedIndex('*'); } catch (e) { setIndexOptions(['*']); } };
    if (isActive) fetchI();
  }, [isActive, selectedIndex]);

  const fetchLogs = useCallback(async (isManual = false) => {
    if ((!isActive || isPaused) && !isManual) return;
    try {
      if (isManual) setLoading(true);
      let ft: string | undefined = undefined, tt: string | undefined = undefined;
      if (isPaused) {
        if (fromDate) ft = fromDate; else if (fromValue !== null) ft = `now-${fromValue}${fromUnit}`;
        if (toDate) tt = toDate; else if (toValue !== null) tt = `now-${toValue}${toUnit}`;
      } else { if (!lastTimestampRef.current) ft = "now-15m"; }
      
      // 검색어와 필터를 AND로 결합
      const combinedQuery = [keyword, ...filters].filter(Boolean).map(q => `(${q})`).join(" AND ");
      const r = await logService.getLogStream(lastTimestampRef.current, MAX_LOGS, combinedQuery, selectedIndex, ft, tt);
      if (r.logs.length > 0) {
        setLogs(prev => {
          if (!lastTimestampRef.current) return r.logs.slice(-MAX_LOGS);
          const nl = r.logs.filter(n => !prev.some(p => p._id === n._id));
          if (nl.length === 0) return prev;
          return [...prev, ...nl].slice(-MAX_LOGS);
        });
        lastTimestampRef.current = r.last_timestamp;
      }
    } catch (e) { console.error(e); } finally { if (isManual) setLoading(true); setLoading(false); }
  }, [isActive, isPaused, keyword, filters, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit]);

  useEffect(() => { if (isActive) { setLogs([]); lastTimestampRef.current = null; fetchLogs(true); } }, [keyword, filters, selectedIndex, fromDate, toDate, fromValue, fromUnit, toValue, toUnit, isActive, fetchLogs]);
  useEffect(() => { const timer = setInterval(() => fetchLogs(), POLL_INTERVAL); return () => clearInterval(timer); }, [fetchLogs]);
  useEffect(() => { if (autoScroll && scrollRef.current && isActive) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs, autoScroll, isActive]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => { const t = e.currentTarget; const b = t.scrollHeight - t.scrollTop <= t.clientHeight + 50; if (!b && autoScroll) setAutoScroll(false); else if (b && !autoScroll) setAutoScroll(true); };
  const scrollToBottom = () => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; setAutoScroll(true); } };
  const togglePaused = () => { const np = !isPaused; setIsPaused(np); if (!np) { setFromValue(15); setFromUnit("m"); setFromDate(null); setToValue(null); setToUnit("m"); setToDate(null); setTimeout(scrollToBottom, 50); } };
  const formatP = (v: number | null, u: string, d: string | null, isTo: boolean) => { if (isTo && v === null && d === null) return t('now'); if (d) return dayjs(d).locale(language).format("MMM D, YYYY @ HH:mm:ss"); const ut: any = { 'm': t('minutesAgo'), 'h': t('hoursAgo'), 'd': t('daysAgo') }; return `~ ${v} ${ut[u]}`; };
  
  const openTimeP = (type: 'quick' | 'detailed', point: 'from' | 'to', e: React.MouseEvent<HTMLDivElement>) => { 
    if (!isPaused) return; 
    const cv = point === 'from' ? (fromDate || undefined) : (toDate || undefined); 
    const d = dayjs(cv).second(0).millisecond(0); 
    setPopoverInfo({ 
      popoverType: type, 
      editingPoint: point, 
      tabValue: (point === 'from' ? (fromDate ? 0 : 1) : (toDate ? 0 : (toValue !== null ? 1 : 2))), 
      popoverVal: (point === 'from' ? fromValue || 15 : toValue || 15), 
      popoverUnit: (point === 'from' ? fromUnit : toUnit), 
      popoverDate: d, 
      popoverTime: d.format("HH:mm:ss"),
      val: (point === 'from' ? fromValue || 15 : toValue || 15),
      unit: (point === 'from' ? fromUnit : toUnit),
      date: d,
      time: d.format("HH:mm:ss")
    }); 
    setTimeAnchorEl(e.currentTarget.parentElement as HTMLDivElement); 
  };

  const handleApplyT = (d: TimeSettingData) => { const [h, m, s] = d.time.split(":").map(Number); const iso = d.date.hour(h || 0).minute(m || 0).second(s || 0).millisecond(0).toISOString(); if (d.editingPoint === 'from') { if (d.tabValue === 0) { setFromDate(iso); setFromValue(null); } else if (d.tabValue === 1) { setFromValue(d.val); setFromUnit(d.unit); setFromDate(null); } else { setFromDate(dayjs().second(0).millisecond(0).toISOString()); setFromValue(null); } } else { if (d.tabValue === 0) { setToDate(iso); setToValue(null); } else if (d.tabValue === 1) { setToValue(d.val); setToUnit(d.unit); setToDate(null); } else { setToDate(null); setToValue(null); } } setTimeAnchorEl(null); };
  const handleCommonT = (v: number, u: string) => { if (v === 0 && u === 'd') { setFromDate(dayjs().startOf('day').toISOString()); setFromValue(null); } else { setFromValue(v); setFromUnit(u); setFromDate(null); } setToValue(null); setToUnit("m"); setToDate(null); setTimeAnchorEl(null); };
  const renderFV = (l: LogEntry, f: string) => { if (f === 'timestamp') return dayjs(l.timestamp).format('HH:mm:ss.SSS'); if (f === '_index') return l._index; if (f === 'message') return l.message; const s = (l as any)._source || {}; const v = f.split('.').reduce((o, k) => o?.[k], s); return v !== undefined ? String(v) : '-'; };

  const hasSearchOrFilter = keyword || filters.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', p: 3, gap: 1 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <LogStreamControlBar 
        t={t} 
        keyword={keyword} 
        onKeywordChange={setKeyword}
        filters={filters}
        onFiltersChange={setFilters}
        indexOptions={indexOptions} 
        selectedIndex={selectedIndex} 
        onIndexChange={setSelectedIndex} 
        onRefresh={() => fetchLogs(true)}
      />
      <Paper elevation={1} sx={{ p: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('logStreaming')}</Typography>
            <Chip 
              icon={hasSearchOrFilter ? <FilterIcon sx={{ fontSize: '0.8rem !important' }} /> : undefined}
              label={`${filteredLogs.length}${hasSearchOrFilter ? ` / ${logs.length}` : ''} logs`} 
              size="small" variant={hasSearchOrFilter ? "filled" : "outlined"} color={hasSearchOrFilter ? "primary" : "default"}
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
            />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', borderColor: timeAnchorEl ? 'primary.main' : 'divider', borderRadius: 1, overflow: 'hidden', height: 32, opacity: isPaused ? 1 : 0.6, pointerEvents: isPaused ? 'auto' : 'none', transition: 'all 0.2s' }}>
              <Box onClick={(e) => openTimeP('quick', 'from', e)} sx={{ px: 0.75, borderRight: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><CalendarIcon sx={{ color: 'primary.main', fontSize: 18 }} /><ArrowDownIcon sx={{ color: 'primary.main', fontSize: 14 }} /></Box>
              <Box onClick={(e) => openTimeP('detailed', 'from', e)} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>{formatP(fromValue, fromUnit, fromDate, false)}</Typography></Box>
              <ArrowForwardIcon sx={{ fontSize: 10, color: 'text.disabled' }} /><Box onClick={(e) => openTimeP('detailed', 'to', e)} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}><Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>{formatP(toValue, toUnit, toDate, true)}</Typography></Box>
            </Box>
            <Tooltip title={t('selectFields')}>
              <Button 
                variant="outlined" size="small" startIcon={<SettingsIcon />} 
                onClick={(e) => setFieldAnchorEl(e.currentTarget)}
                sx={{ height: 32, textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
              >
                {t('field')}
              </Button>
            </Tooltip>
            <Tooltip title={t('clearLogs')}><IconButton size="small" onClick={() => { setLogs([]); lastTimestampRef.current = null; }}><ClearIcon /></IconButton></Tooltip>
            <Button variant="contained" size="small" startIcon={isPaused ? <PlayArrowIcon /> : <StopIcon />} onClick={togglePaused} color={isPaused ? 'error' : 'success'} sx={{ textTransform: 'none', borderRadius: 1.5, minWidth: 110, height: 32, fontWeight: 'bold', boxShadow: (theme) => isPaused ? 'none' : `0 0 8px ${theme.palette.success.main}44` }}>{isPaused ? t('paused') : t('streaming')}</Button>
          </Stack>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
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
            <Box ref={scrollRef} onScroll={handleScroll} sx={{ flexGrow: 1, bgcolor: 'action.hover', borderRadius: '0 0 4px 4px', p: 1.5, overflowY: 'auto', overflowX: 'hidden', border: '1px solid', borderColor: 'divider', borderTop: 'none', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' } }}>
              {filteredLogs.length === 0 ? (<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, color: 'text.disabled' }}>{loading ? <CircularProgress size={24} /> : <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('noResults')}</Typography>}</Box>) : (
                filteredLogs.map((l) => (
                  <Box key={l._id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'baseline', gap: 1, width: '100%', bgcolor: selectedLog?._id === l._id ? 'action.selected' : 'transparent', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'action.selected' } }}>
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
                          {renderFV(l, f)}
                        </Typography>
                      );
                    })}
                    <Box sx={{ flexShrink: 0, ml: 'auto', display: 'flex', alignItems: 'center' }}><Tooltip title="View Detail"><IconButton size="small" onClick={() => setSelectedLog(selectedLog?._id === l._id ? null : l)} color={selectedLog?._id === l._id ? "primary" : "default"}><DetailIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip></Box>
                  </Box>
                ))
              )}
            </Box>
            {!autoScroll && filteredLogs.length > 0 && (<Button variant="contained" size="small" startIcon={<AutoScrollIcon />} onClick={scrollToBottom} sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', borderRadius: 5, textTransform: 'none', bgcolor: 'primary.main', color: 'white', boxShadow: 3, '&:hover': { bgcolor: 'primary.dark' } }}>Go to Bottom</Button>)}
          </Box>
          {selectedLog && <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} onFilterAdd={handleFilterAdd} t={t} />}
        </Stack>
      </Paper>
      <TimeSettingPopover open={Boolean(timeAnchorEl)} anchorEl={timeAnchorEl} onClose={() => setTimeAnchorEl(null)} onApply={handleApplyT} onCommon={handleCommonT} initialData={popoverInfo} t={t} language={language} />
      <FieldSelectorPopover open={Boolean(fieldAnchorEl)} anchorEl={fieldAnchorEl} onClose={() => setFieldAnchorEl(null)} availableFields={availableFields} visibleFields={visibleFields} onToggleField={handleToggleField} onReset={handleResetFields} t={t} />
    </Box>
  );
};

export default LogStreamingTab;
