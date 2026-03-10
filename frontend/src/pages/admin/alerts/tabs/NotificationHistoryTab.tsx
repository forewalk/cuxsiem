import { useTranslation } from '@/hooks/useTranslation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { SeverityChip } from '@/pages/admin/alerts/components/SeverityChip';
import { notificationService } from '@/services/notificationService.ts';
import { useRoleCodesStore } from '@/stores/useRoleCodesStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { NotificationHistory } from '@/types';
import { getRoleName } from '@/utils/roleUtils';
import { getAlertWsUrl } from '@/utils/wsUtils';
import {
  KeyboardArrowRight as KeyboardArrowRightIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  FilterList as FilterListIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AlertsControlBar from "../components/AlertsControlBar";
import { AlertTableFilterMenu } from '../components/AlertTableFilterMenu';
import { formatDateTime, SEVERITY_OPTIONS } from '../components/AlertTableStyles';

const NotificationHistoryTab: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pageSizeOptions] = useState<number[]>([20, 50, 100, 500]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useTranslation();
  const { roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();
  const theme = useTheme();
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [fromValue, setFromValue] = useState<number | null>(settings?.time_filter_duration ?? null);
  const [fromUnit, setFromUnit] = useState<string>(settings?.time_filter_unit ?? "m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState<string>("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [severityAnchor, setSeverityAnchor] = useState<null | HTMLElement>(null);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  useEffect(() => { fetchRoleCodes(); }, [fetchRoleCodes]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      if (settings.pagination_size) setRowsPerPage(settings.pagination_size);
      if (settings.time_filter_duration && settings.time_filter_unit) {
        setFromValue(settings.time_filter_duration);
        setFromUnit(settings.time_filter_unit);
      }
    }
  }, [settings]);

  const calculateTimeRange = useCallback(() => {
    const now = dayjs();
    let from_date: string | undefined;
    let to_date: string | undefined;

    if (fromDate) {
      from_date = fromDate;
    } else if (fromValue !== null) {
      from_date = now.subtract(fromValue, fromUnit as dayjs.ManipulateType).toISOString();
    }

    if (toDate) {
      to_date = toDate;
    } else if (toValue !== null) {
      to_date = now.subtract(toValue, toUnit as dayjs.ManipulateType).toISOString();
    } else {
      to_date = now.toISOString();
    }

    return { from_date, to_date };
  }, [fromValue, fromUnit, toValue, toUnit, fromDate, toDate]);

  const loadNotifications = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const { from_date, to_date } = calculateTimeRange();

      const params: any = {
        skip,
        limit: rowsPerPage,
        query: searchQuery || undefined,
        from_date,
        to_date
      };

      if (selectedSeverities.length > 0) {
        params.severities = selectedSeverities.join(',');
      }

      const data = await notificationService.getNotifications(params);
      setNotifications(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, selectedSeverities, calculateTimeRange]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const wsUrl = getAlertWsUrl();
  const token = localStorage.getItem('access_token');

  useWebSocket({
    url: wsUrl,
    token: token,
    onMessage: (data: any) => {
      if (data.type === 'new_alert') {
        loadNotifications(true);
      }
    }
  });

  const filteredNotifications = notifications;

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

      <AlertsControlBar
        t={t}
        fromValue={fromValue}
        fromUnit={fromUnit}
        toValue={toValue}
        toUnit={toUnit}
        fromDate={fromDate}
        toDate={toDate}
        onTimeChange={(fv, fu, tv, tu, fd, td) => {
          setFromValue(fv); setFromUnit(fu); setToValue(tv); setToUnit(tu); setFromDate(fd); setToDate(td); setPage(0);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(q) => { setSearchQuery(q); setPage(0); }}
        onRefresh={() => { setPage(0); loadNotifications(); }}
      />

      <Box sx={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 1.5, mt: 1 }}>
        <Box sx={{ px: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'text.primary' }}>
            {t('results')} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>({filteredNotifications.length}/{total})</Box>
          </Typography>
        </Box>

        <Paper
          elevation={1}
          ref={tableScrollRef}
          sx={{
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            mb: 1,
            flex: '1 1 0',
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            '&::-webkit-scrollbar': { height: '14px', width: '14px', display: 'block !important' },
            '&::-webkit-scrollbar-track': { background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f0f0f0' },
            '&::-webkit-scrollbar-thumb': { background: theme.palette.primary.main, borderRadius: '7px' }
          }}
        >
          <Box sx={{ width: 'max-content', minWidth: '100%' }}>
            {/* 헤더 */}
            <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1, px: 2, alignItems: 'center' }}>
              <Box sx={{ width: 40, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ width: 200, minWidth: 200, flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', px: 1 }}>{t('occurrenceDate')}</Typography>
              <Box sx={{ width: 120, minWidth: 120, flexShrink: 0, display: 'flex', alignItems: 'center', px: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{t('severity')}</Typography>
                <IconButton size="small" onClick={(e) => setSeverityAnchor(e.currentTarget)} sx={{ p: 0.25, ml: 0.5 }}>
                  <FilterListIcon sx={{ fontSize: 14, color: selectedSeverities.length > 0 ? 'primary.main' : 'text.secondary' }} />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ width: 250, minWidth: 250, flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', px: 1 }}>{t('ruleName')}</Typography>
              <Typography variant="caption" sx={{ width: 300, minWidth: 300, flexShrink: 0, fontWeight: 'bold', fontSize: '0.75rem', px: 1 }}>{t('receiverGroup')}</Typography>
            </Box>

            {/* 바디 */}
            {filteredNotifications.length > 0 ? filteredNotifications.map((row, idx) => {
              const isExpanded = expandedRows.has(idx);
              return (
                <Box key={row.id} sx={{ borderBottom: idx < filteredNotifications.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', py: 0.75, px: 2, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer', bgcolor: isExpanded ? 'action.selected' : 'transparent' }}
                    onClick={() => toggleRow(idx)}
                  >
                    <IconButton size="small" sx={{ p: 0, mr: 1, flexShrink: 0, width: 32 }}>
                      {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="caption" sx={{ width: 200, minWidth: 200, flexShrink: 0, fontSize: '0.75rem', px: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatDateTime(row.created_at)}
                    </Typography>
                    <Box sx={{ width: 120, minWidth: 120, flexShrink: 0, px: 1 }}>
                      <SeverityChip severity={row.rule_severity} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 250, minWidth: 250, flexShrink: 0, fontSize: '0.75rem', px: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                      {row.rule_name || row.title}
                    </Typography>
                    <Box sx={{ width: 300, minWidth: 300, flexShrink: 0, px: 1 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {row.receiver?.values && Array.isArray(row.receiver.values) ? (
                          row.receiver.values.map((role: string) => (
                            <Chip
                              key={role}
                              label={getRoleName(role, roleNames, language)}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderBottom: 1, borderColor: 'divider' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.primary',
                          p: 3,
                          pl: 7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.8,
                          fontSize: '0.85rem',
                          maxHeight: '400px',
                          overflow: 'auto'
                        }}
                      >
                        {row.message}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              );
            }) : !loading && (
              <Box sx={{ width: '100%', py: 10, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">{t('noNotificationHistory')}</Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* 페이지네이션 */}
        <Paper elevation={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0, borderRadius: '8px 8px 0 0', zIndex: 10 }}>
          <Box sx={{ width: 250 }}>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {t('showingInfo', {
                from: (page * rowsPerPage + 1).toLocaleString(),
                to: Math.min((page + 1) * rowsPerPage, total).toLocaleString(),
                total: total.toLocaleString()
              })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton size="small" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {(() => {
                const totalPages = Math.ceil(total / rowsPerPage);
                let startPage = Math.max(0, page - 2);
                const endPage = Math.min(totalPages - 1, startPage + 4);
                if (endPage - startPage + 1 < 5) startPage = Math.max(0, endPage - 4);
                const btns = [];
                for (let i = startPage; i <= endPage; i++) {
                  btns.push(
                    <Button key={i} size="small" onClick={() => setPage(i)} disabled={loading} sx={{
                      minWidth: 28, height: 32, p: 0, fontSize: '0.85rem',
                      fontWeight: i === page ? 'bold' : 'normal',
                      bgcolor: 'transparent',
                      color: i === page ? 'primary.main' : 'text.secondary',
                      border: 'none', borderRadius: 0,
                      borderBottom: i === page ? 2 : 0,
                      borderColor: 'primary.main',
                      '&:hover': { bgcolor: 'action.hover' },
                      mx: 0.25
                    }}>{i + 1}</Button>
                  );
                }
                return btns;
              })()}
            </Box>
            <IconButton size="small" disabled={((page + 1) * rowsPerPage >= total) || loading} onClick={() => setPage(p => p + 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 250, justifyContent: 'flex-end', mr: 1 }}>
            <Typography variant="caption" color="text.secondary">{t('rowsPerPage')}</Typography>
            <Select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} size="small" variant="standard" sx={{ fontSize: '0.75rem', '&:before, &:after': { border: 'none' }, '& .MuiSelect-select': { py: 0.5 } }}>
              {pageSizeOptions.map(o => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
            </Select>
          </Box>
        </Paper>
      </Box>

      {/* 중요도 필터 메뉴 */}
      <AlertTableFilterMenu
        anchorEl={severityAnchor}
        open={Boolean(severityAnchor)}
        onClose={() => setSeverityAnchor(null)}
        options={SEVERITY_OPTIONS.map(s => ({ value: s, label: s.toUpperCase() }))}
        selectedValues={selectedSeverities}
        onToggle={(value) => {
          const severity = value as string;
          setSelectedSeverities(prev =>
            prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
          );
        }}
        multiSelect
      />
    </Box>
  );
};

export default NotificationHistoryTab;
