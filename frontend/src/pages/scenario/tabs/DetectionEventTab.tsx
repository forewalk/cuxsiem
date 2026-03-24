import type { Finding } from '@/types';
import { formatKST } from '@/utils/dateUtils';
import {
  CheckCircle as AckIcon,
  ExpandMore as ExpandIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { detectorService } from '../../../services/detectionPolicyService';

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default' | 'success'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
  informational: 'default',
};

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  new: 'default',
  acknowledged: 'primary',
  resolved: 'success',
  false_positive: 'warning',
};

const DetectionEventTab: React.FC = () => {
  const { t } = useTranslation();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        sort_by: 'created_at',
        order: 'desc',
      };
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const result = await detectorService.listFindings(params as any);
      setFindings(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message || 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, severityFilter, statusFilter]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleStatusChange = async (findingId: string, newStatus: string) => {
    setUpdatingStatus(findingId);
    try {
      await detectorService.updateFindingStatus(findingId, newStatus);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f)),
      );
    } catch {
      /* ignore */
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatTime = (ts?: string) => formatKST(ts);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('detectionEvents')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value="all">{t('allSeverities')}</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value="all">{t('allStatuses')}</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="acknowledged">Acknowledged</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="false_positive">False Positive</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={t('refresh')}>
            <IconButton size="small" onClick={fetchFindings} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Table */}
      <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ flex: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width={32} />
                <TableCell sx={{ fontWeight: 700 }}>{t('deTime')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('deSeverity')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('deRuleName')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('deDetector')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">{t('deMatched')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('deStatus')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} width={40} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && findings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : findings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">{t('deNoFindings')}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                findings.map((f) => (
                  <React.Fragment key={f.id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer', '& > td': { borderBottom: expandedRow === f.id ? 0 : undefined } }}
                      onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                    >
                      <TableCell sx={{ px: 0.5 }}>
                        <ExpandIcon
                          fontSize="small"
                          sx={{
                            transform: expandedRow === f.id ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatTime(f.created_at)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={f.severity}
                          color={SEVERITY_COLOR[f.severity] || 'default'}
                          size="small"
                          variant="filled"
                          sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', maxWidth: 280 }}>
                        <Typography variant="body2" noWrap title={f.rule_name}>
                          {f.rule_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={f.detector_name}>
                          {f.detector_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={f.matched_count} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={f.status}
                          color={STATUS_COLOR[f.status] || 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ px: 0.5 }}>
                        {f.status === 'new' && (
                          <Tooltip title={t('deAcknowledge')}>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(f.id, 'acknowledged'); }}
                              disabled={updatingStatus === f.id}
                            >
                              {updatingStatus === f.id ? <CircularProgress size={14} /> : <AckIcon fontSize="small" color="primary" />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
                        <Collapse in={expandedRow === f.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                            {/* Message */}
                            {f.message && (
                              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                                {f.message}
                              </Typography>
                            )}

                            {/* MITRE */}
                            {(f.mitre_technique_ids?.length > 0 || f.mitre_tactic_ids?.length > 0) && (
                              <Box sx={{ mb: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {f.mitre_tactic_ids?.map((t) => (
                                  <Chip key={`tac-${t}`} label={`Tactic: ${t}`} size="small" variant="outlined" color="secondary" />
                                ))}
                                {f.mitre_technique_ids?.map((t) => (
                                  <Chip key={`tech-${t}`} label={t} size="small" variant="outlined" color="info" />
                                ))}
                              </Box>
                            )}

                            {/* Sample events */}
                            {f.sample_events?.length > 0 && (
                              <Box>
                                <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
                                  {t('deSampleEvents')} ({f.sample_events.length})
                                </Typography>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    maxHeight: 240,
                                    overflow: 'auto',
                                    bgcolor: 'background.default',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {JSON.stringify(f.sample_events, null, 2)}
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage={t('rowsPerPage')}
          sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
        />
      </Paper>
    </Box>
  );
};

export default DetectionEventTab;
