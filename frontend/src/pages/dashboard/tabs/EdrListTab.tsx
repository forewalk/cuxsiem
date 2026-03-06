import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, Paper, Typography, Alert, LinearProgress, 
  List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip,
  Button, TextField, Select, MenuItem, useTheme, Collapse, Checkbox,
  Menu
} from "@mui/material";
import ControlBar from "../components/ControlBar";
import BarChartWidget from "../components/BarChartWidget";
import * as XLSX from "xlsx";
import { getDashboardStats, getIndexFields, getIndexLogs, getColumnSettings, saveColumnSettings, resetColumnSettings } from "../../../services/dashboardService";
import type { DashboardStatsResponse, IndexField } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import useEdrStore from "../../../stores/useEdrStore";
import dayjs from "dayjs";

// 아이콘
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ReorderIcon from "@mui/icons-material/Reorder";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SettingsInputComponentIcon from "@mui/icons-material/SettingsInputComponent";
import NotificationsPausedIcon from "@mui/icons-material/NotificationsPaused";
import DescriptionIcon from "@mui/icons-material/Description";
import PublicIcon from "@mui/icons-material/Public";
import DnsIcon from "@mui/icons-material/Dns";
import LinkIcon from "@mui/icons-material/Link";
import StorageIcon from "@mui/icons-material/Storage";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AbcIcon from "@mui/icons-material/Abc";
import NumbersIcon from "@mui/icons-material/Numbers";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CodeIcon from "@mui/icons-material/Code";
import TagIcon from "@mui/icons-material/Tag";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import KeyboardArrowDownIconMenu from "@mui/icons-material/KeyboardArrowDown";

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const CATEGORY_FIELDS: Record<string, string[]> = {
  all: ["@timestamp", "event.category", "event.type", "agent.computerName", "src.process.name", "src.process.user"],
  process: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "src.process.cmdline", "src.process.user", "src.process.parent.name"],
  cross_process: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "tgt.process.name", "tgt.process.cmdline"],
  indicator: ["@timestamp", "event.type", "agent.computerName", "indicator.category", "indicator.name", "indicator.metadata"],
  file: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "tgt.file.path", "tgt.file.oldPath"],
  network: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "network.sourceIp", "network.destinationIp", "network.destinationPort"],
  dns: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "dns.request", "dns.response"],
  url: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "url.address"],
  registry: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "registry.keyPath", "registry.value"],
  scheduled_task: ["@timestamp", "event.type", "agent.computerName", "src.process.name", "task.name", "task.command"],
  windows_event: ["@timestamp", "event.type", "agent.computerName", "win.event.provider", "win.event.id", "win.event.message"],
};

