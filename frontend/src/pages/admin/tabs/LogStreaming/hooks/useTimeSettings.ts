import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { TimeSettingData } from '../components/TimeSettingPopover';

export const useTimeSettings = (isPaused: boolean, timeRange: any) => {
  const [timeAnchorEl, setTimeAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverInfo, setPopoverInfo] = useState<TimeSettingData | null>(null);

  const openTimePopover = useCallback((type: 'quick' | 'detailed', point: 'from' | 'to', e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPaused) return;
    
    const currentISO = point === 'from' ? timeRange.fromISO : timeRange.toISO;
    const d = dayjs(currentISO || undefined).second(0).millisecond(0);
    
    setPopoverInfo({
      popoverType: type,
      editingPoint: point,
      tabValue: point === 'from' 
        ? (timeRange.fromISO ? 0 : 1) 
        : (timeRange.toISO ? 0 : (timeRange.toValue !== null ? 1 : 2)),
      popoverVal: point === 'from' ? timeRange.fromValue || 15 : timeRange.toValue || 15,
      popoverUnit: point === 'from' ? timeRange.fromUnit : timeRange.toUnit,
      popoverDate: d,
      popoverTime: d.format("HH:mm:ss"),
      val: point === 'from' ? timeRange.fromValue || 15 : timeRange.toValue || 15,
      unit: point === 'from' ? timeRange.fromUnit : timeRange.toUnit,
      date: d,
      time: d.format("HH:mm:ss")
    });
    
    setTimeAnchorEl(e.currentTarget.parentElement as HTMLDivElement);
  }, [isPaused, timeRange]);

  const handleApplyTime = useCallback((d: TimeSettingData) => {
    const [h, m, s] = d.time.split(":").map(Number);
    const iso = d.date.hour(h || 0).minute(m || 0).second(s || 0).millisecond(0).toISOString();
    
    if (d.editingPoint === 'from') {
      if (d.tabValue === 0) {
        timeRange.setFromISO(iso);
        timeRange.setFromValue(null);
      } else if (d.tabValue === 1) {
        timeRange.setFromValue(d.val);
        timeRange.setFromUnit(d.unit);
        timeRange.setFromISO(null);
      } else {
        timeRange.setFromISO(dayjs().second(0).millisecond(0).toISOString());
        timeRange.setFromValue(null);
      }
    } else {
      if (d.tabValue === 0) {
        timeRange.setToISO(iso);
        timeRange.setToValue(null);
      } else if (d.tabValue === 1) {
        timeRange.setToValue(d.val);
        timeRange.setToUnit(d.unit);
        timeRange.setToISO(null);
      } else {
        timeRange.setToISO(null);
        timeRange.setToValue(null);
      }
    }
    setTimeAnchorEl(null);
  }, [timeRange]);

  const handleCommonTime = useCallback((v: number, u: string) => {
    if (v === 0 && u === 'd') {
      timeRange.setFromISO(dayjs().startOf('day').toISOString());
      timeRange.setFromValue(null);
    } else {
      timeRange.setFromValue(v);
      timeRange.setFromUnit(u);
      timeRange.setFromISO(null);
    }
    timeRange.setToValue(null);
    timeRange.setToUnit("m");
    timeRange.setToISO(null);
    setTimeAnchorEl(null);
  }, [timeRange]);

  return {
    timeAnchorEl,
    setTimeAnchorEl,
    popoverInfo,
    openTimePopover,
    handleApplyTime,
    handleCommonTime
  };
};
