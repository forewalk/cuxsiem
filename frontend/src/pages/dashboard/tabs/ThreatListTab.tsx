import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Box, Paper, Typography, Alert, LinearProgress, Divider, 
  List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip,
  Button, TextField, Select, MenuItem, useTheme, Collapse
} from "@mui/material";
import ControlBar from "../components/ControlBar";
import BarChartWidget from "../components/BarChartWidget";
import { getDashboardStats, getIndexFields, getDashboardIndices, getIndexLogs } from "../../../services/dashboardService";
import type { DashboardStatsResponse, IndexField } from "../../../services/dashboardService";
import { useLanguageStore } from "../../../stores/useLanguageStore";
import dayjs from "dayjs";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AbcIcon from "@mui/icons-material/Abc";
import NumbersIcon from "@mui/icons-material/Numbers";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CodeIcon from "@mui/icons-material/Code";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const ThreatListTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const theme = useTheme();

  // URL 파라미터에서 초기값 읽기
  const fromValue = searchParams.get("from_value") ? Number(searchParams.get("from_value")) : 15;
  const fromUnit = searchParams.get("from_unit") || "m";
  const toValue = searchParams.get("to_value") ? Number(searchParams.get("to_value")) : null;
  const toUnit = searchParams.get("to_unit") || "m";
  const fromDate = searchParams.get("from_date");
  const toDate = searchParams.get("to_date");
  const searchQuery = searchParams.get("q") || "";

  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [fields, setFields] = useState<IndexField[]>([]);
  const [selectedFieldNames, setSelectedFieldNames] = useState<string[]>([
    "agentRealtimeInfo.agentComputerName",
    "threatInfo.analystVerdict",
    "threatInfo.classification",
    "threatInfo.confidenceLevel",
    "threatInfo.fileExtension",
    "threatInfo.filePath",
    "threatInfo.incidentStatus",
    "threatInfo.mitigationStatus",
    "threatInfo.processUser",
    "threatInfo.threatName",
    "threatInfo.createdAt"
  ]);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 드롭 허용
  };

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    
    const newOrder = [...selectedFieldNames];
    const movedItem = newOrder.splice(dragIdx, 1)[0];
    newOrder.splice(targetIdx, 0, movedItem);
    
    setSelectedFieldNames(newOrder);
    setDragIdx(null);
  };

  // 헬퍼: 중첩된 객체에서 필드명으로 값 추출
  const getValueByPath = (obj: any, path: string) => {
    if (!obj || !path) return "-";
    if (path === "_source") return JSON.stringify(obj);
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value === null || value === undefined) return "-";
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  // 필드 목록 분리 (선택됨 vs 사용 가능)
  const filteredFields = useMemo(() => 
    fields.filter(f => f.name.toLowerCase().includes(fieldSearchQuery.toLowerCase())),
    [fields, fieldSearchQuery]
  );

  const selectedList = useMemo(() => 
    fields.filter(f => selectedFieldNames.includes(f.name)),
    [fields, selectedFieldNames]
  );
  
  const availableList = useMemo(() => 
    filteredFields.filter(f => !selectedFieldNames.includes(f.name)),
    [filteredFields, selectedFieldNames]
  );

  const handleToggleField = useCallback((fieldName: string) => {
    setSelectedFieldNames(prev => 
      prev.includes(fieldName) 
        ? prev.filter(name => name !== fieldName)
        : [...prev, fieldName]
    );
  }, []);

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages,
  };

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

  const handleTimeChange = (fVal: number | null, fUnit: string, tVal: number | null, tUnit: string, fDate: string | null = null, tDate: string | null = null) => {
    const newParams = new URLSearchParams(searchParams);
    if (fVal !== null) newParams.set("from_value", fVal.toString()); else newParams.delete("from_value");
    newParams.set("from_unit", fUnit);
    if (tVal !== null) newParams.set("to_value", tVal.toString()); else newParams.delete("to_value");
    newParams.set("to_unit", tUnit);
    if (fDate) newParams.set("from_date", fDate); else newParams.delete("from_date");
    if (tDate) newParams.set("to_date", tDate); else newParams.delete("to_date");
    setSearchParams(newParams);
  };

  const handleSearchQueryChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) newParams.set("q", query); else newParams.delete("q");
    setSearchParams(newParams);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const indices = await getDashboardIndices();
      const targetIndex = indices.length > 0 ? indices[0] : "logs-sentinel_one.threats";
      const [stats, fieldList, logList] = await Promise.all([
        getDashboardStats(fromValue || undefined, fromUnit, toValue ?? undefined, toUnit, fromDate ?? undefined, toDate ?? undefined, searchQuery || undefined),
        getIndexFields(targetIndex),
        getIndexLogs(fromValue || undefined, fromUnit, toValue ?? undefined, toUnit, fromDate ?? undefined, toDate ?? undefined, searchQuery || undefined, pageSize, page * pageSize)
      ]);
      setData(stats);
      setLogs(logList);
      setFields([{ name: "_source", type: "code" }, ...fieldList]);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setPage(0); }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate, searchQuery]);

  const handleBarClick = (startTime: string, endTime: string) => {
    handleTimeChange(null, "m", null, "m", startTime, endTime);
  };

  const FieldItem = ({ name, type, selected = false, onAction }: { name: string, type?: string, selected?: boolean, onAction: (name: string) => void }) => (
    <Tooltip title={name} placement="right" arrow disableInteractive>
      <ListItem disablePadding sx={{ '&:hover': { bgcolor: 'action.hover' }, '&:hover .field-actions': { display: 'flex' }, px: 1, py: 0.2, cursor: 'pointer', borderRadius: 0.5, mb: 0.2, position: 'relative' }}>
        <ListItemIcon sx={{ minWidth: 28 }}>
          {type === 'number' || type === 'integer' || type === 'long' || type === 'float' ? <NumbersIcon sx={{ fontSize: 16, color: 'text.disabled' }} /> : 
           type === 'date' ? <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} /> :
           type === 'boolean' || type === 'code' ? <CodeIcon sx={{ fontSize: 16, color: 'text.disabled' }} /> :
           <AbcIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
        </ListItemIcon>
        <ListItemText primary={name} primaryTypographyProps={{ variant: 'caption', sx: { fontSize: '0.75rem', fontWeight: selected ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 4 } }} />
        <Box className="field-actions" sx={{ display: 'none', position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', alignItems: 'center', bgcolor: 'action.hover', pl: 1 }}>
          <IconButton size="small" sx={{ p: 0.2, color: '#005a5e' }} onClick={(e) => { e.stopPropagation(); onAction(name); }}>
            {selected ? <RemoveCircleIcon sx={{ fontSize: 16 }} /> : <AddCircleIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
      </ListItem>
    </Tooltip>
  );

    return (

      <Box id="threat-list-tab-container" sx={{ 

        flexGrow: 1, 

        display: 'flex', 

        flexDirection: 'column', 

        height: '100%', 

        maxHeight: '100%',

        bgcolor: 'background.default', 

        overflow: 'hidden',

        p: { xs: 1.5, sm: 2, md: 3 } // DashboardTab과 패딩 일치

      }}>

        {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

        

        <ControlBar 

          t={t} 

          fromValue={fromValue} fromUnit={fromUnit} 

          toValue={toValue} toUnit={toUnit} 

          fromDate={fromDate} toDate={toDate} 

          onTimeChange={handleTimeChange} 

          searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} 

          onRefresh={fetchData} 

          lastUpdated={data?.last_updated ? dayjs(data.last_updated).add(9, 'hour').format("HH:mm:ss") : undefined} 

        />

  

        {error && <Alert severity="error" sx={{ m: 1, fontSize: '0.75rem', flexShrink: 0 }}>{error}</Alert>}

  

        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', gap: { xs: 1, md: 3 }, mt: { xs: 1, md: 2 } }}>
        <Paper elevation={1} sx={{ width: { xs: 0, md: 220 }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', borderRadius: 1.5, bgcolor: 'background.paper', height: '100%', flexShrink: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <TextField fullWidth size="small" variant="outlined" placeholder={t('searchPlaceholder') || "Search fields"} value={fieldSearchQuery} onChange={(e) => setFieldSearchQuery(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />, sx: { height: 32, fontSize: '0.75rem', bgcolor: 'action.hover', '& fieldset': { borderColor: 'divider' } } }} />
          </Box>
          <Box sx={{ px: 1.5, pt: 0.5, pb: 1, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>{t('selectedFields')}</Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
            <List disablePadding sx={{ mb: 2 }}>
              {selectedList.map((field) => <FieldItem key={field.name} name={field.name} type={field.type} selected onAction={handleToggleField} />)}
              {selectedList.length === 0 && <Typography variant="caption" sx={{ px: 1, color: 'text.disabled', fontStyle: 'italic' }}>No fields selected</Typography>}
            </List>
            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, px: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>{t('availableFields')}</Typography>
            <List disablePadding sx={{ pb: 4 }}>
              {availableList.map((field) => <FieldItem key={field.name} name={field.name} type={field.type} onAction={handleToggleField} />)}
            </List>
          </Box>
        </Paper>

        <Box sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 0.5, pr: 1 }}>
            <Paper elevation={1} sx={{ p: { xs: 1.5, md: 3 }, height: { xs: 250, sm: 350, md: 450 }, minHeight: { xs: 250, md: 450 }, width: '100%', borderRadius: 1.5, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                <BarChartWidget data={data?.histogram || []} height={undefined} title={undefined} emptyMessage={t('noLogs')} onBarClick={handleBarClick} onRangeSelect={handleBarClick} />
              </Box>
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontSize: '0.75rem', fontWeight: 500 }}>@timestamp per 30 minutes</Typography>
            </Paper>

            <Box sx={{ px: 0.5, flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'text.primary' }}>{t('results')} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>({logs.length}/{data?.summary.total_logs ?? 0})</Box></Typography>
            </Box>

            <Paper elevation={1} sx={{ borderRadius: 1.5, overflowX: 'auto', bgcolor: 'background.paper', mb: 1, flexShrink: 0 }}>
              <Box sx={{ minWidth: 'max-content' }}>
                <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1, px: 2 }}>
                  <Box sx={{ width: 32 }} />
                                  <Typography variant="caption" sx={{ width: 180, fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }}>{t('time')}</Typography>
                                  {selectedFieldNames.map((fieldName, idx) => (
                                    <Tooltip key={`${fieldName}-${idx}`} title={fieldName} arrow placement="top">
                                      <Typography 
                                        variant="caption" 
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(idx)}
                                        sx={{ 
                                          width: 150, 
                                          fontWeight: 'bold', 
                                          fontSize: '0.75rem', 
                                          px: 1, 
                                          flexShrink: 0, 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis', 
                                          cursor: 'grab',
                                          transition: 'all 0.2s',
                                          '&:hover': { bgcolor: 'action.selected' },
                                          '&:active': { cursor: 'grabbing' },
                                          opacity: dragIdx === idx ? 0.5 : 1,
                                          borderLeft: dragIdx !== null && dragIdx !== idx ? '2px dashed transparent' : 'none',
                                          '&:hover': { borderLeft: dragIdx !== null ? `2px dashed ${theme.palette.primary.main}` : 'none' }
                                        }}
                                      >
                                        {fieldName}
                                      </Typography>
                                    </Tooltip>
                                  ))}                </Box>
                {logs.length > 0 ? logs.map((log, idx) => {
                  const isExpanded = expandedRows.has(idx);
                  return (
                    <Box key={idx} sx={{ borderBottom: idx < logs.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          py: 1.5, 
                          px: 2, 
                          '&:hover': { bgcolor: 'action.hover' },
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleRow(idx)}
                      >
                        <IconButton size="small" sx={{ p: 0, mr: 1, mt: 0.2 }}>
                          {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        </IconButton>
                        <Typography variant="caption" sx={{ width: 180, fontSize: '0.75rem', color: 'text.primary', flexShrink: 0 }}>
                          {dayjs(log["@timestamp"]).format("MMM D, YYYY @ HH:mm:ss.SSS")}
                        </Typography>
                        {selectedFieldNames.map(fieldName => (
                          <Typography key={fieldName} variant="caption" sx={{ width: 150, fontSize: '0.75rem', px: 1, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getValueByPath(log, fieldName)}
                          </Typography>
                        ))}
                      </Box>
                      
                                                              {/* Expanded Detailed Content (Full-width Table Style) */}
                      
                                                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      
                                                                <Box sx={{ 
                      
                                                                  p: 0, 
                      
                                                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', 
                      
                                                                  borderBottom: 1, 
                      
                                                                  borderColor: 'divider' 
                      
                                                                }}>
                      
                                                                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      
                                                                    {/* Header-like row for @timestamp */}
                      
                                                                    <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
                      
                                                                      <Box sx={{ width: 220, p: 1, pl: 8, flexShrink: 0, bgcolor: 'action.hover' }}>
                      
                                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>@timestamp</Typography>
                      
                                                                      </Box>
                      
                                                                      <Box sx={{ p: 1, flexGrow: 1 }}>
                      
                                                                        <Typography variant="caption" sx={{ wordBreak: 'break-all', fontWeight: 'bold' }}>{formatValue(log["@timestamp"])}</Typography>
                      
                                                                      </Box>
                      
                                                                    </Box>
                      
                                                                    
                      
                                                                    {/* All other fields */}
                      
                                                                    {Object.keys(log).filter(k => k !== "@timestamp").sort().map((key, i, arr) => (
                      
                                                                      <Box key={key} sx={{ 
                      
                                                                        display: 'flex', 
                      
                                                                        borderBottom: i < arr.length - 1 ? '1px solid' : 'none', 
                      
                                                                        borderColor: 'divider',
                      
                                                                        '&:hover': { bgcolor: 'action.hover' }
                      
                                                                      }}>
                      
                                                                        <Box sx={{ width: 220, p: 0.75, pl: 8, flexShrink: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                      
                                                                          <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>{key}</Typography>
                      
                                                                        </Box>
                      
                                                                        <Box sx={{ p: 0.75, flexGrow: 1, pl: 2 }}>
                      
                                                                          <Typography variant="caption" sx={{ wordBreak: 'break-all', color: 'text.primary' }}>{formatValue(log[key])}</Typography>
                      
                                                                        </Box>
                      
                                                                      </Box>
                      
                                                                    ))}
                      
                                                                  </Box>
                      
                                                                </Box>
                      
                                                              </Collapse>                    </Box>
                  );
                }) : !loading && <Box sx={{ p: 10, textAlign: 'center' }}><Typography variant="body2" color="text.disabled">{t('noResults')}</Typography></Box>}
              </Box>
            </Paper>
          </Box>

          <Paper elevation={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0, borderRadius: '8px 8px 0 0', zIndex: 10 }}>
            <Box sx={{ width: 250 }}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {t('showingInfo', { 
                  from: (page * pageSize + 1).toLocaleString(), 
                  to: Math.min((page + 1) * pageSize, data?.summary.total_logs ?? 0).toLocaleString(), 
                  total: (data?.summary.total_logs ?? 0).toLocaleString() 
                })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton size="small" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} sx={{ border: 1, borderColor: 'divider' }}><ChevronLeftIcon fontSize="small" /></IconButton>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(() => {
                  const totalLogs = data?.summary.total_logs ?? 0;
                  const totalPages = Math.ceil(totalLogs / pageSize);
                  const maxButtons = 5;
                  
                  let startPage = Math.max(0, page - Math.floor(maxButtons / 2));
                  let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
                  
                  if (endPage - startPage + 1 < maxButtons) {
                    startPage = Math.max(0, endPage - maxButtons + 1);
                  }

                  const buttons = [];
                  for (let i = startPage; i <= endPage; i++) {
                    const isCurrent = i === page;
                    buttons.push(
                      <Button
                        key={i}
                        size="small"
                        onClick={() => setPage(i)}
                        disabled={loading}
                        sx={{
                          minWidth: 28,
                          height: 32,
                          p: 0,
                          fontSize: '0.85rem',
                          fontWeight: isCurrent ? 'bold' : 'normal',
                          bgcolor: 'transparent',
                          color: isCurrent ? 'primary.main' : 'text.secondary',
                          border: 'none',
                          borderRadius: 0,
                          borderBottom: isCurrent ? 2 : 0,
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'primary.main',
                          },
                          mx: 0.25
                        }}
                      >
                        {i + 1}
                      </Button>
                    );
                  }
                  return buttons;
                })()}
              </Box>
              <IconButton size="small" disabled={((page + 1) * pageSize >= (data?.summary.total_logs ?? 0)) || loading} onClick={() => setPage(p => p + 1)} sx={{ border: 1, borderColor: 'divider' }}><ChevronRightIcon fontSize="small" /></IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 250, justifyContent: 'flex-end', mr: 1 }}>
              <Typography variant="caption" color="text.secondary">{t('rowsPerPage') || 'Rows per page:'}</Typography>
              <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} size="small" variant="standard" sx={{ fontSize: '0.75rem', '&:before, &:after': { border: 'none' }, '& .MuiSelect-select': { py: 0.5 } }}>
                <MenuItem value={20}>20</MenuItem><MenuItem value={50}>50</MenuItem><MenuItem value={100}>100</MenuItem><MenuItem value={500}>500</MenuItem>
              </Select>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ThreatListTab;