const EdrListTab: React.FC = () => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { searchQuery, activeCategory, timeRange, setSearchQuery, setActiveCategory, setTimeRange } = useEdrStore();
  const { fromValue, fromUnit, toValue, toUnit, fromDate, toDate } = timeRange;

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const openActionMenu = Boolean(actionAnchorEl);

  const handleActionClick = (event: React.MouseEvent<HTMLButtonElement>) => { setActionAnchorEl(event.currentTarget); };
  const handleActionClose = () => { setActionAnchorEl(null); };

  const categories = useMemo(() => [
    { id: 'all', label: 'All Events', icon: <ReorderIcon sx={{ fontSize: 16 }} /> },
    { id: 'process', label: 'Processes', icon: <AccountTreeIcon sx={{ fontSize: 16 }} /> },
    { id: 'cross_process', label: 'Cross Processes', icon: <SettingsInputComponentIcon sx={{ fontSize: 16 }} /> },
    { id: 'indicator', label: 'Indicators', icon: <NotificationsPausedIcon sx={{ fontSize: 16 }} /> },
    { id: 'file', label: 'Files', icon: <DescriptionIcon sx={{ fontSize: 16 }} /> },
    { id: 'network', label: 'Network Actions', icon: <PublicIcon sx={{ fontSize: 16 }} /> },
    { id: 'dns', label: 'DNS', icon: <DnsIcon sx={{ fontSize: 16 }} /> },
    { id: 'url', label: 'URL', icon: <LinkIcon sx={{ fontSize: 16 }} /> },
    { id: 'registry', label: 'Registry', icon: <StorageIcon sx={{ fontSize: 16 }} /> },
    { id: 'scheduled_task', label: 'Scheduled Tasks', icon: <ScheduleIcon sx={{ fontSize: 16 }} /> },
    { id: 'windows_event', label: 'Windows Event Logs', icon: <ReceiptLongIcon sx={{ fontSize: 16 }} /> },
  ], []);

  const [selectedFieldNames, setSelectedFieldNames] = useState<string[]>(CATEGORY_FIELDS.all);

  const scrollTable = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      const amount = 400;
      tableScrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = 300;
      categoryScrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const applyUrlParamsToStore = () => {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const query = currentSearchParams.get('edrQuery') || "";
      if (searchQuery !== query) setSearchQuery(query);
      const category = currentSearchParams.get('edrCategory') || "all";
      if (activeCategory !== category) setActiveCategory(category);
      const fromVal = currentSearchParams.get('edrFromValue');
      const fromUn = currentSearchParams.get('edrFromUnit');
      const defaultStoreRange = useEdrStore.getState().timeRange;
      const newRange = {
        fromValue: fromVal ? parseInt(fromVal, 10) : defaultStoreRange.fromValue,
        fromUnit: fromUn || defaultStoreRange.fromUnit,
        toValue: currentSearchParams.get('edrToValue') ? parseInt(currentSearchParams.get('edrToValue')!, 10) : null,
        toUnit: currentSearchParams.get('edrToUnit') || 'm',
        fromDate: currentSearchParams.get('edrFromDate'),
        toDate: currentSearchParams.get('edrToDate'),
      };
      if (JSON.stringify(timeRange) !== JSON.stringify(newRange)) setTimeRange(newRange);
    };
    applyUrlParamsToStore();
    window.addEventListener('popstate', applyUrlParamsToStore);
    return () => window.removeEventListener('popstate', applyUrlParamsToStore);
  }, [searchQuery, activeCategory, timeRange, setTimeRange, setSearchQuery, setActiveCategory]);

  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [fields, setFields] = useState<IndexField[]>([]);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(settings?.pagination_size ?? 20);
  const [pageSizeOptions] = useState<number[]>([20, 50, 100, 500]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  const [columnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('edrListColumnWidths');
    return saved ? JSON.parse(saved) : { "@timestamp": 250 };
  });

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // 사용자별 컬럼 설정 초기화
  const handleResetColumns = async () => {
    try {
      const success = await resetColumnSettings("edr");
      if (success) {
        const defaultFields = CATEGORY_FIELDS[activeCategory] || CATEGORY_FIELDS.all;
        setSelectedFieldNames(defaultFields);
      }
    } catch (err) { console.error("Failed to reset columns", err); }
  };

  // 사용자별 컬럼 순서 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await getColumnSettings("edr");
        if (saved && saved.length > 0) setSelectedFieldNames(saved);
      } catch (err) { console.error("Failed to load column settings", err); }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings && !initializedRef.current && !searchParams.get('edrFromValue') && !searchParams.get('edrFromDate')) {
      setTimeRange({ fromValue: settings.time_filter_duration ?? 15, fromUnit: settings.time_filter_unit ?? 'm', toValue: null, toUnit: 'm', fromDate: null, toDate: null });
      initializedRef.current = true;
    }
  }, [settings, setTimeRange, searchParams]);

  useEffect(() => { if (settings?.pagination_size) setPageSize(settings.pagination_size); }, [settings]);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) setSelectedRowIndices(new Set(logs.map((_, idx) => idx)));
    else setSelectedRowIndices(new Set());
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRowIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newOrder = [...selectedFieldNames];
    const movedItem = newOrder.splice(dragIdx, 1)[0];
    newOrder.splice(targetIdx, 0, movedItem);
    setSelectedFieldNames(newOrder);
    setDragIdx(null);
    try { await saveColumnSettings("edr", newOrder); } catch (err) { console.error("Failed to save column settings", err); }
  };

  const getValueByPath = (obj: any, path: string) => {
    if (!obj || !path) return "-";
    if (path === "_source") return JSON.stringify(obj);
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value === null || value === undefined) return "-";
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };

  const formatValue = (val: any) => val === null || val === undefined ? "-" : (typeof val === 'object' ? JSON.stringify(val) : String(val));

  const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
    return Object.keys(obj).reduce((acc: any, k: string) => {
      const pre = prefix.length ? prefix + "." : "";
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else { acc[pre + k] = obj[k]; }
      return acc;
    }, {});
  };

  const filteredFields = useMemo(() => fields.filter(f => f.name.toLowerCase().includes(fieldSearchQuery.toLowerCase())), [fields, fieldSearchQuery]);
  const selectedList = useMemo(() => {
    return selectedFieldNames.map(name => {
      const fieldMeta = fields.find(f => f.name === name);
      return { name, type: fieldMeta?.type || (name === "@timestamp" ? "date" : "text") };
    });
  }, [fields, selectedFieldNames]);
  const availableList = useMemo(() => filteredFields.filter(f => !selectedFieldNames.includes(f.name)), [filteredFields, selectedFieldNames]);

  const handleToggleField = useCallback(async (fieldName: string) => {
    setSelectedFieldNames(prev => {
      const next = prev.includes(fieldName) 
        ? prev.filter(name => name !== fieldName)
        : [...prev, fieldName];
      
      saveColumnSettings("edr", next).catch(err => console.error("Failed to save column settings", err));
      return next;
    });
  }, []);

  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) Object.entries(params).forEach(([pk, v]) => { text = text.replace(`{${pk}}`, v); });
    return text;
  }, [language]);

  const handleTimeChange = (fV: number | null, fU: string, tV: number | null, tU: string, fD: string | null = null, tD: string | null = null) => {
    setTimeRange({ fromValue: fV, fromUnit: fU, toValue: tV, toUnit: tU, fromDate: fD, toDate: tD });
    const newParams = new URLSearchParams(searchParams);
    if (fV !== null) newParams.set('edrFromValue', fV.toString()); else newParams.delete('edrFromValue');
    if (fU) newParams.set('edrFromUnit', fU); else newParams.delete('edrFromUnit');
    if (tV !== null) newParams.set('edrToValue', tV.toString()); else newParams.delete('edrToValue');
    if (tU) newParams.set('edrToUnit', tU); else newParams.delete('edrToUnit');
    if (fD) newParams.set('edrFromDate', fD); else newParams.delete('edrFromDate');
    if (tD) newParams.set('threatToDate', tD); else newParams.delete('threatToDate');
    navigate(`?${newParams.toString()}`, { replace: false });
  };

  const handleSearchQueryChange = (q: string) => {
    setSearchQuery(q);
    const newParams = new URLSearchParams(searchParams);
    if (q) newParams.set('edrQuery', q); else newParams.delete('edrQuery');
    navigate(`?${newParams.toString()}`, { replace: false });
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category !== 'all') newParams.set('edrCategory', category); else newParams.delete('edrCategory');
    navigate(`?${newParams.toString()}`, { replace: false });
  };

  const handleBarClick = (startTime: string, endTime: string) => {
    handleTimeChange(null, "m", null, "m", startTime, endTime);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      let finalFromDate = fromDate, finalToDate = toDate;
      if (!fromDate && fromValue !== null) finalFromDate = dayjs().subtract(fromValue, fromUnit as any).toISOString();
      if (!toDate && toValue !== null) finalToDate = dayjs().subtract(toValue, toUnit as any).toISOString();
      else if (!toDate && !fromDate) finalToDate = dayjs().toISOString();
      
      const baseQuery = searchQuery || undefined;
      let combinedQuery = searchQuery || "";
      if (activeCategory !== 'all') {
        const categoryFilter = `event.category: "${activeCategory}"`;
        combinedQuery = combinedQuery ? `(${combinedQuery}) AND ${categoryFilter}` : categoryFilter;
      }

      const targetIndex = "logs-sentinel_one.edr";
      const [stats, fieldList, logList] = await Promise.all([
        getDashboardStats("edr-dashboard", undefined, undefined, undefined, undefined, finalFromDate ?? undefined, finalToDate ?? undefined, baseQuery),
        getIndexFields(targetIndex),
        getIndexLogs("edr-dashboard", undefined, undefined, undefined, undefined, finalFromDate ?? undefined, finalToDate ?? undefined, combinedQuery || undefined, pageSize, page * pageSize)
      ]);
      
      setData(stats); setLogs(logList);
      setFields([{ name: "_source", type: "code" }, ...fieldList]);
    } catch (err) { setError("Failed to load EDR data."); } finally { setLoading(false); }
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery, activeCategory, page, pageSize, searchParams]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [searchParams]);

  const handleExportExcel = useCallback(() => {
    if (!logs || logs.length === 0) return;
    const excelData = logs.map(log => {
      const row: Record<string, any> = {};
      selectedFieldNames.forEach(fn => { row[fn] = getValueByPath(log, fn); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EDR");
    XLSX.writeFile(wb, `edr_logs_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
  }, [logs, selectedFieldNames]);

  const FieldItem = ({ name, type, selected = false, onAction }: { name: string, type?: string, selected?: boolean, onAction: (name: string) => void }) => {
    const getTypeInfo = (t?: string) => {
      switch (t) {
        case 'keyword': return { label: 'Keyword', icon: <TagIcon sx={{ fontSize: 16, color: 'text.disabled' }} /> };
        case 'date': return { label: 'Date', icon: <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} /> };
        case 'boolean': case 'code': return { label: 'Code', icon: <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} /> };
        default: return { label: 'Text', icon: <AbcIcon sx={{ fontSize: 18, color: 'text.disabled' }} /> };
      }
    };
    const ti = getTypeInfo(type);
    return (
      <Tooltip title={name} placement="right" arrow disableInteractive>
        <ListItem disablePadding sx={{ '&:hover': { bgcolor: 'action.hover' }, '&:hover .field-actions': { display: 'flex' }, px: 1, py: 0.2, cursor: 'pointer', borderRadius: 0.5, mb: 0.2, position: 'relative' }}>
          <Tooltip title={ti.label} placement="left" arrow><ListItemIcon sx={{ minWidth: 28 }}>{ti.icon}</ListItemIcon></Tooltip>
          <ListItemText primary={name} primaryTypographyProps={{ variant: 'caption', sx: { fontSize: '0.75rem', fontWeight: selected ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 4 } }} />
          <Box className="field-actions" sx={{ display: 'none', position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', alignItems: 'center', bgcolor: 'action.hover', pl: 1 }}><IconButton size="small" sx={{ p: 0.2, color: '#005a5e' }} onClick={(e) => { e.stopPropagation(); onAction(name); }}>{selected ? <RemoveCircleIcon sx={{ fontSize: 16 }} /> : <AddCircleIcon sx={{ fontSize: 16 }} />}</IconButton></Box>
        </ListItem>
      </Tooltip>
    );
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data?.summary.total_logs ?? 0 };
    const edrPanel = data?.panels.find(p => p.panel_key === "edr_event_categories");
    if (edrPanel && edrPanel.chart_data) { edrPanel.chart_data.forEach(item => { counts[item.label] = item.value; }); }
    return counts;
  }, [data]);

  const sortedDisplayFields = useMemo(() => [...selectedFieldNames], [selectedFieldNames]);

  return (
    <Box id="edr-list-tab-container" sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      <ControlBar t={t} fromValue={fromValue} fromUnit={fromUnit} toValue={toValue} toUnit={toUnit} fromDate={fromDate} toDate={toDate} onTimeChange={handleTimeChange} searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} onRefresh={fetchData} onReset={handleResetColumns} lastUpdated={data?.last_updated ? dayjs(data.last_updated).add(9, 'hour').format("HH:mm:ss") : undefined} totalLogs={data?.summary.total_logs} onDownload={handleExportExcel} />
      
      {/* 카테고리 메뉴 영역 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', pr: 1 }}>
        <Box ref={categoryScrollRef} sx={{ 
          display: 'flex', alignItems: 'center', gap: 0.5, py: 1.2, px: 2, flexGrow: 1, overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none'
        }}>
          {categories.map((cat) => (
            <Button key={cat.id} onClick={() => handleCategoryChange(cat.id)} startIcon={cat.icon} sx={{ minWidth: 'fit-content', px: 2, py: 0.8, borderRadius: 1, textTransform: 'none', fontSize: '0.8rem', fontWeight: activeCategory === cat.id ? 600 : 400, color: activeCategory === cat.id ? 'primary.main' : 'text.secondary', bgcolor: activeCategory === cat.id ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' }, position: 'relative', '&::after': activeCategory === cat.id ? { content: '""', position: 'absolute', bottom: -4, left: '15%', right: '15%', height: '3px', bgcolor: 'primary.main', borderRadius: '2px 2px 0 0' } : {} }}>
              {cat.label}
              <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', opacity: activeCategory === cat.id ? 1 : 0.7, fontWeight: 'bold', color: activeCategory === cat.id ? 'primary.main' : 'text.secondary' }}>
                {categoryCounts[cat.id] !== undefined ? (categoryCounts[cat.id] >= 1000 ? `${(categoryCounts[cat.id]/1000).toFixed(1)}K` : categoryCounts[cat.id]) : 0}
              </Box>
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <IconButton size="small" onClick={() => scrollCategories('left')} sx={{ border: 1, borderColor: 'divider' }}><ChevronLeftIcon sx={{ fontSize: 16 }} /></IconButton>
          <IconButton size="small" onClick={() => scrollCategories('right')} sx={{ border: 1, borderColor: 'divider' }}><ChevronRightIcon sx={{ fontSize: 16 }} /></IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ m: 1, fontSize: '0.75rem', flexShrink: 0 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', flex: '1 1 0', overflow: 'hidden', gap: { xs: 1, md: 3 }, mt: { xs: 1, md: 2 }, minHeight: 0 }}>
        <Paper elevation={1} sx={{ width: { xs: 0, md: 220 }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', borderRadius: 1.5, bgcolor: 'background.paper', height: '100%', flexShrink: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, flexShrink: 0 }}><TextField fullWidth size="small" variant="outlined" placeholder={t('searchFields')} value={fieldSearchQuery} onChange={(e) => setFieldSearchQuery(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />, sx: { height: 32, fontSize: '0.75rem', bgcolor: 'action.hover' } }} /></Box>
          <Box sx={{ px: 1.5, pt: 0.5, pb: 1, flexShrink: 0 }}><Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>{t('selectedFields')}</Typography></Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, minHeight: 0 }}>
            <List disablePadding sx={{ mb: 2 }}>{selectedList.map((f) => <FieldItem key={f.name} name={f.name} type={f.type} selected onAction={handleToggleField} />)}</List>
            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, px: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>{t('availableFields')}</Typography>
            <List disablePadding sx={{ pb: 4 }}>{availableList.map((f) => <FieldItem key={f.name} name={f.name} type={f.type} onAction={handleToggleField} />)}</List>
          </Box>
        </Paper>
        <Box sx={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5, pr: 0 }}>
            <Paper elevation={1} sx={{ p: { xs: 1, md: 2 }, height: 180, minHeight: 180, width: '100%', borderRadius: 1.5, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}><Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}><BarChartWidget data={data?.histogram || []} onBarClick={handleBarClick} onRangeSelect={handleBarClick} /></Box></Paper>
            <Box sx={{ px: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'text.primary' }}>{t('results')} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>({logs.length}/{data?.summary.total_logs ?? 0})</Box></Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => scrollTable('left')} sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}><ArrowBackIosNewIcon sx={{ fontSize: 14 }} /></IconButton>
                  <IconButton size="small" onClick={() => scrollTable('right')} sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}><ArrowForwardIosIcon sx={{ fontSize: 14 }} /></IconButton>
                </Box>
                <Button size="small" variant="outlined" onClick={handleActionClick} endIcon={<KeyboardArrowDownIconMenu />} sx={{ textTransform: 'none', fontSize: '0.75rem', borderColor: 'divider', color: 'text.primary', bgcolor: 'background.paper' }}>Actions</Button>
                <Menu anchorEl={actionAnchorEl} open={openActionMenu} onClose={handleActionClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { mt: 0.5, minWidth: 180 } }}>
                  <MenuItem onClick={handleActionClose} sx={{ fontSize: '0.8rem' }}>Disconnect from network</MenuItem>
                  <MenuItem onClick={handleActionClose} sx={{ fontSize: '0.8rem' }}>Unquarantine</MenuItem>
                  <MenuItem onClick={handleActionClose} sx={{ fontSize: '0.8rem' }}>Add to blocklist</MenuItem>
                  <MenuItem onClick={handleActionClose} sx={{ fontSize: '0.8rem' }}>Add to exclusions</MenuItem>
                </Menu>
              </Box>
            </Box>
            <Paper elevation={1} ref={tableScrollRef} sx={{ borderRadius: 1.5, bgcolor: 'background.paper', mb: 1, flex: '1 1 0', minHeight: 0, overflowX: 'scroll !important', overflowY: 'auto', display: 'flex', flexDirection: 'column', '&::-webkit-scrollbar': { height: '14px', width: '14px', display: 'block !important' }, '&::-webkit-scrollbar-track': { background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f0f0f0' }, '&::-webkit-scrollbar-thumb': { background: theme.palette.primary.main, borderRadius: '7px' } }}>
              <Box sx={{ width: 'max-content', minWidth: '100%' }}>
                <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1, px: 2, alignItems: 'center' }}>
                  <Box sx={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }}><Checkbox size="small" indeterminate={selectedRowIndices.size > 0 && selectedRowIndices.size < logs.length} checked={logs.length > 0 && selectedRowIndices.size === logs.length} onChange={handleSelectAll} sx={{ p: 0 }} /></Box>
                  <Box sx={{ width: 32, flexShrink: 0 }} />
                  {sortedDisplayFields.map((fn, idx) => (
                    <Box key={fn} sx={{ width: 250, minWidth: 250, flexShrink: 0, display: 'flex', alignItems: 'center', borderRight: 1, borderColor: 'transparent' }}>
                      <Typography variant="caption" draggable onDragStart={() => handleDragStart(idx)} onDragOver={handleDragOver} onDrop={() => handleDrop(idx)} sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: '0.75rem', px: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'grab' }}>{fn.includes('.') ? fn.split('.').pop() : fn}</Typography>
                    </Box>
                  ))}
                </Box>
                {logs.length > 0 ? logs.map((log, idx) => {
                  const isExpanded = expandedRows.has(idx);
                  const isSelected = selectedRowIndices.has(idx);
                  return (
                    <Box key={idx} sx={{ borderBottom: idx < logs.length - 1 ? 1 : 0, borderColor: 'divider', bgcolor: isSelected ? 'action.selected' : 'transparent' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }} onClick={() => toggleRow(idx)}>
                        <Box sx={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}><Checkbox size="small" checked={isSelected} onChange={() => handleSelectRow(idx)} sx={{ p: 0 }} /></Box>
                        <IconButton size="small" sx={{ p: 0, mr: 1, flexShrink: 0 }}>{isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}</IconButton>
                        {sortedDisplayFields.map(fn => (<Typography key={fn} variant="caption" sx={{ width: 250, minWidth: 250, flexShrink: 0, fontSize: '0.75rem', px: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fn === "@timestamp" ? dayjs(log[fn]).format("MMM D, YYYY @ HH:mm:ss.SSS") : getValueByPath(log, fn)}</Typography>))}
                      </Box>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderBottom: 1, borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 'max-content' }}>
                            {(() => {
                              const fl = flattenObject(log);
                              const sk = Object.keys(fl).sort((a, b) => a === "@timestamp" ? -1 : (b === "@timestamp" ? 1 : a.localeCompare(b)));
                              return sk.map((k, i, arr) => (
                                <Box key={k} sx={{ display: 'flex', borderBottom: i < arr.length - 1 ? '1px solid' : 'none', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' }, alignItems: 'stretch' }}>
                                  <Box sx={{ width: 250, p: 1, pl: 8, flexShrink: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderRight: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ fontWeight: k === "@timestamp" ? 'bold' : 500, color: k === "@timestamp" ? 'primary.main' : 'text.secondary', wordBreak: 'break-all', lineHeight: 1.2 }}>{k.includes('.') ? k.split('.').pop() : k}</Typography>
                                  </Box>
                                  <Box sx={{ p: 1, flexGrow: 1, pl: 2, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', color: 'text.primary', display: 'block', lineHeight: 1.6, fontWeight: k === "@timestamp" ? 'bold' : 'normal' }}>{fl[k] !== undefined ? String(fl[k]) : "-"}</Typography>
                                  </Box>
                                </Box>
                              ));
                            })()}
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                }) : !loading && (<Box sx={{ width: '100%', py: 10, textAlign: 'center' }}><Typography variant="body2" color="text.disabled">{t('noResults')}</Typography></Box>)}
              </Box>
            </Paper>
          </Box>
          <Paper elevation={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0, borderRadius: '8px 8px 0 0', zIndex: 10 }}>
            <Box sx={{ width: 250 }}><Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{t('showingInfo', { from: (page * pageSize + 1).toLocaleString(), to: Math.min((page + 1) * pageSize, data?.summary.total_logs ?? 0).toLocaleString(), total: (data?.summary.total_logs ?? 0).toLocaleString() })}</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton size="small" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} sx={{ border: 1, borderColor: 'divider' }}><ChevronLeftIcon fontSize="small" /></IconButton>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(() => {
                  const tl = data?.summary.total_logs ?? 0; const tp = Math.ceil(tl / pageSize); const mb = 5;
                  let sp = Math.max(0, page - 2); let ep = Math.min(tp - 1, sp + 4);
                  if (ep - sp + 1 < 5) sp = Math.max(0, ep - 4);
                  const btns = [];
                  for (let i = sp; i <= ep; i++) {
                    btns.push(<Button key={i} size="small" onClick={() => setPage(i)} disabled={loading} sx={{ minWidth: 28, height: 32, p: 0, fontSize: '0.85rem', fontWeight: i === page ? 'bold' : 'normal', bgcolor: 'transparent', color: i === page ? 'primary.main' : 'text.secondary', border: 'none', borderRadius: 0, borderBottom: i === page ? 2 : 0, borderColor: 'primary.main', '&:hover': { bgcolor: 'action.hover' }, mx: 0.25 }}>{i + 1}</Button>);
                  }
                  return btns;
                })()}
              </Box>
              <IconButton size="small" disabled={((page + 1) * pageSize >= (data?.summary.total_logs ?? 0)) || loading} onClick={() => setPage(p => p + 1)} sx={{ border: 1, borderColor: 'divider' }}><ChevronRightIcon fontSize="small" /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 250, justifyContent: 'flex-end', mr: 1 }}><Typography variant="caption" color="text.secondary">{t('rowsPerPage')}</Typography><Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} size="small" variant="standard" sx={{ fontSize: '0.75rem', '&:before, &:after': { border: 'none' }, '& .MuiSelect-select': { py: 0.5 } }}>{pageSizeOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}</Select></Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default EdrListTab;
