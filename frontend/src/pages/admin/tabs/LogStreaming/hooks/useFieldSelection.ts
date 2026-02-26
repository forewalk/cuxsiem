import { useState, useMemo } from 'react';
import type { LogEntry } from '@/types';
import { flattenObject } from '../utils/logUtils';
import { DEFAULT_VISIBLE_FIELDS } from '../constants';

export const useFieldSelection = (logs: LogEntry[]) => {
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_VISIBLE_FIELDS);

  const availableFields = useMemo(() => {
    const fieldSet = new Set<string>(DEFAULT_VISIBLE_FIELDS);
    logs.slice(0, 100).forEach(log => {
      if (log._source) {
        const flat = flattenObject(log._source);
        Object.keys(flat).forEach(k => fieldSet.add(k));
      }
    });
    return Array.from(fieldSet).sort();
  }, [logs]);

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
