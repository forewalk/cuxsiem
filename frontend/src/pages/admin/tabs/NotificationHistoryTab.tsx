import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Stack, Divider, LinearProgress, Chip,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Collapse, Tooltip, TablePagination
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Terminal as TerminalIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { notificationService } from '@/services/notificationService.ts';
import type { NotificationHistory } from '@/types';
import { useLanguageStore } from '@/stores/useLanguageStore.ts';
import ControlBar from "../../dashboard/components/ControlBar";

// i18n
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const translations: Record<string, Record<string, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
};

// 행 컴포넌트 (확장 로직 포함)
const NotificationRow: React.FC<{ 
  row: NotificationHistory, 
  t: any,
  getStatusChip: (s: string) => React.ReactNode,
  getSeverityChip: (s: string | null) => React.ReactNode
}> = ({ row, t, getStatusChip, getSeverityChip }) => {
  const [open, setOpen] = useState(false);

  // 전송 증적 데이터 구성
  const auditData = useMemo(() => {
    return {
      audit: {
        notification_id: row.id,
        rule_id: row.rule_id,
        sent_at: row.sent_at,
        delivery_status: row.status,
        error: row.error_message
      },
      request: {
        channel: row.channel || "N/A",
        endpoint: row.endpoint || "N/A",
        headers: row.request_headers || {},
        payload: row.outgoing_payload || {
          title: row.title,
          message: row.message,
          receiver: row.receiver
        }
      },
      response: {
        status_code: row.response_status_code,
        body: row.response_body
      }
    };
  }, [row]);

  const auditJson = JSON.stringify(auditData, null, 2);

  return (
    <React.Fragment>
      <TableRow 
        hover 
        onClick={() => setOpen(!open)}
        sx={{ 
          cursor: 'pointer',
          '& > td': { borderBottom: open ? 'none' : undefined },
          bgcolor: open ? 'action.selected' : 'inherit',
          transition: 'background-color 0.2s'
        }}
      >
        <TableCell width={50}>
          <IconButton size="small">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </TableCell>
        <TableCell>
          {getSeverityChip(row.severity)}
        </TableCell>
        <TableCell sx={{ fontWeight: 'bold' }}>
          {row.title}
        </TableCell>
        <TableCell sx={{ 
          maxWidth: 300, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          color: 'text.secondary'
        }}>
          {row.message}
        </TableCell>
        <TableCell align="center">
          {getStatusChip(row.status)}
        </TableCell>
      </TableRow>
      
      <TableRow sx={{ '& > td': { p: 0, borderBottom: open ? undefined : 'none' } }}>
        <TableCell colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.2, 
                  mb: 2.5, 
                  bgcolor: '#1e1e1e', 
                  color: '#d4d4d4', 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  border: 'none'
                }}
              >
                <TerminalIcon sx={{ fontSize: 16, color: '#4cc38a' }} />
                <Typography variant="caption" sx={{ fontFamily: 'inherit', letterSpacing: 0.5 }}>
                  {`$ curl -X POST "${row.endpoint || "/api/v1/notifications/send"}" -H "Content-Type: application/json" -d '{"rule_id": "${row.rule_id}", ...}'`}
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Notification Evidence
                    </Typography>
                    <Tooltip title="이벤트 원본 보기">
                      <IconButton size="small"><OpenInNewIcon fontSize="inherit" /></IconButton>
                    </Tooltip>
                  </Stack>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>알림 규칙</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.title}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>메시지 본문</Typography>
                    <Typography variant="body2" sx={{ 
                      whiteSpace: 'pre-wrap', 
                      p: 1.5, 
                      bgcolor: 'background.paper', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      {row.message}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>수신자 / 채널</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {row.channel ? `${row.channel.toUpperCase()} (${row.endpoint})` : (row.receiver ? JSON.stringify(row.receiver) : '-')}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>중복 제거 키 (Dedup Key)</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', wordBreak: 'break-all' }}>
                      {row.dedup_key}
                    </Typography>
                  </Box>

                  {row.error_message && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'error.lighter', borderRadius: 1, border: '1px solid', borderColor: 'error.light' }}>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>DELIVERY ERROR</Typography>
                      <Typography variant="body2" color="error.main">{row.error_message}</Typography>
                    </Box>
                  )}
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box sx={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    FULL AUDIT PAYLOAD (Evidence)
                  </Typography>
                  <Box 
                    sx={{ 
                      flexGrow: 1, 
                      bgcolor: '#1e1e1e', 
                      color: '#9cdcfe', 
                      p: 2, 
                      borderRadius: 1, 
                      overflow: 'auto',
                      maxHeight: 450,
                      fontFamily: '"Fira Code", "Cascadia Code", monospace',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      '&::-webkit-scrollbar': { width: 8 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: '#333', borderRadius: 4 }
                    }}
                  >
                    <pre style={{ margin: 0 }}>{auditJson}</pre>
                  </Box>
                </Box>
              </Box>
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
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguageStore();

  const [fromValue, setFromValue] = useState<number | null>(15);
  const [fromUnit, setFromUnit] = useState("m");
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState("m");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [language]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const data = await notificationService.getNotifications(skip, rowsPerPage);
      setNotifications(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (status: string) => {
    const color = status === 'sent' || status === 'success' ? 'success' : 
                  status === 'error' || status === 'failed' ? 'error' : 'default';
    return <Chip label={status.toUpperCase()} color={color} size="small" variant="outlined" sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
  };

  const getSeverityChip = (severity: string | null) => {
    if (!severity) return '-';
    let color: "error" | "warning" | "info" | "success" | "default" = "default";
    switch (severity.toLowerCase()) {
      case 'critical': color = "error"; break;
      case 'high': color = "warning"; break;
      case 'medium': color = "info"; break;
      case 'low': color = "success"; break;
    }
    return <Chip label={severity.toUpperCase()} color={color} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />;
  };

  const filteredLogs = notifications.filter(log =>
    log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <ControlBar 
        t={t}
        fromValue={fromValue} fromUnit={fromUnit}
        toValue={toValue} toUnit={toUnit}
        fromDate={fromDate} toDate={toDate}
        onTimeChange={(fV, fU, tV, tU, fD, tD) => {
          setFromValue(fV); setFromUnit(fU); setToValue(tV); setToUnit(tU);
          setFromDate(fD); setToDate(tD);
        }}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onRefresh={() => { setPage(0); loadNotifications(); }}
      />

      <Paper elevation={1} sx={{ p: 3, height: 'calc(100% - 100px)', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('notificationHistory')}</Typography>
            <Chip label={`${total} 건`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
          <IconButton size="small" onClick={() => { setPage(0); loadNotifications(); }} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ mb: 1 }} />

        <TableContainer sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          // 페이지네이션 공간 확보
          minHeight: 0,
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 4 }
        }}>
          <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell width={50} sx={{ bgcolor: 'background.paper', zIndex: 3 }} />
                <TableCell width={180} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>{t('createdAt')}</TableCell>
                <TableCell width={100} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>{t('severity')}</TableCell>
                <TableCell width={250} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>{t('name')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>{t('ruleDescription', { fallback: '메시지' })}</TableCell>
                <TableCell width={120} align="center" sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>{t('status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                    {loading ? '데이터를 불러오는 중...' : '알림 내역이 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((row) => (
                  <NotificationRow 
                    key={row.id} 
                    row={row} 
                    t={t} 
                    getStatusChip={getStatusChip} 
                    getSeverityChip={getSeverityChip} 
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('rowsPerPage', { fallback: '페이지당 행 수:' })}
          sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        />
      </Paper>
    </Box>
  );
};

export default NotificationHistoryTab;
