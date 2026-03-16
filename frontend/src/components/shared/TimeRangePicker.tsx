import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Popover, Divider, FormControl, Select, MenuItem,
  TextField, Tabs, Tab,
} from '@mui/material';
import {
  CalendarMonth as CalendarMonthIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  ArrowForward as ArrowForwardIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';

const ACCENT = '#005a5e';

export interface TimeRangePickerProps {
  t: (key: string, params?: Record<string, string>) => string;
  language: string;
  fromValue: number | null;
  fromUnit: string;
  toValue: number | null;
  toUnit: string;
  fromDate: string | null;
  toDate: string | null;
  onTimeChange: (
    fv: number | null, fu: string,
    tv: number | null, tu: string,
    fd: string | null, td: string | null
  ) => void;
  onRefresh: () => void;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  t, language,
  fromValue, fromUnit, toValue, toUnit, fromDate, toDate,
  onTimeChange, onRefresh,
}) => {
  const theme = useTheme();
  const BORDER_COLOR = theme.palette.divider;
  const BG_COLOR = theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f5f7fa';
  const TEXT_COLOR = theme.palette.text.primary;

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverType, setPopoverType] = useState<'quick' | 'detailed'>('quick');
  const [editingPoint, setEditingPoint] = useState<'from' | 'to'>('from');
  const [tabValue, setTabValue] = useState(1);
  const [popoverVal, setPopoverVal] = useState(fromValue || 15);
  const [popoverUnit, setPopoverUnit] = useState(fromUnit);
  const [popoverDate, setPopoverDate] = useState<Dayjs>(dayjs());
  const [popoverTime, setPopoverTime] = useState('12:00');
  const [autoRefreshValue, setAutoRefreshValue] = useState(0);
  const [autoRefreshUnit, setAutoRefreshUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<any>(null);

  // props 변경 시 내부 상태 sync
  useEffect(() => {
    if (fromValue !== null) setPopoverVal(fromValue);
    setPopoverUnit(fromUnit);
  }, [fromValue, fromUnit]);

  useEffect(() => {
    if (fromDate) {
      const d = dayjs(fromDate);
      setPopoverDate(d);
      setPopoverTime(d.format('HH:mm'));
    }
  }, [fromDate]);

  useEffect(() => {
    if (isRefreshing && autoRefreshValue > 0) {
      const ms = autoRefreshUnit === 'seconds' ? autoRefreshValue * 1000 : autoRefreshValue * 60000;
      refreshTimerRef.current = setInterval(onRefresh, ms);
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [isRefreshing, autoRefreshValue, autoRefreshUnit, onRefresh]);

  const toggleAutoRefresh = () => {
    if (autoRefreshValue > 0) setIsRefreshing(!isRefreshing);
    else setIsRefreshing(false);
  };

  const open = Boolean(anchorEl);

  const handleQuickClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPopoverType('quick');
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleFromClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('from');
    if (fromDate) {
      const d = dayjs(fromDate); setPopoverDate(d); setPopoverTime(d.format('HH:mm')); setTabValue(0);
    } else { setPopoverVal(fromValue !== null ? fromValue : 15); setPopoverUnit(fromUnit); setTabValue(1); }
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleToClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setPopoverType('detailed');
    setEditingPoint('to');
    if (toDate) {
      const d = dayjs(toDate); setPopoverDate(d); setPopoverTime(d.format('HH:mm')); setTabValue(0);
    } else if (toValue !== null) { setPopoverVal(toValue); setPopoverUnit(toUnit); setTabValue(1); }
    else { setTabValue(2); }
    setAnchorEl(event.currentTarget.parentElement as HTMLDivElement);
  };

  const handleClose = () => setAnchorEl(null);

  const handleApplyTime = () => {
    let finalFVal = fromValue, finalFUnit = fromUnit, finalTVal = toValue, finalTUnit = toUnit;
    let finalFDate = fromDate, finalTDate = toDate;
    const [h, m] = popoverTime.split(':').map(Number);
    const absoluteISO = popoverDate.hour(h).minute(m).second(0).millisecond(0).toISOString();

    if (editingPoint === 'from') {
      if (tabValue === 0) { finalFDate = absoluteISO; finalFVal = null; }
      else if (tabValue === 1) { finalFVal = popoverVal; finalFUnit = popoverUnit; finalFDate = null; }
      else { finalFDate = dayjs().toISOString(); finalFVal = null; }
    } else {
      if (tabValue === 0) { finalTDate = absoluteISO; finalTVal = null; }
      else if (tabValue === 1) { finalTVal = popoverVal; finalTUnit = popoverUnit; finalTDate = null; }
      else { finalTDate = null; finalTVal = null; }
    }
    onTimeChange(finalFVal, finalFUnit, finalTVal, finalTUnit, finalFDate, finalTDate);
    handleClose();
  };

  const handleCommonClick = (val: number, unit: string) => {
    if (val === 0 && unit === 'd') {
      onTimeChange(null, 'm', null, 'm', dayjs().startOf('day').toISOString(), null);
    } else {
      onTimeChange(val, unit, null, 'm', null, null);
    }
    handleClose();
  };

  const unitTextMap: Record<string, string> = {
    'm': t('minutesAgo'), 'h': t('hoursAgo'), 'd': t('daysAgo'),
  };

  const formatPoint = (val: number | null, unit: string, date: string | null, isTo: boolean) => {
    if (isTo && val === null && date === null) return t('now');
    if (date) return dayjs(date).locale(language).format('MMM D, YYYY @ HH:mm');
    if (val === null) return t('all');
    return `~ ${val} ${unitTextMap[unit]}`;
  };

  const timeOptions = useMemo(() => {
    const times: string[] = [];
    for (let hh = 0; hh < 24; hh++)
      for (let mm = 0; mm < 60; mm += 30)
        times.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    return times;
  }, []);

  const CommonRange = ({ label, val, unit }: { label: string; val: number; unit: string }) => (
    <Typography variant="body2" onClick={() => handleCommonClick(val, unit)}
      sx={{ color: ACCENT, fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}>
      {label}
    </Typography>
  );

  return (
    <>
      {/* 트리거 박스 */}
      <Box sx={{
        display: 'flex', alignItems: 'center', bgcolor: BG_COLOR,
        border: `1px solid ${open ? ACCENT : BORDER_COLOR}`, borderRadius: 1,
        overflow: 'hidden', minHeight: 32,
      }}>
        <Box onClick={handleQuickClick} sx={{
          px: 0.75, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center',
          height: '100%', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover },
        }}>
          <CalendarMonthIcon sx={{ color: ACCENT, fontSize: 18 }} />
          <KeyboardArrowDownIcon sx={{ color: ACCENT, fontSize: 14 }} />
        </Box>
        <Box onClick={handleFromClick} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}>
          <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
            {formatPoint(fromValue, fromUnit, fromDate, false)}
          </Typography>
        </Box>
        <ArrowForwardIcon sx={{ fontSize: 10, color: theme.palette.text.disabled }} />
        <Box onClick={handleToClick} sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}>
          <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
            {formatPoint(toValue, toUnit, toDate, true)}
          </Typography>
        </Box>
      </Box>

      {/* 팝오버 */}
      <Popover open={open} anchorEl={anchorEl} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: theme.shadows[10], bgcolor: theme.palette.background.paper, overflow: 'hidden' } }}
      >
        {popoverType === 'quick' ? (
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: TEXT_COLOR }}>{t('quickSelect')}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <ChevronLeftIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                  <ChevronRightIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ width: 100 }}>
                  <Select value="Last" sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                    <MenuItem value="Last">Last</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" type="number" value={popoverVal}
                  onChange={(e) => setPopoverVal(Number(e.target.value))}
                  sx={{ width: 80, '& .MuiInputBase-input': { height: 16, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)}
                    sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                    <MenuItem value="m">{t('unit_m')}</MenuItem>
                    <MenuItem value="h">{t('unit_h')}</MenuItem>
                    <MenuItem value="d">{t('unit_d')}</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" onClick={handleApplyTime}
                  sx={{ borderColor: ACCENT, color: ACCENT, height: 32, fontWeight: 'bold', textTransform: 'none' }}>
                  {t('apply')}
                </Button>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                {t('commonlyUsed')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <CommonRange label={t('today')} val={0} unit="d" />
                <CommonRange label={t('last24h')} val={24} unit="h" />
                <CommonRange label={t('thisWeek')} val={7} unit="d" />
                <CommonRange label={t('last7d')} val={7} unit="d" />
                <CommonRange label={t('last15m')} val={15} unit="m" />
                <CommonRange label={t('last30d')} val={30} unit="d" />
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                {t('refreshEvery')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" type="number" value={autoRefreshValue}
                  onChange={(e) => setAutoRefreshValue(Number(e.target.value))}
                  disabled={isRefreshing}
                  sx={{ width: 80, '& .MuiInputBase-input': { height: 16, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select value={autoRefreshUnit} onChange={(e) => setAutoRefreshUnit(e.target.value as any)}
                    disabled={isRefreshing} sx={{ height: 32, fontSize: '0.85rem', bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                    <MenuItem value="seconds">{t('seconds')}</MenuItem>
                    <MenuItem value="minutes">{t('minutes')}</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" size="small"
                  startIcon={isRefreshing ? <StopIcon /> : <PlayArrowIcon />}
                  onClick={toggleAutoRefresh} disabled={autoRefreshValue <= 0}
                  sx={{ bgcolor: isRefreshing ? 'error.main' : ACCENT, color: 'white', height: 32, textTransform: 'none', '&:hover': { bgcolor: isRefreshing ? 'error.dark' : '#004a4d' } }}>
                  {isRefreshing ? 'Stop' : t('start')}
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ borderBottom: 1, borderColor: BORDER_COLOR, bgcolor: BG_COLOR, p: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: ACCENT }}>
                {editingPoint === 'from' ? t('setStartPoint') : t('setEndPoint')}
              </Typography>
            </Box>
            <Box sx={{ borderBottom: 1, borderColor: BORDER_COLOR }}>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth"
                sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', minHeight: 48, color: theme.palette.text.secondary }, '& .MuiTabs-indicator': { backgroundColor: ACCENT, height: 3 }, '& .Mui-selected': { color: `${ACCENT} !important` } }}>
                <Tab label={t('absolute')} />
                <Tab label={t('relative')} />
                <Tab label={t('now')} />
              </Tabs>
            </Box>
            <Box sx={{ p: 2 }}>
              {tabValue === 0 && (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <DateCalendar value={popoverDate} onChange={(v) => v && setPopoverDate(v)}
                        sx={{ width: '100%', maxHeight: 280, '& .MuiPickersDay-root.Mui-selected': { bgcolor: ACCENT }, '& .MuiPickersDay-root:hover': { bgcolor: `${ACCENT}22` } }} />
                    </Box>
                    <Box sx={{ width: 100, borderLeft: `1px solid ${BORDER_COLOR}`, pl: 1, maxHeight: 280, overflowY: 'auto' }}>
                      {timeOptions.map(time => (
                        <Typography key={time} variant="caption" onClick={() => setPopoverTime(time)}
                          sx={{ display: 'block', p: 0.8, cursor: 'pointer', borderRadius: 0.5, textAlign: 'center',
                            bgcolor: popoverTime === time ? `${ACCENT}22` : 'transparent',
                            color: popoverTime === time ? ACCENT : 'inherit',
                            fontWeight: popoverTime === time ? 'bold' : 'normal',
                            '&:hover': { bgcolor: theme.palette.action.hover } }}>
                          {time}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </LocalizationProvider>
              )}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField size="small" type="number" value={popoverVal}
                    onChange={(e) => setPopoverVal(Number(e.target.value))}
                    sx={{ width: 150, '& .MuiInputBase-root': { bgcolor: BG_COLOR, color: TEXT_COLOR } }} />
                  <FormControl size="small" sx={{ flexGrow: 1 }}>
                    <Select value={popoverUnit} onChange={(e) => setPopoverUnit(e.target.value)}
                      sx={{ bgcolor: BG_COLOR, color: TEXT_COLOR }}>
                      <MenuItem value="m">{t('unit_m')}</MenuItem>
                      <MenuItem value="h">{t('unit_h')}</MenuItem>
                      <MenuItem value="d">{t('unit_d')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              {tabValue === 2 && (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Button fullWidth variant="contained" onClick={() => { setTabValue(2); handleApplyTime(); }}
                    sx={{ bgcolor: ACCENT, color: 'white', textTransform: 'none', fontWeight: 'bold', '&:hover': { bgcolor: '#004a4d' } }}>
                    {t('setToNow')}
                  </Button>
                </Box>
              )}
            </Box>
            {tabValue !== 2 && (
              <Box sx={{ p: 1.5, bgcolor: BG_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, overflow: 'hidden', bgcolor: theme.palette.background.paper }}>
                  <Box sx={{ px: 1, py: 0.5, bgcolor: theme.palette.action.selected, borderRight: `1px solid ${BORDER_COLOR}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {editingPoint === 'from' ? t('startDate') : t('endDate')}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ px: 1.5 }}>
                    {tabValue === 0
                      ? popoverDate.locale(language).hour(parseInt(popoverTime.split(':')[0])).minute(parseInt(popoverTime.split(':')[1])).format('MMM D, YYYY @ HH:mm:ss')
                      : dayjs().locale(language).format('MMM D, YYYY @ HH:mm:ss')}
                  </Typography>
                </Box>
                <Button size="small" variant="contained" onClick={handleApplyTime}
                  sx={{ bgcolor: ACCENT, fontWeight: 'bold', textTransform: 'none', '&:hover': { bgcolor: '#004a4d' } }}>
                  {t('apply')}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Popover>
    </>
  );
};

export default TimeRangePicker;
