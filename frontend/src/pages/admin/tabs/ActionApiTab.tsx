import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import ActionService from '../../../services/ActionService';
import type { Action, ActionCreate } from '../../../services/ActionService';
import { useTranslation } from '../../../hooks/useTranslation';

const ActionApiTab: React.FC = () => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [open, setOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [headerText, setHeaderText] = useState('');
  const [formData, setFormData] = useState<ActionCreate>({
    name: '',
    description: '',
    target_host: { url: '', port: 80, path: '/' },
    action_logic: { dsl: '', type: 'POST' },
    headers: {}
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const data = await ActionService.getActions(skip, rowsPerPage);
      setActions(data);
      setTotal(data.length);
    } catch (error) {
      console.error('Failed to load actions:', error);
      setSnackbar({ open: true, message: t('loadDataFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, t]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleOpenDialog = (action: Action | null = null) => {
    if (action) {
      setEditingAction(action);
      setFormData({
        name: action.name,
        description: action.description || '',
        target_host: { ...action.target_host },
        action_logic: { ...action.action_logic },
        headers: action.headers || {}
      });
      setHeaderText(JSON.stringify(action.headers || {}, null, 2));
    } else {
      setEditingAction(null);
      setFormData({
        name: '',
        description: '',
        target_host: { url: '', port: 80, path: '/' },
        action_logic: { dsl: '', type: 'POST' },
        headers: {}
      });
      setHeaderText('{\n  "Content-Type": "application/json"\n}');
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingAction(null);
    setHeaderText('');
  };

  const handleSubmit = async () => {
    try {
      let parsedHeaders = {};
      if (headerText.trim()) {
        try {
          parsedHeaders = JSON.parse(headerText);
        } catch (e) {
          setSnackbar({ open: true, message: t('invalidJsonHeader') || 'Invalid JSON Header', severity: 'error' });
          return;
        }
      }

      const submissionData = { ...formData, headers: parsedHeaders };

      if (editingAction) {
        await ActionService.updateAction(editingAction.id, submissionData);
      } else {
        await ActionService.createAction(submissionData);
      }
      setSnackbar({ open: true, message: t('apiSaveSuccess'), severity: 'success' });
      handleCloseDialog();
      loadActions();
    } catch (error) {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await ActionService.deleteAction(deleteId);
      setSnackbar({ open: true, message: t('apiDeleteSuccess'), severity: 'success' });
      setDeleteId(null);
      loadActions();
    } catch {
      setSnackbar({ open: true, message: t('deleteFailed'), severity: 'error' });
    }
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('apiMgmtMenu')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadActions()}>
            {t('refresh')}
          </Button>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('addApi')}
          </Button>
        </Stack>
      </Stack>

      <Paper elevation={1} sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('apiName')}</TableCell>
                <TableCell>{t('apiUrl')}</TableCell>
                <TableCell align="center">{t('apiPort')}</TableCell>
                <TableCell align="center">{t('apiType')}</TableCell>
                <TableCell align="center">{t('createdAt')}</TableCell>
                <TableCell align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {actions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                    {loading ? t('loading') : t('noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                actions.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.target_host.url}</TableCell>
                    <TableCell align="center">{row.target_host.port}</TableCell>
                    <TableCell align="center">
                      <Chip label={row.action_logic.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      {dayjs(row.created_at).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton size="small" onClick={() => handleOpenDialog(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAction ? t('editApi') : t('addApi')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label={t('apiName')}
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label={t('description')}
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label={t('apiUrl')}
                fullWidth
                placeholder="http://1.1.1.1"
                value={formData.target_host.url}
                onChange={(e) => setFormData({ ...formData, target_host: { ...formData.target_host, url: e.target.value } })}
              />
              <TextField
                label={t('apiPort')}
                type="number"
                sx={{ width: 120 }}
                value={formData.target_host.port}
                onChange={(e) => setFormData({ ...formData, target_host: { ...formData.target_host, port: parseInt(e.target.value) } })}
              />
            </Stack>
            <TextField
              label={t('apiPath')}
              fullWidth
              placeholder="/api/v1/alert"
              value={formData.target_host.path}
              onChange={(e) => setFormData({ ...formData, target_host: { ...formData.target_host, path: e.target.value } })}
            />
            <TextField
              label={t('apiHeaders') || 'Headers (JSON)'}
              fullWidth
              multiline
              rows={3}
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              helperText="JSON format for HTTP headers"
            />
            <TextField
              label={t('apiDsl')}
              fullWidth
              multiline
              rows={4}
              value={formData.action_logic.dsl}
              onChange={(e) => setFormData({ ...formData, action_logic: { ...formData.action_logic, dsl: e.target.value } })}
              placeholder='{"action": "block", "target": "{{source_ip}}"}'
              helperText="Use {{field}} for template"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button variant="contained" color="secondary" onClick={handleSubmit}>{t('save')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('deleteApi')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmDelete')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteId(null)}>{t('cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('delete')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ActionApiTab;
