import { useState, useMemo, useEffect, useCallback } from 'react';
import type { LogEntry } from '@/types';
import { logService } from '@/services/logService';
import { flattenObject } from '../utils/logUtils';
import { DEFAULT_VISIBLE_FIELDS } from '../constants';

export const useFieldSelection = (logs: LogEntry[], selectedIndex: string = '') => {
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS);
  const [mappingFields, setMappingFields] = useState<string[]>([]);

  // 인덱스 변경 시 매핑 필드 조회
  const fetchMappingFields = useCallback(async () => {
    if (!selectedIndex) {
      setMappingFields([]);
      return;
    }
    try {
      const result = await logService.getIndexFields(selectedIndex);
      setMappingFields(result.fields || []);
    } catch {
      setMappingFields([]);
    }
  }, [selectedIndex]);

  useEffect(() => {
    fetchMappingFields();
  }, [fetchMappingFields]);

  // 매핑 필드 + 로그 데이터 필드 병합
  const availableFields = useMemo(() => {
    const fieldSet = new Set<string>(DEFAULT_VISIBLE_FIELDS);
    mappingFields.forEach(f => fieldSet.add(f));
    logs.slice(0, 100).forEach(log => {
      if (log._source) {
        const flat = flattenObject(log._source);
        Object.keys(flat).forEach(k => fieldSet.add(k));
      }
    });
    return Array.from(fieldSet).sort();
  }, [logs, mappingFields]);

  const toggleField = (field: string) => {
    setVisibleFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const resetFields = () => {
    setVisibleFields(DEFAULT_VISIBLE_FIELDS);
  };

  return {
    visibleFields,
    availableFields,
    toggleField,
    resetFields
  };
};
