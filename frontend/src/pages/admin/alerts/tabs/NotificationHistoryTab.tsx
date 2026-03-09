import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  Box, Typography, Paper, Stack, Divider, LinearProgress, Chip,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Collapse, TablePagination
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { notificationService } from '@/services/notificationService.ts';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getAlertWsUrl } from '@/utils/wsUtils';
import { useRoleCodesStore } from '@/stores/useRoleCodesStore';
import type { NotificationHistory } from '@/types';
import { getRoleName } from '@/utils/roleUtils';
import { useWebSocket } from '@/hooks/useWebSocket';
import AlertsControlBar from "../components/AlertsControlBar";
import { SeverityChip } from '@/pages/admin/alerts/components/SeverityChip';
import { AlertTableFilterMenu } from '../components/AlertTableFilterMenu';
import { ALERT_TABLE_STYLES, formatDateTime, SEVERITY_OPTIONS } from '../components/AlertTableStyles';
import { useTranslation } from '@/hooks/useTranslation';

// 행 컴포넌트
const NotificationRow: React.FC<{
  row: NotificationHistory;
  roleNames: Record<string, string>;
  language: string;
}> = ({ row, roleNames, language }) => {
  const [open, setOpen] = useState(false);

  return (
    <React.Fragment>
      <TableRow
        hover
        onClick={() => setOpen(!open)}
        sx={{
          ...ALERT_TABLE_STYLES.bodyRow,
          cursor: 'pointer',
          '& > td': { borderBottom: open ? 'none' : undefined },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell width={80} sx={{ pl: 7 }}>
          <IconButton size="small">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell width={180} sx={{ ...ALERT_TABLE_STYLES.bodyCell, pl: 3 }}>
          {formatDateTime(row.created_at)}
        </TableCell>
        <TableCell width={100} sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>
          <SeverityChip severity={row.rule_severity || row.severity} />
        </TableCell>
        <TableCell width={200} sx={{ 
          ...ALERT_TABLE_STYLES.bodyCell, 
          fontWeight: 'bold',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pl: 7
        }}>
          {row.rule_name || row.title}
        </TableCell>
        <TableCell width={220} sx={{ ...ALERT_TABLE_STYLES.bodyCell }}>
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
        </TableCell>
      </TableRow>

      <TableRow sx={{ '& > td': { p: 0, borderBottom: open ? undefined : 'none' } }}>
        <TableCell colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 4, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 'medium',
                  p: 2,
                  bgcolor: 'action.selected',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  minHeight: '100px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: 1.8,
                  '&::-webkit-scrollbar': { width: 6, height: 6 },
                  '&::-webkit-scrollbar-thumb': { 
                    bgcolor: 'rgba(0,0,0,0.2)', 
                    borderRadius: 3,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                  }
                }}
              >
                {row.message}
              </Typography>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

const NotificationHistoryTab: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState<number[]>([25, 50, 100]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useTranslation();
  const { roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  // 시간 범위 상태
  const [fromValue, setFromValue] = useState<number | null>(settings?.time_filter_duration ?? null);
  const [fromUnit, setFromUnit] = useState<string>(settings?.time_filter_unit ?? "m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState<string>("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);


  // 필터 메뉴 상태
  const [severityAnchor, setSeverityAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetchRoleCodes();
  }, [fetchRoleCodes]);

    // 고급 설정 로드 및 연동
    useEffect(() => {
      fetchSettings();
    }, [fetchSettings]);
  
    useEffect(() => {
      if (settings) {
        if (settings.pagination_size) {
          setRowsPerPage(settings.pagination_size);
          setRowsPerPageOptions(prev => {
            const newOptions = [...prev];
            if (!newOptions.includes(settings.pagination_size!)) {
              newOptions.unshift(settings.pagination_size!);
              return newOptions.sort((a, b) => a - b);
            }
            return newOptions;
          });
        }
        if (settings.time_filter_duration && settings.time_filter_unit) {
          setFromValue(settings.time_filter_duration);
          setFromUnit(settings.time_filter_unit);
        }
      }
    }, [settings]);  // 시간 범위를 ISO 날짜로 변환
  const calculateTimeRange = useCallback(() => {
    const now = dayjs();
    let from_date: string | undefined;
    let to_date: string | undefined;

    // fromDate가 있으면 절대 시간 사용
    if (fromDate) {
      from_date = fromDate;
    } else if (fromValue !== null) {
      // 상대 시간 계산
      const fromMoment = now.subtract(fromValue, fromUnit as dayjs.ManipulateType);
      from_date = fromMoment.toISOString();
    }

    // toDate가 있으면 절대 시간 사용, 없으면 현재 시간
    if (toDate) {
      to_date = toDate;
    } else if (toValue !== null) {
      const toMoment = now.subtract(toValue, toUnit as dayjs.ManipulateType);
      to_date = toMoment.toISOString();
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

      // 중요도 필터 추가
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

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // WebSocket으로 실시간 알림 수신 시 자동 새로고침
  const wsUrl = getAlertWsUrl();

  const token = localStorage.getItem('access_token');

  useWebSocket({
    url: wsUrl,
    token: token,
    onMessage: (data: any) => {
      if (data.type === 'new_alert') {
        // 새 알림 수신 시 자동 새로고침 (폴링 모드로 조용히)
        loadNotifications(true);
      }
    }
  });

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
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
          setFromValue(fv);
          setFromUnit(fu);
          setToValue(tv);
          setToUnit(tu);
          setFromDate(fd);
          setToDate(td);
          setPage(0);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(q) => {
          setSearchQuery(q);
          setPage(0);
        }}
        onRefresh={() => { setPage(0); loadNotifications(); }}
      />

      <Paper {...ALERT_TABLE_STYLES.paper}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('notificationHistory')}</Typography>
            <Chip label={`${total} ${t('countUnit')}`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
        </Stack>

        <Divider sx={{ mx: 2 }} />

        <TableContainer {...ALERT_TABLE_STYLES.container}>
          <Table {...ALERT_TABLE_STYLES.table} size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell width={50} sx={{ ...ALERT_TABLE_STYLES.headerCell }} />
                <TableCell width={180} sx={{ ...ALERT_TABLE_STYLES.headerCell, pl: 3 }}>{t('occurrenceDate')}</TableCell>
                <TableCell width={100} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {t('severity')}
                    <IconButton
                      size="small"
                      onClick={(e) => setSeverityAnchor(e.currentTarget)}
                      sx={{ p: 0.25 }}
                    >
                      <FilterListIcon sx={{ fontSize: 16, color: selectedSeverities.length > 0 ? 'primary.main' : 'text.secondary' }} />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell width={200} sx={{ ...ALERT_TABLE_STYLES.headerCell, pl: 7 }}>{t('ruleName')}</TableCell>
                <TableCell width={250} sx={{ ...ALERT_TABLE_STYLES.headerCell }}>{t('receiverGroup')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.disabled' }}>{loading ? t('loading') : t('noNotificationHistory')}</TableCell></TableRow>
              ) : (
                notifications
                  .filter(row => selectedSeverities.length === 0 || (row.severity && selectedSeverities.includes(row.severity.toLowerCase())))
                  .map((row) => (
                    <NotificationRow
                      key={row.id}
                      row={row}
                      roleNames={roleNames}
                      language={language}
                    />
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          {...ALERT_TABLE_STYLES.pagination}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      </Paper>

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
