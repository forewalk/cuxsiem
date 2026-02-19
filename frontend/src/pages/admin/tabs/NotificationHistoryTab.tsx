import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Divider, LinearProgress, Chip,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Collapse, TablePagination, Snackbar, Alert
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Terminal as TerminalIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Hub as HubIcon
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

// 행 컴포넌트
const NotificationRow: React.FC<{ 
  row: NotificationHistory, 
  getSeverityChip: (s: string | null) => React.ReactNode
}> = ({ row, getSeverityChip }) => {
  const [open, setOpen] = useState(false);

  // curl 커맨드라인 생성 (역슬래시 오류 방지를 위해 일반 문자열 결합 방식 사용)
  const endpoint = row.endpoint || "/api/v1/notifications/send";
  const curlCommand = "$ curl -X POST \"" + endpoint + "\" -H \"Content-Type: application/json\" -d '{\"rule_id\": \"" + row.rule_id + "\", ...}'";

  return (
    <React.Fragment>
      <TableRow 
        hover 
        onClick={() => setOpen(!open)}
        sx={{ 
          cursor: 'pointer',
          '& > td': { borderBottom: open ? 'none' : undefined },
          bgcolor: open ? 'action.selected' : 'inherit'
        }}
      >
        <TableCell width={50}>
          <IconButton size="small">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell width={200}>
          {dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </TableCell>
        <TableCell width={120}>
          {getSeverityChip(row.severity)}
        </TableCell>
        <TableCell sx={{ fontWeight: 'bold' }}>
          {row.title}
        </TableCell>
        <TableCell width={200}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HubIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {row.channel ? row.channel.toUpperCase() : 'WEBHOOK'}
            </Typography>
          </Stack>
        </TableCell>
      </TableRow>
      
      <TableRow sx={{ '& > td': { p: 0, borderBottom: open ? undefined : 'none' } }}>
        <TableCell colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 4, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              {/* 좌우 배치를 위한 Flex 컨테이너 (Stack 사용) */}
              <Stack direction="row" spacing={4} sx={{ alignItems: 'flex-start' }}>
                
                {/* 좌측: 규칙 및 전송 정보 (비중 4) */}
                <Box sx={{ flex: 4, minWidth: 0 }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>규칙명</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{row.title}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>규칙 설명</Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', minHeight: '3em' }}>
                        {row.description || '설명이 없습니다.'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>전송 채널</Typography>
                      <Chip 
                        label={row.channel ? row.channel.toUpperCase() + " (" + (row.endpoint || 'N/A') + ")" : 'WEBHOOK'} 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>커맨드라인 (Replay Command)</Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          bgcolor: '#1e1e1e', 
                          color: '#d4d4d4', 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          position: 'relative',
                          border: 'none',
                          overflowX: 'auto'
                        }}
                      >
                        <TerminalIcon sx={{ fontSize: 14, color: '#4cc38a', position: 'absolute', top: 8, left: 8 }} />
                        <Box sx={{ pl: 3, whiteSpace: 'nowrap' }}>{curlCommand}</Box>
                      </Paper>
                    </Box>
                  </Stack>
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* 우측: 출력 예시 (JSON Audit) (비중 6) */}
                <Box sx={{ flex: 6, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                    출력 예시 (Full Audit Payload)
                  </Typography>
                  <Box 
                    sx={{ 
                      bgcolor: '#1e1e1e', 
                      color: '#9cdcfe', 
                      p: 2, 
                      borderRadius: 1, 
                      overflow: 'auto', // 내부 스크롤 보장
                      height: 400,      // 고정 높이로 스크롤 유도
                      fontFamily: '"Fira Code", "Cascadia Code", monospace',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&::-webkit-scrollbar': { width: 8, height: 8 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: '#333', borderRadius: 4 }
                    }}
                  >
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify({
                        audit: {
                          id: row.id,
                          rule_id: row.rule_id,
                          created_at: row.created_at,
                          status: row.status,
                          error: row.error_message
                        },
                        request: {
                          endpoint: row.endpoint,
                          headers: row.request_headers,
                          payload: row.outgoing_payload
                        },
                        response: {
                          code: row.response_status_code,
                          body: row.response_body
                        }
                      }, null, 2)}
                    </pre>
                  </Box>
                </Box>
              </Stack>
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
  
  // 신규 알림 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; title: string; severity: string }>({
    open: false, title: '', severity: 'info'
  });
  const lastIdRef = useRef<string | null>(null);

  const loadNotifications = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const data = await notificationService.getNotifications(skip, rowsPerPage);
      
      // 신규 알림 감지 로직 (페이지가 0일 때만)
      if (data.items.length > 0 && page === 0) {
        const latestNotif = data.items[0];
        if (lastIdRef.current && latestNotif.id !== lastIdRef.current) {
          setSnackbar({
            open: true,
            title: latestNotif.title,
            severity: latestNotif.severity || 'info'
          });
        }
        lastIdRef.current = latestNotif.id;
      }

      setNotifications(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 10초 주기 폴링 설정
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const getSeverityChip = (severity: string | null) => {
    if (!severity) return '-';
    let color: "info" | "warning" | "error" | "default" = "default";
    switch (severity.toLowerCase()) {
      case 'info': color = "info"; break;
      case 'warning': color = "warning"; break;
      case 'error': color = "error"; break;
    }
    return <Chip label={severity.toUpperCase()} color={color} size="small" variant="outlined" sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }} />;
  };

  const getAlertColor = (severity: string): "info" | "warning" | "error" | "success" => {
    switch (severity.toLowerCase()) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const filteredLogs = notifications.filter(log =>
    log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
      
      <ControlBar 
        t={t}
        fromValue={null} fromUnit="m" toValue={null} toUnit="m" fromDate={null} toDate={null}
        onTimeChange={() => {}}
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

        <TableContainer sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
          <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell width={50} sx={{ bgcolor: 'background.paper', zIndex: 3 }} />
                <TableCell width={200} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>발생일</TableCell>
                <TableCell width={120} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>중요도</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>규칙명</TableCell>
                <TableCell width={200} sx={{ fontWeight: 'bold', bgcolor: 'background.paper', zIndex: 3 }}>전송채널</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.disabled' }}>{loading ? '로딩 중...' : '알림 내역이 없습니다.'}</TableCell></TableRow>
              ) : (
                filteredLogs.map((row) => (
                  <NotificationRow 
                    key={row.id} 
                    row={row} 
                    getSeverityChip={getSeverityChip} 
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={total} rowsPerPage={rowsPerPage} page={page}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        />
      </Paper>

      {/* 우측 하단 실시간 알림 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={getAlertColor(snackbar.severity)}
          variant="filled"
          sx={{ width: '100%', boxShadow: 3 }}
        >
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', opacity: 0.9 }}>
            {snackbar.severity.toUpperCase()}
          </Typography>
          <Typography variant="body2">{snackbar.title}</Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationHistoryTab;
