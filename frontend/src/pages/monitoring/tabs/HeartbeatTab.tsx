import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton, CircularProgress, Alert, TextField,
  InputAdornment,
} from '@mui/material';
import {
  Favorite as HeartbeatIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as UpIcon,
  ErrorOutline as DownIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';
import api from '../../../services/api';
import dayjs from 'dayjs';

type MonitorType = 'all' | 'http' | 'tcp' | 'cert';

interface HeartbeatMonitor {
  id: string;
  name: string;
  type: string;
  scheme: string | null;
  status: string;
  url: string;
  domain: string | null;
  port: number | null;
  duration_us: number | null;
  tcp_rtt_us: number | null;
  http_rtt_us: number | null;
  timestamp: string;
  state_checks: number | null;
  state_up: number | null;
  state_down: number | null;
  http_status_code: number | null;
  tls_established: boolean | null;
  cert_not_after: string | null;
  cert_not_before: string | null;
  cert_subject: string | null;
  cert_cipher: string | null;
  cert_tls_version: string | null;
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
    up: { label: 'UP', color: 'success' },
    down: { label: 'DOWN', color: 'error' },
  };
  const cfg = map[status] ?? { label: status.toUpperCase(), color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const CertStatusChip: React.FC<{ daysLeft: number }> = ({ daysLeft }) => {
  if (daysLeft < 0) return <Chip label="만료" color="error" size="small" />;
  if (daysLeft <= 30) return <Chip label="임박" color="warning" size="small" />;
  return <Chip label="정상" color="success" size="small" />;
};

/** 마이크로초 → 사람이 읽기 쉬운 시간 */
const fmtUs = (us: number | null): string => {
  if (us === null || us === undefined) return '-';
  if (us < 1000) return `${us}µs`;
  if (us < 1_000_000) return `${(us / 1000).toFixed(1)}ms`;
  return `${(us / 1_000_000).toFixed(2)}s`;
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return '-';
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
};

const calcDaysLeft = (iso: string | null): number => {
  if (!iso) return 0;
  return dayjs(iso).diff(dayjs(), 'day');
};

/** 가용성 % 계산 (state.up / state.checks) */
const uptimePct = (up: number | null, checks: number | null): string => {
  if (up === null || checks === null || checks === 0) return '-';
  return `${((up / checks) * 100).toFixed(0)}%`;
};

const uptimeColor = (up: number | null, checks: number | null): string => {
  if (up === null || checks === null || checks === 0) return 'text.primary';
  const pct = (up / checks) * 100;
  if (pct >= 99) return 'success.main';
  if (pct >= 90) return 'warning.main';
  return 'error.main';
};

const HeartbeatTab: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<MonitorType>('all');
  const [monitors, setMonitors] = useState<HeartbeatMonitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/monitoring/heartbeat');
      setMonitors(res.data);
      setLastRefresh(dayjs().format('HH:mm:ss'));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 탭 + 검색어 필터링
  const filtered = monitors.filter((m) => {
    const byTab =
      tab === 'all' ? true :
      tab === 'http' ? m.type === 'http' :
      tab === 'tcp' ? m.type === 'tcp' :
      tab === 'cert' ? !!m.cert_not_after :
      true;

    if (!byTab) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.url.toLowerCase().includes(q) ||
        (m.domain ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const upCount = monitors.filter((m) => m.status === 'up').length;
  const downCount = monitors.filter((m) => m.status === 'down').length;

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <HeartbeatIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>{t('heartbeatMenu')}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {lastRefresh && (
          <Typography variant="caption" color="text.secondary">
            {lastRefresh} {t('lastChecked')}
          </Typography>
        )}
        <Tooltip title={t('refresh')}>
          <span>
            <IconButton size="small" onClick={fetchData} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('heartbeatDesc')}
      </Typography>

      {/* 요약 통계 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 110, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">{t('total')}</Typography>
          <Typography variant="h5" fontWeight={700}>{monitors.length}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 110, textAlign: 'center' }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <UpIcon color="success" fontSize="small" />
            <Typography variant="caption" color="success.main">UP</Typography>
          </Stack>
          <Typography variant="h5" fontWeight={700} color="success.main">{upCount}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 110, textAlign: 'center' }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <DownIcon color="error" fontSize="small" />
            <Typography variant="caption" color="error.main">DOWN</Typography>
          </Stack>
          <Typography variant="h5" fontWeight={700} color="error.main">{downCount}</Typography>
        </Paper>
      </Stack>

      {/* 타입 탭 + 검색바 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          size="small"
        >
          <ToggleButton value="all">{t('all')}</ToggleButton>
          <ToggleButton value="http">HTTP</ToggleButton>
          <ToggleButton value="tcp">TCP</ToggleButton>
          <ToggleButton value="cert">{t('heartbeatCert')}</ToggleButton>
        </ToggleButtonGroup>

        {/* 검색바 — 클라이언트 인메모리 필터 */}
        <TextField
          size="small"
          placeholder={t('heartbeatSearchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* HTTP / TCP / 전체 테이블 */}
      {tab !== 'cert' && (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('monitorName')}</TableCell>
                  <TableCell>URL / Host</TableCell>
                  <TableCell align="center">{t('type')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                  {tab !== 'tcp' && <TableCell align="center">HTTP Status</TableCell>}
                  <TableCell align="center">{t('latency')}</TableCell>
                  <TableCell align="center">{t('uptime')}</TableCell>
                  <TableCell align="center">{t('lastChecked')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => {
                  // RTT 우선순위: HTTP는 http_rtt_us, TCP는 tcp_rtt_us, 없으면 duration_us
                  const rtt = m.type === 'http' ? (m.http_rtt_us ?? m.duration_us)
                            : m.type === 'tcp'  ? (m.tcp_rtt_us ?? m.duration_us)
                            : m.duration_us;
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{m.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                        {m.url || `${m.domain}:${m.port}`}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={m.scheme ? m.scheme.toUpperCase() : m.type.toUpperCase()}
                          size="small"
                          variant="outlined"
                          color={m.scheme === 'https' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center"><StatusChip status={m.status} /></TableCell>
                      {tab !== 'tcp' && (
                        <TableCell align="center">
                          {m.http_status_code ? (
                            <Chip
                              label={m.http_status_code}
                              size="small"
                              color={m.http_status_code < 400 ? 'success' : 'error'}
                              variant="outlined"
                            />
                          ) : '-'}
                        </TableCell>
                      )}
                      <TableCell align="center">{fmtUs(rtt)}</TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, color: uptimeColor(m.state_up, m.state_checks) }}
                      >
                        {uptimePct(m.state_up, m.state_checks)}
                        {m.state_checks !== null && (
                          <Typography variant="caption" color="text.disabled" display="block">
                            {m.state_up}/{m.state_checks}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.78rem' }}>
                        {fmtDate(m.timestamp)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* SSL 인증서 탭 */}
      {tab === 'cert' && (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('monitorName')}</TableCell>
                  <TableCell>Host</TableCell>
                  <TableCell>{t('certSubject')}</TableCell>
                  <TableCell align="center">TLS</TableCell>
                  <TableCell align="center">{t('certExpires')}</TableCell>
                  <TableCell align="center">{t('certDaysLeft')}</TableCell>
                  <TableCell align="center">{t('uptime')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((m) => {
                  const dl = calcDaysLeft(m.cert_not_after);
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{m.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                        {m.domain}{m.port ? `:${m.port}` : ''}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{m.cert_subject ?? '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={m.cert_tls_version ?? 'TLS'}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.8rem' }}>
                        {m.cert_not_after ? dayjs(m.cert_not_after).format('YYYY-MM-DD') : '-'}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 600,
                          color: dl < 0 ? 'error.main' : dl <= 30 ? 'warning.main' : 'text.primary',
                        }}
                      >
                        {dl < 0 ? `${Math.abs(dl)}일 초과` : `D-${dl}`}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, color: uptimeColor(m.state_up, m.state_checks) }}
                      >
                        {uptimePct(m.state_up, m.state_checks)}
                      </TableCell>
                      <TableCell align="center"><CertStatusChip daysLeft={dl} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default HeartbeatTab;
