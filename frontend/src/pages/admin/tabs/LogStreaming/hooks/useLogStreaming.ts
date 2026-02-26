import { useState, useEffect, useRef, useCallback } from 'react';
import { logService } from '@/services/logService';
import type { LogEntry } from '@/types';
import { MAX_LOGS, POLL_INTERVAL } from '../constants';

export const useLogStreaming = (isActive: boolean) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('*');
  const [indexOptions, setIndexOptions] = useState<string[]>(['*']);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const lastTimestampRef = useRef<string | null>(null);

  // 시간 관련 상태 (일시정지 모드용)
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [fromISO, setFromISO] = useState<string | null>(null);
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [toISO, setToISO] = useState<string | null>(null);

  const fetchIndices = useCallback(async () => {
    try {
      const r = await logService.getIndices();
      const i = r.indices.includes('*') ? r.indices : ['*', ...r.indices];
      setIndexOptions(i);
      if (i.length > 0 && !i.includes(selectedIndex)) setSelectedIndex('*');
    } catch (e) {
      setIndexOptions(['*']);
    }
  }, [selectedIndex]);

  const fetchLogs = useCallback(async (isManual = false) => {
    if ((!isActive || isPaused) && !isManual) return;
    try {
      if (isManual) setLoading(true);
      let ft: string | undefined = undefined, tt: string | undefined = undefined;
      
      if (isPaused) {
        if (fromISO) ft = fromISO; 
        else if (fromValue !== null) ft = `now-${fromValue}${fromUnit}`;
        
        if (toISO) tt = toISO; 
        else if (toValue !== null) tt = `now-${toValue}${toUnit}`;
      } else {
        if (!lastTimestampRef.current) ft = "now-15m";
      }
      
      const combinedQuery = [appliedKeyword, ...filters]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(" AND ");
        
      const r = await logService.getLogStream(lastTimestampRef.current, MAX_LOGS, combinedQuery, selectedIndex, ft, tt);
      
      if (r.logs.length > 0) {
        setLogs(prev => {
          if (!lastTimestampRef.current || isManual) return r.logs.slice(-MAX_LOGS);
          const nl = r.logs.filter(n => !prev.some(p => p._id === n._id));
          if (nl.length === 0) return prev;
          return [...prev, ...nl].slice(-MAX_LOGS);
        });
        lastTimestampRef.current = r.last_timestamp;
      } else if (isManual) {
        setLogs([]);
        lastTimestampRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isActive, isPaused, appliedKeyword, filters, selectedIndex, fromISO, toISO, fromValue, fromUnit, toValue, toUnit]);

  // 초기 로드 및 인덱스 조회
  useEffect(() => {
    if (isActive) fetchIndices();
  }, [isActive, fetchIndices]);

  // 검색 조건 변경 시 재조회
  useEffect(() => {
    if (isActive) {
      lastTimestampRef.current = null;
      fetchLogs(true);
    }
  }, [appliedKeyword, filters, selectedIndex, fromISO, toISO, fromValue, fromUnit, toValue, toUnit, isActive, fetchLogs]);

  // 폴링 설정
  useEffect(() => {
    const timer = setInterval(() => fetchLogs(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  const clearLogs = () => {
    setLogs([]);
    lastTimestampRef.current = null;
  };

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const newFilter = `${field}: "${value}"`;
    setFilters(prev => {
      if (prev.includes(newFilter)) return prev;
      return [...prev, newFilter];
    });
  }, []);

  return {
    logs,
    loading,
    isPaused,
    setIsPaused,
    selectedIndex,
    setSelectedIndex,
    indexOptions,
    keyword,
    setKeyword,
    appliedKeyword,
    setAppliedKeyword,
    filters,
    setFilters,
    clearLogs,
    handleFilterAdd,
    timeRange: {
      fromValue, setFromValue,
      fromUnit, setFromUnit,
      fromISO, setFromISO,
      toValue, setToValue,
      toUnit, setToUnit,
      toISO, setToISO
    }
  };
};
