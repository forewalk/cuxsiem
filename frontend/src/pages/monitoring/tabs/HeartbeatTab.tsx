import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton, Alert,
} from '@mui/material';
import {
  Favorite as HeartbeatIcon,
  CheckCircleOutline as UpIcon,
  ErrorOutline as DownIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import api from '../../../services/api';
import dayjs from 'dayjs';
import AlertsControlBar from '../../admin/alerts/components/AlertsControlBar';

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

const HeartbeatTab: React.FC = () => {
  const { t } = useTranslation();
  const { settings, fetchSettings } = useSettingsStore();

  const [tab, setTab] = useState<MonitorType>('all');
  const [monitors, setMonitors] = useState<HeartbeatMonitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // AlertsControlBar 상태 — NotificationHistoryTab과 동일 패턴
  const [searchQuery, setSearchQuery] = useState('');
  const [fromValue, setFromValue] = useState<number | null>(settings?.time_filter_duration ?? null);
  const [fromUnit, setFromUnit] = useState<string>(settings?.time_filter_unit ?? 'm');
  const [toValue, setToValue] = useState<number | null>(null);
  const [toUnit, setToUnit] = useState<string>('m');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from_date, to_date } = calculateTimeRange();
      const params: Record<string, string> = {};
      if (searchQuery) params.query = searchQuery;
      if (from_date) params.from_date = from_date;
      if (to_date) params.to_date = to_date;

      const res = await api.get('/api/v1/monitoring/heartbeat', { params });
      setMonitors(res.data);
      setLastUpdated(dayjs().format('HH:mm:ss'));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, calculateTimeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 타입 탭은 클라이언트 필터 (API 결과 내에서)
  const filtered = monitors.filter((m) =>
    tab === 'all' ? true :
    tab === 'http' ? m.type === 'http' :
    tab === 'tcp'  ? m.type === 'tcp' :
    tab === 'cert' ? !!m.cert_not_after :
    true
  );

  // 요약 카드는 필터링된 결과 기준
  const upCount = filtered.filter((m) => m.status === 'up').length;
  const downCount = filtered.filter((m) => m.status === 'down').length;

  // AlertsControlBar에 전달할 t — placeholder만 헬스체크용으로 오버라이드
  const controlBarT = (key: string, params?: Record<string, string>) => {
    if (key === 'alertSearchPlaceholder') return t('heartbeatSearchPlaceholder');
    return t(key, params);
  };

  return (
    <Box sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', bgcolor: 'background.default', overflow: 'hidden', p: { xs: 1.5, sm: 2, md: 3 }, minHeight: 0, position: 'relative' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

      {/* 검색 + 시간 필터 컨트롤바 */}
      <AlertsControlBar
        t={controlBarT}
        fromValue={fromValue}
        fromUnit={fromUnit}
        toValue={toValue}
        toUnit={toUnit}
        fromDate={fromDate}
        toDate={toDate}
        onTimeChange={(fv, fu, tv, tu, fd, td) => {
          setFromValue(fv); setFromUnit(fu); setToValue(tv); setToUnit(tu); setFromDate(fd); setToDate(td);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(q) => setSearchQuery(q)}
        onRefresh={fetchData}
        lastUpdated={lastUpdated}
      />

      <Box sx={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 1.5, mt: 1 }}>
        {/* 헤더 */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <HeartbeatIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600}>{t('heartbeatMenu')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('heartbeatDesc')}</Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ flexShrink: 0 }}>{error}</Alert>}

        {/* 요약 카드 */}
        <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, minWidth: 110, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('total')}</Typography>
            <Typography variant="h5" fontWeight={700}>{filtered.length}</Typography>
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

        {/* 타입 탭 */}
        <ToggleButtonGroup
          value={tab}
          exclusive
          onChange={(_, v) => v && setTab(v)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="all">{t('all')}</ToggleButton>
          <ToggleButton value="http">HTTP</ToggleButton>
          <ToggleButton value="tcp">TCP</ToggleButton>
          <ToggleButton value="cert">{t('heartbeatCert')}</ToggleButton>
        </ToggleButtonGroup>

        <Divider sx={{ flexShrink: 0 }} />

        {/* HTTP / TCP / 전체 테이블 */}
        {tab !== 'cert' && (
          <Paper variant="outlined" sx={{ flex: '1 1 0', minHeight: 0, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('monitorName')}</TableCell>
                    <TableCell>URL / Host</TableCell>
                    <TableCell align="center">{t('type')}</TableCell>
                    <TableCell align="center">{t('status')}</TableCell>
                    {tab !== 'tcp' && <TableCell align="center">HTTP Status</TableCell>}
                    <TableCell align="center">{t('latency')}</TableCell>
                    <TableCell align="center">{t('lastChecked')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((m) => {
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
          <Paper variant="outlined" sx={{ flex: '1 1 0', minHeight: 0, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('monitorName')}</TableCell>
                    <TableCell>Host</TableCell>
                    <TableCell>{t('certSubject')}</TableCell>
                    <TableCell align="center">TLS</TableCell>
                    <TableCell align="center">{t('certExpires')}</TableCell>
                    <TableCell align="center">{t('certDaysLeft')}</TableCell>
                    <TableCell align="center">{t('status')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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
                          <Chip label={m.cert_tls_version ?? 'TLS'} size="small" variant="outlined" color="info" />
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
    </Box>
  );
};

export default HeartbeatTab;
