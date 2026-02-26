import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Button, Popover, Tabs, Tab, MenuItem, Select, FormControl, 
  Divider as MuiDivider, TextField 
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';

export interface TimeSettingData {
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

const TimeSettingPopover = React.memo(({ 
  open, anchorEl, onClose, onApply, onCommon, initialData, t, language 
}: TimeSettingPopoverProps) => {
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
  }, [open, initialData]);

  const handleApply = () => { 
    onApply({ 
      editingPoint: localEditingPoint, tabValue: localTab, val: localVal, 
      unit: localUnit, date: localDate, time: localTime 
    }); 
  };

  const timeOptions = useMemo(() => { 
    const ts = []; 
    for (let h = 0; h < 24; h++) { 
      for (let m = 0; m < 60; m += 30) { 
        ts.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`); 
      } 
    } 
    return ts; 
  }, []);

  const formatDisplayTime = () => { 
    if (localTab === 0) { 
      const [h, m, s] = localTime.split(":").map(Number); 
      return localDate.locale(language).hour(h || 0).minute(m || 0).second(s || 0).format("MMM D, YYYY @ HH:mm:ss"); 
    } 
    return dayjs().locale(language).format("MMM D, YYYY @ HH:mm:ss"); 
  };

  return (
    <Popover 
      open={open} anchorEl={anchorEl} onClose={onClose} 
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} 
      transformOrigin={{ vertical: 'top', horizontal: 'left' }} 
      PaperProps={{ sx: { width: initialData?.popoverType === 'quick' ? 450 : 480, mt: 1, borderRadius: 1, boxShadow: 10 } }}
    >
      {initialData?.popoverType === 'quick' ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>{t('quickSelect')}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ width: 100 }}>
              <Select value="Last" sx={{ height: 32, fontSize: '0.85rem' }}>
                <MenuItem value="Last">Last</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              size="small" type="number" value={localVal} 
              onChange={(e) => setLocalVal(Number(e.target.value))} 
              sx={{ width: 80, "& .MuiInputBase-input": { height: 16, fontSize: '0.85rem' } }} 
            />
            <FormControl size="small" sx={{ flexGrow: 1 }}>
              <Select value={localUnit} onChange={(e) => setLocalUnit(e.target.value as string)} sx={{ height: 32, fontSize: '0.85rem' }}>
                <MenuItem value="m">{t('unit_m')}</MenuItem>
                <MenuItem value="h">{t('unit_h')}</MenuItem>
                <MenuItem value="d">{t('unit_d')}</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={handleApply} sx={{ height: 32, fontWeight: 'bold', textTransform: 'none' }}>
              {t('apply')}
            </Button>
          </Box>
          <MuiDivider sx={{ my: 2 }} />
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
            {t('commonlyUsed')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {['today', 'last24h', 'thisWeek', 'last7d', 'last15m', 'last30d'].map(key => { 
              const opts: Record<string, {v: number, u: string}> = { 
                today: { v: 0, u: 'd' }, last24h: { v: 24, u: 'h' }, thisWeek: { v: 7, u: 'd' }, 
                last7d: { v: 7, u: 'd' }, last15m: { v: 15, u: 'm' }, last30d: { v: 30, u: 'd' } 
              }; 
              return (
                <Typography 
                  key={key} variant="body2" onClick={() => onCommon(opts[key].v, opts[key].u)} 
                  sx={{ color: 'primary.main', fontWeight: 'bold', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, py: 0.5 }}
                >
                  {t(key)}
                </Typography>
              ); 
            })}
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', p: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {localEditingPoint === 'from' ? t('setStartPoint') : t('setEndPoint')}
            </Typography>
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={localTab} onChange={(_, v) => setLocalTab(v)} variant="fullWidth" 
              sx={{ "& .MuiTab-root": { textTransform: 'none', fontWeight: 'bold' } }}
            >
              <Tab label={t('absolute')} />
              <Tab label={t('relative')} />
              <Tab label={t('now')} />
            </Tabs>
          </Box>
          <Box sx={{ p: 2 }}>
            {localTab === 0 && (
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <DateCalendar 
                    value={localDate} onChange={(nv) => nv && setLocalDate(nv.second(0).millisecond(0))} 
                    sx={{ width: '100%', maxHeight: 280 }} 
                  />
                  <Box sx={{ width: 110, borderLeft: '1px solid', borderColor: 'divider', pl: 1, maxHeight: 280, overflowY: 'auto' }}>
                    {timeOptions.map(time => (
                      <Typography 
                        key={time} variant="caption" onClick={() => setLocalTime(time)} 
                        sx={{ 
                          display: 'block', p: 0.8, cursor: 'pointer', borderRadius: 0.5, textAlign: 'center', 
                          bgcolor: localTime === time ? 'action.selected' : 'transparent', 
                          fontWeight: localTime === time ? 'bold' : 'normal', fontSize: '0.7rem' 
                        }}
                      >
                        {time}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </LocalizationProvider>
            )} 
            {localTab === 1 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField 
                  size="small" type="number" value={localVal} 
                  onChange={(e) => setLocalVal(Number(e.target.value))} sx={{ width: 150 }} 
                />
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select value={localUnit} onChange={(e) => setLocalUnit(e.target.value as string)}>
                    <MenuItem value="m">{t('unit_m')}</MenuItem>
                    <MenuItem value="h">{t('unit_h')}</MenuItem>
                    <MenuItem value="d">{t('unit_d')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )} 
            {localTab === 2 && (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Button fullWidth variant="contained" onClick={() => { setLocalTab(2); handleApply(); }} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                  {t('setToNow')}
                </Button>
              </Box>
            )}
          </Box>
          {localTab !== 2 && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{formatDisplayTime()}</Typography>
              <Button size="small" variant="contained" onClick={handleApply} sx={{ fontWeight: 'bold', textTransform: 'none' }}>
                {t('apply')}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Popover>
  );
});

export default TimeSettingPopover;
