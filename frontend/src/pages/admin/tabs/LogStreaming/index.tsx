import React, { useState, useMemo } from 'react';
import { 
  Box, Paper, Stack, Typography, Divider, LinearProgress, Chip, Button, Tooltip, IconButton
} from '@mui/material';
import { 
  Terminal as TerminalIcon, 
  Settings as SettingsIcon, 
  DeleteSweep as ClearIcon, 
  PlayArrow as PlayArrowIcon, 
  Stop as StopIcon,
  FilterList as FilterIcon,
  VerticalAlignBottom as AutoScrollIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

// dayjs 로케일
import 'dayjs/locale/ko';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';

// Stores & Types
import { useLanguageStore } from "@/stores/useLanguageStore";
import useTabStore from '@/stores/tabStore';
import type { LogEntry } from '@/types';

// Locales
import koMessages from "@/locales/ko.json";
import enMessages from "@/locales/en.json";
import jaMessages from "@/locales/ja.json";
import cnMessages from "@/locales/cn.json";

// Internal
import LogStreamControlBar from './components/LogStreamControlBar';
import LogTable from './components/LogTable';
import LogDetailPanel from './components/LogDetailPanel';
import FieldSelectorPopover from './components/FieldSelectorPopover';
import TimeSettingPopover from './components/TimeSettingPopover';
import { useLogStreaming } from './hooks/useLogStreaming';
import { useFieldSelection } from './hooks/useFieldSelection';
import { useTimeSettings } from './hooks/useTimeSettings';

const LogStreaming: React.FC = () => {
  const { language } = useLanguageStore();
  const { activeTabId } = useTabStore();
  const isActive = activeTabId === 'LogStreamingTab';

  // i18n
  const translations: Record<string, Record<string, string>> = { 
    ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages 
  };
  const t = useMemo(() => (key: string, params?: Record<string, string>): string => { 
    const ct = translations[language] || translations["ko"] || {}; 
    let text = ct[key] || key; 
    if (params) Object.entries(params).forEach(([pk, v]) => { text = text.replace(`{${pk}}`, v); }); 
    return text; 
  }, [language, translations]);

  // Hooks
  const {
    logs, loading, isPaused, setIsPaused, selectedIndices, setSelectedIndices,
    indexOptions, keyword, setKeyword, appliedKeyword, setAppliedKeyword,
    filters, setFilters, clearLogs, handleFilterAdd, timeRange
  } = useLogStreaming(isActive);

  const { visibleFields, availableFields, toggleField, resetFields } = useFieldSelection(logs);
  
  const { 
    timeAnchorEl, setTimeAnchorEl, popoverInfo, 
    openTimePopover, handleApplyTime, handleCommonTime 
  } = useTimeSettings(isPaused, timeRange);

  // States
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [fieldAnchorEl, setFieldAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Derived
  const hasSearchOrFilter = appliedKeyword || filters.length > 0;
  const currentLogDate = useMemo(() => {
    if (logs.length === 0) return dayjs().format('YYYY-MM-DD');
    return dayjs(logs[0].timestamp).format('YYYY-MM-DD');
  }, [logs]);

  const togglePaused = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (!nextPaused) {
      timeRange.setFromValue(15);
      timeRange.setFromUnit("m");
      timeRange.setFromISO(null);
      timeRange.setToValue(null);
      timeRange.setToUnit("m");
      timeRange.setToISO(null);
      setAutoScroll(true);
    }
  };

  const formatTimeDisplay = (v: number | null, u: string, d: string | null, isTo: boolean) => {
    if (isTo && v === null && d === null) return t('now');
    if (d) return dayjs(d).locale(language).format("MMM D, YYYY @ HH:mm:ss");
    const unitText: any = { 'm': t('minutesAgo'), 'h': t('hoursAgo'), 'd': t('daysAgo') };
    return `~ ${v} ${unitText[u]}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', p: 3, gap: 1 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <LogStreamControlBar 
        t={t} 
        keyword={keyword} onKeywordChange={setKeyword}
        filters={filters} onFiltersChange={setFilters}
        indexOptions={indexOptions} 
        selectedIndices={selectedIndices} onIndicesChange={setSelectedIndices} 
        onRefresh={() => setAppliedKeyword(keyword)}
        onClearKeyword={() => { setKeyword(""); setAppliedKeyword(""); }}
      />

      <Paper elevation={1} sx={{ p: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('logStreaming')}</Typography>
            <Chip 
              icon={hasSearchOrFilter ? <FilterIcon sx={{ fontSize: '0.8rem !important' }} /> : undefined}
              label={`${logs.length} logs`} 
              size="small" variant={hasSearchOrFilter ? "filled" : "outlined"} color={hasSearchOrFilter ? "primary" : "default"}
              sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
            />
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box 
              sx={{ 
                display: 'flex', alignItems: 'center', bgcolor: 'action.hover', border: '1px solid', 
                borderColor: timeAnchorEl ? 'primary.main' : 'divider', borderRadius: 1, 
                overflow: 'hidden', height: 32, opacity: isPaused ? 1 : 0.6, 
                pointerEvents: isPaused ? 'auto' : 'none', transition: 'all 0.2s' 
              }}
            >
              <Box 
                onClick={(e) => openTimePopover('quick', 'from', e)} 
                sx={{ px: 0.75, borderRight: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
              >
                <CalendarIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                <ArrowDownIcon sx={{ color: 'primary.main', fontSize: 14 }} />
              </Box>
              <Box 
                onClick={(e) => openTimePopover('detailed', 'from', e)} 
                sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
              >
                <Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>
                  {formatTimeDisplay(timeRange.fromValue, timeRange.fromUnit, timeRange.fromISO, false)}
                </Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
              <Box 
                onClick={(e) => openTimePopover('detailed', 'to', e)} 
                sx={{ px: 1, height: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
              >
                <Typography sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>
                  {formatTimeDisplay(timeRange.toValue, timeRange.toUnit, timeRange.toISO, true)}
                </Typography>
              </Box>
            </Box>
            <Tooltip title={t('selectFields')}>
              <Button 
                variant="outlined" size="small" startIcon={<SettingsIcon />} 
                onClick={(e) => setFieldAnchorEl(e.currentTarget)}
                sx={{ height: 32, textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
              >
                {t('field')}
              </Button>
            </Tooltip>
            <Tooltip title={t('clearLogs')}>
              <IconButton size="small" onClick={clearLogs}><ClearIcon /></IconButton>
            </Tooltip>
            <Button 
              variant="contained" size="small" 
              startIcon={isPaused ? <PlayArrowIcon /> : <StopIcon />} 
              onClick={togglePaused} color={isPaused ? 'error' : 'success'} 
              sx={{ 
                textTransform: 'none', borderRadius: 1.5, minWidth: 110, height: 32, 
                fontWeight: 'bold', boxShadow: (theme) => isPaused ? 'none' : `0 0 8px ${theme.palette.success.main}44` 
              }}
            >
              {isPaused ? t('paused') : t('streaming')}
            </Button>
          </Stack>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <LogTable 
            logs={logs}
            filteredLogs={logs}
            visibleFields={visibleFields}
            selectedLog={selectedLog}
            onSelectLog={setSelectedLog}
            loading={loading}
            autoScroll={autoScroll}
            onAutoScrollChange={setAutoScroll}
            currentLogDate={currentLogDate}
            t={t}
          />
          {selectedLog && (
            <LogDetailPanel 
              log={selectedLog} 
              onClose={() => setSelectedLog(null)} 
              onFilterAdd={handleFilterAdd} 
              t={t} 
            />
          )}
        </Stack>
      </Paper>

      <TimeSettingPopover 
        open={Boolean(timeAnchorEl)} anchorEl={timeAnchorEl} onClose={() => setTimeAnchorEl(null)} 
        onApply={handleApplyTime} onCommon={handleCommonTime} initialData={popoverInfo} 
        t={t} language={language} 
      />
      
      <FieldSelectorPopover 
        open={Boolean(fieldAnchorEl)} anchorEl={fieldAnchorEl} onClose={() => setFieldAnchorEl(null)} 
        availableFields={availableFields} visibleFields={visibleFields} 
        onToggleField={toggleField} onReset={resetFields} t={t} 
      />
    </Box>
  );
};

export default LogStreaming;
