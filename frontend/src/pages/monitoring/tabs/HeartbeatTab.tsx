import React from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Language as HttpIcon,
  Router as TcpIcon,
  VerifiedUser as CertIcon,
  ConstructionOutlined as ConstructionIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';

interface HeartbeatTabProps {
  monitorType?: 'http' | 'tcp' | 'cert';
}

const MOCK_HTTP = [
  { name: 'API Gateway', url: 'https://api.example.com/health', status: 'up', latency: '42ms', checked: '1분 전' },
  { name: 'Web Frontend', url: 'https://www.example.com', status: 'up', latency: '61ms', checked: '1분 전' },
  { name: 'Auth Service', url: 'https://auth.example.com/ping', status: 'down', latency: '-', checked: '2분 전' },
];
const MOCK_TCP = [
  { name: 'OpenSearch', host: '10.0.0.1:9200', status: 'up', latency: '3ms', checked: '1분 전' },
  { name: 'Kafka Broker', host: '10.0.0.2:9092', status: 'up', latency: '5ms', checked: '1분 전' },
  { name: 'Redis', host: '10.0.0.3:6379', status: 'up', latency: '1ms', checked: '2분 전' },
];
const MOCK_CERT = [
  { name: 'API Gateway', host: 'api.example.com', expires: '2026-09-01', daysLeft: 170, status: 'ok' },
  { name: 'Web Frontend', host: 'www.example.com', expires: '2025-12-01', daysLeft: 14, status: 'warning' },
  { name: 'Auth Service', host: 'auth.example.com', expires: '2025-11-20', daysLeft: -5, status: 'expired' },
];

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
    up: { label: 'UP', color: 'success' },
    down: { label: 'DOWN', color: 'error' },
    ok: { label: '정상', color: 'success' },
    warning: { label: '임박', color: 'warning' },
    expired: { label: '만료', color: 'error' },
  };
  const cfg = map[status] ?? { label: status, color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const HeartbeatTab: React.FC<HeartbeatTabProps> = ({ monitorType = 'http' }) => {
  const { t } = useTranslation();

  const config = {
    http: {
      icon: <HttpIcon color="primary" />,
      title: t('heartbeatHttp'),
      description: t('heartbeatHttpDesc'),
    },
    tcp: {
      icon: <TcpIcon color="primary" />,
      title: t('heartbeatTcp'),
      description: t('heartbeatTcpDesc'),
    },
    cert: {
      icon: <CertIcon color="primary" />,
      title: t('heartbeatCert'),
      description: t('heartbeatCertDesc'),
    },
  }[monitorType];

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        {config.icon}
        <Typography variant="h5" fontWeight={600}>{config.title}</Typography>
        <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {config.description}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* HTTP 목록 */}
      {monitorType === 'http' && (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('monitorName')}</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                  <TableCell align="center">{t('latency')}</TableCell>
                  <TableCell align="center">{t('lastChecked')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_HTTP.map((row) => (
                  <TableRow key={row.name} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>{row.url}</TableCell>
                    <TableCell align="center"><StatusChip status={row.status} /></TableCell>
                    <TableCell align="center">{row.latency}</TableCell>
                    <TableCell align="center">{row.checked}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* TCP 목록 */}
      {monitorType === 'tcp' && (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('monitorName')}</TableCell>
                  <TableCell>Host</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                  <TableCell align="center">{t('latency')}</TableCell>
                  <TableCell align="center">{t('lastChecked')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_TCP.map((row) => (
                  <TableRow key={row.name} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>{row.host}</TableCell>
                    <TableCell align="center"><StatusChip status={row.status} /></TableCell>
                    <TableCell align="center">{row.latency}</TableCell>
                    <TableCell align="center">{row.checked}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* SSL/TLS 인증서 목록 */}
      {monitorType === 'cert' && (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('monitorName')}</TableCell>
                  <TableCell>Host</TableCell>
                  <TableCell align="center">{t('certExpires')}</TableCell>
                  <TableCell align="center">{t('certDaysLeft')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_CERT.map((row) => (
                  <TableRow key={row.name} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>{row.host}</TableCell>
                    <TableCell align="center">{row.expires}</TableCell>
                    <TableCell align="center"
                      sx={{ color: row.daysLeft < 0 ? 'error.main' : row.daysLeft < 30 ? 'warning.main' : 'text.primary', fontWeight: 500 }}>
                      {row.daysLeft < 0 ? `${Math.abs(row.daysLeft)}일 초과` : `D-${row.daysLeft}`}
                    </TableCell>
                    <TableCell align="center"><StatusChip status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default HeartbeatTab;
