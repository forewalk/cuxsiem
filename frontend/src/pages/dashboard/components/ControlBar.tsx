import React, { useState, useEffect, useRef, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import StorageIcon from "@mui/icons-material/Storage";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { useLanguageStore } from "../../../stores/useLanguageStore";
import dayjs, { Dayjs } from "dayjs";

// dayjs 로케일 임포트
import 'dayjs/locale/ko';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';

interface ControlBarProps {
  t: (key: string, params?: Record<string, string>) => string;
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
  onTimeChange: (fromVal: number | null, fromUnit: string, toVal: number | null, toUnit: string, fDate: string | null, tDate: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  onReset?: () => void;
  isEditMode?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  lastUpdated?: string;
  totalLogs?: number;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  t,
  fromValue,
  fromUnit,
  toValue,
  toUnit,
  fromDate,
  toDate,
  onTimeChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  onReset,
  isEditMode,
  onEdit,
  onCancel,
  onSave,
  lastUpdated,
  totalLogs
}) => {
  const theme = useTheme();
  const { language } = useLanguageStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tempQuery, setTempQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverType, setPopoverType] = useState<'quick' | 'detailed'>('quick');
  const [editingPoint, setEditingPoint] = useState<'from' | 'to'>('from');
  const [tabValue, setTabValue] = useState(1);

  const [popoverVal, setPopoverVal] = useState(fromValue || 15);
  const [popoverUnit, setPopoverUnit] = useState(fromUnit);
  const [popoverDate, setPopoverDate] = useState<Dayjs>(dayjs());
  const [popoverTime, setPopoverTime] = useState("12:00");

  const [autoRefreshValue, setAutoRefreshValue] = useState(0);
  const [autoRefreshUnit, setAutoRefreshUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isRefreshing && autoRefreshValue > 0) {
      const intervalMs = autoRefreshUnit === 'seconds' ? autoRefreshValue * 1000 : autoRefreshValue * 60 * 1000;
      refreshTimerRef.current = setInterval(() => { onRefresh(); }, intervalMs);
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [isRefreshing, autoRefreshValue, autoRefreshUnit, onRefresh]);

  const toggleAutoRefresh = () => {
    if (autoRefreshValue > 0) setIsRefreshing(!isRefreshing);
    else setIsRefreshing(false);
  };

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

  const handleQuickClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPopoverType('quick');
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleFromClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('from');
    if (fromDate) {
      const d = dayjs(fromDate);
      setPopoverDate(d);
      setPopoverTime(d.format("HH:mm"));
      setTabValue(0);
    } else {
      setPopoverVal(fromValue || 15);
      setPopoverUnit(fromUnit);
      setTabValue(1);
    }
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleToClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('to');
    if (toDate) {
      const d = dayjs(toDate);
      setPopoverDate(d);
      setPopoverTime(d.format("HH:mm"));
      setTabValue(0);
    } else if (toValue !== null) {
      setPopoverVal(toValue);
      setPopoverUnit(toUnit);
      setTabValue(1);
    } else {
      setTabValue(2);
    }
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleClose = () => { setAnchorEl(null); };

  const handleApplyTime = () => {
    let finalFVal = fromValue;
    let finalFUnit = fromUnit;
    let finalTVal = toValue;
    let finalTUnit = toUnit;
    let finalFDate = fromDate;
    let finalTDate = toDate;

    const absoluteISO = popoverDate.hour(parseInt(popoverTime.split(":")[0])).minute(parseInt(popoverTime.split(":")[1])).second(0).toISOString();

    if (editingPoint === 'from') {
      if (tabValue === 0) {
        finalFDate = absoluteISO;
        finalFVal = null;
      } else if (tabValue === 1) {
        finalFVal = popoverVal;
        finalFUnit = popoverUnit;
        finalFDate = null;
      } else {
        finalFDate = dayjs().toISOString();
        finalFVal = null;
      }
    } else {
      if (tabValue === 0) {
        finalTDate = absoluteISO;
        finalTVal = null;
      } else if (tabValue === 1) {
        finalTVal = popoverVal;
        finalTUnit = popoverUnit;
        finalTDate = null;
      } else {
        finalTDate = null;
        finalTVal = null;
      }
    }

    onTimeChange(finalFVal, finalFUnit, finalTVal, finalTUnit, finalFDate, finalTDate);
    handleClose();
  };

  const handleCommonClick = (val: number, unit: string) => {
    if (val === 0 && unit === 'd') {
      const startOfToday = dayjs().startOf('day').toISOString();
      onTimeChange(null, "m", null, "m", startOfToday, null);
    } else {
      onTimeChange(val, unit, null, "m", null, null);
    }
    handleClose();
  };

  const KIBANA_TEAL = "#005a5e";
  const BORDER_COLOR = theme.palette.divider;
  const BG_COLOR = theme.palette.mode === 'dark' ? theme.palette.background.paper : "#f5f7fa";
  const TEXT_COLOR = theme.palette.text.primary;
  const open = Boolean(anchorEl);

  const unitTextMap: Record<string, string> = { 'm': t('minutesAgo'), 'h': t('hoursAgo'), 'd': t('daysAgo') };

  const formatPoint = (val: number | null, unit: string, date: string | null, isTo: boolean) => {
    if (isTo && val === null && date === null) return t('now');
    if (date) return dayjs(date).locale(language).format("MMM D, YYYY @ HH:mm");
    return `~ ${val} ${unitTextMap[unit]}`;
  };

  const CommonRange = ({ label, val, unit }: { label: string, val: number, unit: string }) => (
    <Typography variant="body2" onClick={() => handleCommonClick(val, unit)} sx={{ color: KIBANA_TEAL, fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}>{label}</Typography>
  );

  const timeOptions = useMemo(() => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return times;
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 0.5, md: 0.75 }, mb: { xs: 1, md: 2 }, width: '100%' }}>
      <Box sx={{ 
        display: "flex", 
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: "stretch", 
        gap: 0.5, 
        width: '100%' 
      }}>
        
        {/* 1. Search Section (Expanded) */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: BG_COLOR, 
          border: `1px solid ${BORDER_COLOR}`, 
          borderRadius: 1, 
          flexGrow: 1, 
          overflow: 'hidden',
          minHeight: 32
        }}>
          <Box sx={{ px: 0.75, display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
          </Box>
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <TextField 
              fullWidth 
              size="small" 
              variant="standard"
              placeholder={t('searchPlaceholder') || t('search')} 
              value={tempQuery} 
              onChange={(e) => setTempQuery(e.target.value)} 
              sx={{ 
                "& .MuiInputBase-root": { mt: 0 },
                "& .MuiInput-underline:before, & .MuiInput-underline:after": { border: 'none' },
                "& .MuiInput-underline:hover:not(.Mui-disabled):before": { border: 'none' },
                "& .MuiInputBase-input": { py: 0.5, px: 0.5, fontSize: '0.85rem', color: TEXT_COLOR } 
              }} 
            />
          </Box>
          {tempQuery && (
            <IconButton size="small" onClick={() => setTempQuery("")} sx={{ p: 0.5, mr: 0.5 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, width: { xs: '100%', lg: 'auto' } }}>
          {/* 3. Time Picker Section (More compact) */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: BG_COLOR, 
            border: `1px solid ${open ? KIBANA_TEAL : BORDER_COLOR}`, 
            borderRadius: 1, 
            flexGrow: { xs: 1, lg: 0 },
            overflow: 'hidden',
            minHeight: 32
          }}>
            <Box onClick={handleQuickClick} sx={{ px: 0.75, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}>
              <CalendarMonthIcon sx={{ color: KIBANA_TEAL, fontSize: 18 }} />
              <KeyboardArrowDownIcon sx={{ color: KIBANA_TEAL, fontSize: 14 }} />
            </Box>

            <Box onClick={handleFromClick} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}>
              <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>{formatPoint(fromValue, fromUnit, fromDate, false)}</Typography>
            </Box>

            <ArrowForwardIcon sx={{ fontSize: 10, color: theme.palette.text.disabled }} />

            <Box onClick={handleToClick} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}>
              <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>{formatPoint(toValue, toUnit, toDate, true)}</Typography>
            </Box>
          </Box>

          <Button 
            variant="contained" 
            disableElevation
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} 
            onClick={onRefresh} 
            sx={{ 
              bgcolor: KIBANA_TEAL,
              color: '#fff',
              textTransform: 'none', 
              fontWeight: 'bold', 
              px: 1.5,
              minWidth: { xs: 'fit-content', md: 80 },
              minHeight: 32,
              fontSize: '0.75rem',
              '&:hover': { bgcolor: '#004a4d' } 
            }}
          >
            {isMobile ? '' : t('refresh')}
          </Button>
        </Box>
      </Box>

      {/* 4. Filter Tags Section */}
      {searchQuery && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <FilterAltIcon sx={{ color: KIBANA_TEAL, fontSize: 16 }} />
          {searchQuery.split(" AND ").map((filter, index) => (
            <Box key={index} sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 90, 94, 0.2)' : '#eef6f6', 
              border: `1px solid ${KIBANA_TEAL}`, 
              borderRadius: 0.5, 
              px: 0.75,
              py: 0.1
            }}>
              <Typography variant="caption" sx={{ color: TEXT_COLOR, fontSize: '0.75rem' }}>
                {filter.trim()}
              </Typography>
              <IconButton size="small" onClick={() => handleRemoveFilter(filter.trim())} sx={{ ml: 0.5, p: 0.1, color: TEXT_COLOR }}>
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {(lastUpdated || totalLogs !== undefined || onReset || onEdit) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.25, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdated && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {t('lastUpdated')}: {lastUpdated}
              </Typography>
            )}
            {lastUpdated && totalLogs !== undefined && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>•</Typography>
            )}
            {totalLogs !== undefined && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {t('totalLogs') || 'Total Logs'}: {totalLogs.toLocaleString()}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isEditMode && onEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={onEdit}
                sx={{ 
                  fontSize: '0.65rem', color: 'text.secondary', borderColor: 'divider', textTransform: 'none', height: 22, px: 1.5, borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', borderColor: KIBANA_TEAL, color: KIBANA_TEAL } 
                }}
              >
                {t('edit')}
              </Button>
            )}

            {isEditMode && (
              <>
                {onReset && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                    onClick={onReset}
                    sx={{ 
                      fontSize: '0.65rem', 
                      color: 'text.secondary', 
                      borderColor: 'divider',
                      textTransform: 'none',
                      height: 22,
                      px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover', color: 'error.main', borderColor: 'error.main' } 
                    }}
                  >
                    {t('reset')}
                  </Button>
                )}

                {onCancel && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onCancel}
                    sx={{ 
                      fontSize: '0.65rem', 
                      color: 'text.secondary', 
                      borderColor: 'divider',
                      textTransform: 'none',
                      height: 22,
                      px: 1.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' } 
                    }}
                  >
                    {t('cancel')}
                  </Button>
                )}

                {onSave && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                    onClick={onSave}
                    sx={{ 
                      fontSize: '0.65rem', 
                      bgcolor: KIBANA_TEAL,
                      color: 'white', 
                      textTransform: 'none',
                      height: 22,
                      px: 1.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: '#004a4d' } 
                    }}
                  >
                    {t('save')}
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      <Popover open={open} anchorEl={anchorEl} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} PaperProps={{ sx: { width: popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: theme.shadows[10], bgcolor: theme.palette.background.paper, overflow: 'hidden' } }}>
        {popoverType === 'quick' ? (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: TEXT_COLOR }}>{t('quickSelect')}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}><ChevronLeftIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} /><ChevronRightIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} /></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ width: 100 }}><Select value="Last" sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}><MenuItem value="Last">Last</MenuItem></Select></FormControl>
                <TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}><Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)} sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}><MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem></Select></FormControl>
                <Button variant="outlined" size="small" onClick={handleApplyTime} sx={{ borderColor: KIBANA_TEAL, color: KIBANA_TEAL, height: 32, fontWeight: 'bold', textTransform: 'none' }}>{t('apply')}</Button>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, display: 'block', mb: 1 }}>{t('commonlyUsed')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <CommonRange label={t('today')} val={0} unit="d" /><CommonRange label={t('last24h')} val={24} unit="h" />
                <CommonRange label={t('thisWeek')} val={7} unit="d" /><CommonRange label={t('last7d')} val={7} unit="d" />
                <CommonRange label={t('last15m')} val={15} unit="m" /><CommonRange label={t('last30d')} val={30} unit="d" />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, display: 'block', mb: 1 }}>{t('refreshEvery')}</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" type="number" value={autoRefreshValue} onChange={(e) => setAutoRefreshValue(Number(e.target.value))} disabled={isRefreshing} sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select value={autoRefreshUnit} onChange={(e) => setAutoRefreshUnit(e.target.value as any)} disabled={isRefreshing} sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                    <MenuItem value="seconds">{t('seconds')}</MenuItem>
                    <MenuItem value="minutes">{t('minutes')}</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" startIcon={isRefreshing ? <StopIcon /> : <PlayArrowIcon />} onClick={toggleAutoRefresh} disabled={autoRefreshValue <= 0} sx={{ bgcolor: isRefreshing ? 'error.main' : KIBANA_TEAL, color: 'white', height: 32, textTransform: 'none', '&:hover': { bgcolor: isRefreshing ? 'error.dark' : '#004a4d' } }}>{isRefreshing ? 'Stop' : t('start')}</Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: BORDER_COLOR, bgcolor: BG_COLOR, p: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: KIBANA_TEAL }}>{editingPoint === 'from' ? t('setStartPoint') : t('setEndPoint')}</Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: BORDER_COLOR }}>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth" sx={{ "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold', minHeight: 48, color: theme.palette.text.secondary }, "& .MuiTabs-indicator": { backgroundColor: KIBANA_TEAL, height: 3 }, "& .Mui-selected": { color: `${KIBANA_TEAL} !important` } }}>
                <Tab label={t('absolute')} /><Tab label={t('relative')} /><Tab label={t('now')} />
              </Tabs>
            </Box>
            <Box sx={{ p: 2 }}>
              {tabValue === 0 && (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <DateCalendar 
                        value={popoverDate} 
                        onChange={(newValue) => newValue && setPopoverDate(newValue)}
                        sx={{ 
                          width: '100%', 
                          maxHeight: 280,
                          "& .MuiPickersDay-root.Mui-selected": { bgcolor: KIBANA_TEAL },
                          "& .MuiPickersDay-root:hover": { bgcolor: `${KIBANA_TEAL}22` }
                        }}
                      />
                    </Box>
                    <Box sx={{ width: 100, borderLeft: `1px solid ${BORDER_COLOR}`, pl: 1, maxHeight: 280, overflowY: 'auto' }}>
                      {timeOptions.map(time => (
                        <Typography 
                          key={time} 
                          variant="caption" 
                          onClick={() => setPopoverTime(time)}
                          sx={{ 
                            display: 'block', p: 0.8, cursor: 'pointer', borderRadius: 0.5, textAlign: 'center',
                            bgcolor: popoverTime === time ? `${KIBANA_TEAL}22` : 'transparent',
                            color: popoverTime === time ? KIBANA_TEAL : 'inherit',
                            fontWeight: popoverTime === time ? 'bold' : 'normal',
                            '&:hover': { bgcolor: theme.palette.action.hover }
                          }}
                        >
                          {time}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </LocalizationProvider>
              )}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField size="small" type="number" value={popoverVal} onChange={(e) => setPopoverVal(Number(e.target.value))} sx={{ width: 150, "& .MuiInputBase-root": { bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                  <FormControl size="small" sx={{ flexGrow: 1 }}>
                    <Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)} sx={{ bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                      <MenuItem value="m">{t('unit_m')}</MenuItem><MenuItem value="h">{t('unit_h')}</MenuItem><MenuItem value="d">{t('unit_d')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              {tabValue === 2 && (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={() => { setTabValue(2); handleApplyTime(); }} 
                    sx={{ 
                      bgcolor: KIBANA_TEAL, 
                      color: 'white', 
                      textTransform: 'none', 
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: '#004a4d' }
                    }}
                  >
                    {t('setToNow')}
                  </Button>
                </Box>
              )}
            </Box>
            {tabValue !== 2 && (
              <Box sx={{ p: 1.5, bgcolor: BG_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, overflow: 'hidden', bgcolor: theme.palette.background.paper }}>
                  <Box sx={{ px: 1, py: 0.5, bgcolor: theme.palette.action.selected, borderRight: `1px solid ${BORDER_COLOR}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{editingPoint === 'from' ? t('startDate') : t('endDate')}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ px: 1.5 }}>
                    {tabValue === 0 
                      ? popoverDate.locale(language).hour(parseInt(popoverTime.split(":")[0])).minute(parseInt(popoverTime.split(":")[1])).format("MMM D, YYYY @ HH:mm:ss")
                      : dayjs().locale(language).format("MMM D, YYYY @ HH:mm:ss")
                    }
                  </Typography>
                </Box>
                <Button size="small" variant="contained" onClick={handleApplyTime} sx={{ bgcolor: KIBANA_TEAL, fontWeight: 'bold', textTransform: 'none', '&:hover': { bgcolor: '#004a4d' } }}>{t('apply')}</Button>
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default ControlBar;