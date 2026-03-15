import React, { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Divider, Button, TextField,
  InputAdornment, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Select, MenuItem, Switch,
  FormControlLabel, IconButton, Tooltip, TablePagination,
} from '@mui/material';
import {
  Rule as RuleIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  ConstructionOutlined as ConstructionIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';

// ── 목업 데이터 ──────────────────────────────────────────────────────────────
type Severity = 'critical' | 'high' | 'medium' | 'low';
type RuleType = 'eql' | 'query' | 'threshold' | 'ml';

interface DetectionRule {
  id: number;
  name: string;
  desc: string;
  severity: Severity;
  riskScore: number;
  type: RuleType;
  mitre: string[];
  enabled: boolean;
  alerts: number;
  lastTriggered: string;
}

const MOCK_RULES: DetectionRule[] = [
  {
    id: 1,
    name: 'PowerShell Encoded Command Execution',
    desc: 'Detects execution of PowerShell with encoded command-line arguments that may indicate obfuscation.',
    severity: 'critical', riskScore: 99, type: 'eql',
    mitre: ['T1059.001', 'T1027'], enabled: true, alerts: 42, lastTriggered: '2분 전',
  },
  {
    id: 2,
    name: 'Suspicious Cmd.exe Spawned by Unusual Parent',
    desc: 'Detects cmd.exe processes spawned by unusual parent processes such as Office applications.',
    severity: 'high', riskScore: 73, type: 'eql',
    mitre: ['T1059.003', 'T1566'], enabled: true, alerts: 17, lastTriggered: '15분 전',
  },
  {
    id: 3,
    name: 'Credential Dump via LSASS Memory Access',
    desc: 'Detects access to LSASS memory, which is commonly used in credential dumping attacks.',
    severity: 'critical', riskScore: 99, type: 'eql',
    mitre: ['T1003.001'], enabled: true, alerts: 3, lastTriggered: '1시간 전',
  },
  {
    id: 4,
    name: 'Registry Run Key Persistence',
    desc: 'Detects modification of HKCU/HKLM Run keys for establishing persistent execution.',
    severity: 'medium', riskScore: 47, type: 'query',
    mitre: ['T1547.001'], enabled: true, alerts: 8, lastTriggered: '30분 전',
  },
  {
    id: 5,
    name: 'Lateral Movement via PsExec',
    desc: 'Detects usage of PsExec or PsExec-like tools to execute commands on remote systems.',
    severity: 'high', riskScore: 75, type: 'eql',
    mitre: ['T1570', 'T1021.002'], enabled: true, alerts: 1, lastTriggered: '2시간 전',
  },
  {
    id: 6,
    name: 'Network Port Scanning (Threshold)',
    desc: 'Detects network scanning activity by counting outbound connection attempts within a time window.',
    severity: 'medium', riskScore: 47, type: 'threshold',
    mitre: ['T1046'], enabled: false, alerts: 0, lastTriggered: '-',
  },
  {
    id: 7,
    name: 'Anomalous Outbound Network Traffic (ML)',
    desc: 'Machine learning model detects anomalous outbound network patterns compared to baseline.',
    severity: 'high', riskScore: 77, type: 'ml',
    mitre: ['T1071', 'T1041'], enabled: true, alerts: 5, lastTriggered: '45분 전',
  },
  {
    id: 8,
    name: 'Suspicious Browser Extension Installation',
    desc: 'Detects suspicious browser extension files written to disk that may indicate adware or spyware.',
    severity: 'low', riskScore: 21, type: 'query',
    mitre: ['T1176'], enabled: false, alerts: 0, lastTriggered: '-',
  },
];

// ── 색상/스타일 헬퍼 ─────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<Severity, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high:     'warning',
  medium:   'info',
  low:      'default',
};
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};
const TYPE_LABEL: Record<RuleType, string> = {
  eql: 'EQL', query: 'Query', threshold: 'Threshold', ml: 'ML',
};
const TYPE_COLOR: Record<RuleType, 'secondary' | 'default' | 'primary' | 'success'> = {
  eql: 'secondary', query: 'default', threshold: 'primary', ml: 'success',
};
const RISK_COLOR = (score: number) => {
  if (score >= 75) return 'error.main';
  if (score >= 50) return 'warning.main';
  return 'text.secondary';
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
const DetectionRuleTab: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const filtered = MOCK_RULES.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter === 'enabled' && !r.enabled) return false;
    if (statusFilter === 'disabled' && r.enabled) return false;
    return true;
  });

  const totalEnabled  = MOCK_RULES.filter(r => r.enabled).length;
  const totalAlerts   = MOCK_RULES.reduce((s, r) => s + r.alerts, 0);

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* 헤더 */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <RuleIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>{t('detectionRules')}</Typography>
            <Chip label={t('heartbeatBeta')} size="small" variant="outlined" color="warning" icon={<ConstructionIcon />} />
          </Stack>
          <Button variant="contained" color="secondary" size="small" startIcon={<AddIcon />} disabled>
            {t('createRule')}
          </Button>
        </Stack>

        {/* 요약 통계 */}
        <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.disabled">{t('totalRules')}</Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1}>{MOCK_RULES.length}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" color="text.disabled">{t('enabledRules')}</Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1} color="success.main">{totalEnabled}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" color="text.disabled">{t('totalAlerts')}</Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1} color="error.main">{totalAlerts}</Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />

      {/* 필터 바 */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <FilterIcon fontSize="small" color="action" />
          <TextField
            size="small" placeholder={`${t('search')} 룰 이름…`}
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 260 }}
          />
          <Select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="all">모든 심각도</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="all">모든 타입</MenuItem>
            <MenuItem value="eql">EQL</MenuItem>
            <MenuItem value="query">Query</MenuItem>
            <MenuItem value="threshold">Threshold</MenuItem>
            <MenuItem value="ml">ML</MenuItem>
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="all">전체 상태</MenuItem>
            <MenuItem value="enabled">활성화</MenuItem>
            <MenuItem value="disabled">비활성화</MenuItem>
          </Select>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.disabled">
            {filtered.length}개 룰
          </Typography>
        </Stack>
      </Box>

      {/* 룰 테이블 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TableContainer component={Box}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 320 }}>룰 이름</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>심각도</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>위험점수</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>타입</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>MITRE ATT&CK</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>알림</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>마지막 탐지</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>활성화</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((rule) => (
                <TableRow key={rule.id} hover>
                  {/* 룰 이름 + 설명 */}
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                      {rule.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{
                      display: '-webkit-box', WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {rule.desc}
                    </Typography>
                  </TableCell>
                  {/* 심각도 */}
                  <TableCell align="center">
                    <Chip
                      label={SEVERITY_LABEL[rule.severity]}
                      color={SEVERITY_COLOR[rule.severity]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {/* 위험 점수 */}
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={700} sx={{ color: RISK_COLOR(rule.riskScore) }}>
                      {rule.riskScore}
                    </Typography>
                  </TableCell>
                  {/* 타입 */}
                  <TableCell align="center">
                    <Chip
                      label={TYPE_LABEL[rule.type]}
                      color={TYPE_COLOR[rule.type]}
                      size="small"
                    />
                  </TableCell>
                  {/* MITRE */}
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {rule.mitre.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20 }} />
                      ))}
                    </Stack>
                  </TableCell>
                  {/* 알림 수 */}
                  <TableCell align="center">
                    <Typography
                      variant="body2" fontWeight={700}
                      color={rule.alerts > 0 ? 'error.main' : 'text.disabled'}
                    >
                      {rule.alerts > 0 ? rule.alerts : '-'}
                    </Typography>
                  </TableCell>
                  {/* 마지막 탐지 */}
                  <TableCell>
                    <Typography variant="caption" color={rule.lastTriggered === '-' ? 'text.disabled' : 'text.primary'}>
                      {rule.lastTriggered}
                    </Typography>
                  </TableCell>
                  {/* 활성화 토글 */}
                  <TableCell align="center">
                    <Switch size="small" checked={rule.enabled} disabled />
                  </TableCell>
                  {/* 작업 */}
                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center">
                      <Tooltip title="편집"><IconButton size="small" disabled><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="복제"><IconButton size="small" disabled><DuplicateIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="삭제"><IconButton size="small" disabled><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPageOptions={[10]}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
      />
    </Box>
  );
};

export default DetectionRuleTab;
