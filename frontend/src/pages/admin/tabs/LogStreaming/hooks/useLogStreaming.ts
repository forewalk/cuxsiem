import { useState, useEffect, useRef, useCallback } from 'react';
import { logService } from '@/services/logService';
import type { LogEntry } from '@/types';
import { MAX_LOGS, POLL_INTERVAL } from '../constants';

export const useLogStreaming = (
  isActive: boolean,
  maxLogs: number = MAX_LOGS,
  pollIntervalMs: number = POLL_INTERVAL,
) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(true); // 탭 열면 일시정지 상태로 시작
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [indexOptions, setIndexOptions] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const lastTimestampRef = useRef<string | null>(null);
  // 탭이 최초 활성화된 이후에만 조건 변경 시 재조회하도록 추적 (초기 진입 시 자동 조회 방지)
  const isInitializedRef = useRef(false);

  // 시간 관련 상태
  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [fromISO, setFromISO] = useState<string | null>(null);
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [toISO, setToISO] = useState<string | null>(null);

  const fetchIndices = useCallback(async () => {
    try {
      const r = await logService.getIndices();
      // 시스템 인덱스(cs_, top_ 접두어) 제외
      const filtered = r.indices.filter((idx: string) => !idx.startsWith('cs_') && !idx.startsWith('top_'));
      setIndexOptions(filtered);
      // 현재 선택된 인덱스가 유효하지 않으면 초기화
      setSelectedIndex(prev => {
        if (prev && filtered.includes(prev)) return prev;
        return '';
      });
    } catch (e) {
      setIndexOptions([]);
      setSelectedIndex('');
    }
  }, []);

  const fetchLogs = useCallback(async (isManual = false) => {
    if ((!isActive || isPaused) && !isManual) return;
    if (!selectedIndex) return; // 인덱스 미선택 시 조회하지 않음
    try {
      if (isManual) setLoading(true);
      let ft: string | undefined = undefined, tt: string | undefined = undefined;

      if (isManual) {
        // 수동 검색: 시간필터 값 기반 범위 조회
        if (fromISO) ft = fromISO;
        else if (fromValue !== null) ft = `now-${fromValue}${fromUnit}`;
        else ft = "now-15m";

        if (toISO) tt = toISO;
        else if (toValue !== null) tt = `now-${toValue}${toUnit}`;
      }
      // 스트리밍 모드: lastTimestamp 이후 데이터만 증분 조회 (ft/tt 불필요)

      const combinedQuery = [appliedKeyword, ...filters]
        .filter(Boolean)
        .map(q => `(${q})`)
        .join(" AND ");

      const r = await logService.getLogStream(lastTimestampRef.current, maxLogs, combinedQuery, selectedIndex, ft, tt);

      if (r.logs.length > 0) {
        setLogs(prev => {
          if (isManual) return r.logs.slice(-maxLogs);
          // 스트리밍: 새 로그만 추가
          const nl = r.logs.filter(n => !prev.some(p => p._id === n._id));
          if (nl.length === 0) return prev;
          return [...prev, ...nl].slice(-maxLogs);
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

  // 탭 활성화 시: 인덱스 조회 및 초기화 (자동 조회 없음 - 사용자가 직접 조회해야 함)
  useEffect(() => {
    if (isActive) {
      fetchIndices();
      lastTimestampRef.current = null;
      isInitializedRef.current = true;
    } else {
      isInitializedRef.current = false;
    }
  }, [isActive, fetchIndices]);

  // 검색 조건 변경 시 재조회 (탭 초기 진입 시는 제외 - isInitializedRef 사용)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    lastTimestampRef.current = null;
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKeyword, filters, selectedIndex, fromISO, toISO, fromValue, fromUnit, toValue, toUnit]);

  // 폴링 설정 (pollIntervalMs 또는 POLL_INTERVAL 기준)
  useEffect(() => {
    const timer = setInterval(() => fetchLogs(), pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetchLogs, pollIntervalMs]);

  // 수동 새로고침 (검색 버튼 클릭 시 항상 조회)
  const refresh = useCallback(() => {
    lastTimestampRef.current = null;
    fetchLogs(true);
  }, [fetchLogs]);

  const clearLogs = () => {
    setLogs([]);
    lastTimestampRef.current = new Date().toISOString();
  };

  // 스트리밍 시작: 로그 클리어 + 현재 시각을 기준점으로 설정
  const startStreaming = useCallback(() => {
    setLogs([]);
    lastTimestampRef.current = new Date().toISOString();
  }, []);

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
    refresh,
    clearLogs,
    startStreaming,
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
