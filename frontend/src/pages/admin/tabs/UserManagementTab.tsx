import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Stack, Alert, Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Divider, Chip
} from '@mui/material';
import OTPEnrollModal from '../../../components/auth/OTPEnrollModal';
import api from '../../../services/api';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, DeleteSweep as DeleteSweepIcon,
  People as PeopleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  LockReset as LockResetIcon,
} from '@mui/icons-material';
import { getOTPService } from '../../../services/otpService';
import dayjs from 'dayjs';
import { userService } from '../../../services/userService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useRoleCodesStore } from '../../../stores/useRoleCodesStore';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import type { User, UserCreate, UserUpdate } from '../../../types';
import { getRoleName } from '../../../utils/roleUtils';
import { ALERT_TABLE_STYLES } from '../alerts/components/AlertTableStyles';

const UserRow: React.FC<{
  row: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  roleNames: Record<string, string>;
  language: string;
  t: (k: string) => string;
  columnWidths: Record<string, number>;
}> = ({ row, onEdit, onDelete, roleNames, language, t, columnWidths }) => {
  return (
    <TableRow hover sx={ALERT_TABLE_STYLES.bodyRow}>
      <TableCell align="center" sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['id'] || 120 }}>
        {row.username || row.id}
      </TableCell>
      <TableCell align="center" sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['name'] || 100 }}>
        {row.name}
      </TableCell>
      <TableCell align="center" sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['email'] || 150 }}>
        {row.email}
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['role'] || 80 }} align="center">
        <Chip 
          label={getRoleName(row.role, roleNames, language)} 
          size="small" 
          variant="outlined"
          sx={{ fontSize: '0.75rem', height: 24 }}
        />
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['status'] || 80 }} align="center">
        <Box sx={{ color: row.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
          {row.is_active ? t('active') : t('inactive')}
        </Box>
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['otp'] || 60 }} align="center">
        <Box sx={{ color: row.otp_enabled ? 'success.main' : 'text.secondary', fontWeight: 'bold' }}>
          {row.otp_enabled ? t('active') : '-'}
        </Box>
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['lastLogin'] || 120 }} align="center">
        {row.last_login_at ? dayjs(row.last_login_at).format('YYYY-MM-DD HH:mm') : '-'}
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['createdAt'] || 120 }} align="center">
        {dayjs(row.created_at).format('YYYY-MM-DD HH:mm')}
      </TableCell>
      <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, width: columnWidths['actions'] || 100 }} align="center">
        <Stack direction="row" spacing={1} justifyContent="center">
          <IconButton size="small" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(row.id)}
            disabled={row.role === 'role-1'}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
};

const UserManagementTab: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState<number[]>([10, 25, 50]);

  // 정렬 상태
  const [sortModel, setSortModel] = useState<{ field: string; sort: 'asc' | 'desc' } | null>(null);

  // 너비 상태
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('userManagementColumnWidths');
    return saved ? JSON.parse(saved) : {};
  });

  const resizingRef = useRef<{ field: string, startX: number, startWidth: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      field,
      startX: e.clientX,
      startWidth: columnWidths[field] || (field === 'id' || field === 'email' || field === 'lastLogin' || field === 'createdAt' ? 120 : (field === 'name' || field === 'actions' ? 100 : 80))
    };
    document.addEventListener('mousemove', handleResizing);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizing = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { field, startX, startWidth } = resizingRef.current;
    const deltaX = e.clientX - startX;
    setColumnWidths(prev => ({ ...prev, [field]: Math.max(50, startWidth + deltaX) }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizing);
    document.removeEventListener('mouseup', handleResizeEnd);
    setColumnWidths(prev => {
      localStorage.setItem('userManagementColumnWidths', JSON.stringify(prev));
      return prev;
    });
  }, [handleResizing]);

  const handleSort = (field: string) => {
    if (sortModel?.field === field) {
      if (sortModel.sort === 'asc') {
        setSortModel({ field, sort: 'desc' });
      } else {
        setSortModel(null); // 내림차순 다음 클릭 시 정렬 해제
      }
    } else {
      setSortModel({ field, sort: 'asc' });
    }
  };

  const sortedUsers = useMemo(() => {
    if (!sortModel) return users;
    const { field, sort } = sortModel;
    return [...users].sort((a: any, b: any) => {
      const valA = a[field] || '';
      const valB = b[field] || '';
      if (valA < valB) return sort === 'asc' ? -1 : 1;
      if (valA > valB) return sort === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortModel]);

  const SortableHeader: React.FC<{ field: string; label: string; width: number }> = ({ field, label, width }) => {
    const isSorted = sortModel?.field === field;
    return (
      <TableCell
        align="center"
        onClick={() => handleSort(field)}
        sx={{
          ...ALERT_TABLE_STYLES.headerCell,
          width,
          cursor: 'pointer',
          position: 'relative',
          '&:hover .resize-handle': { opacity: 1 },
          userSelect: 'none'
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{label}</Typography>
          {isSorted && (sortModel.sort === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />)}
        </Stack>
        <Box
          className="resize-handle"
          onMouseDown={(e) => handleResizeStart(e, field)}
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 4,
            cursor: 'col-resize',
            bgcolor: 'primary.main',
            opacity: 0,
            zIndex: 10,
            transition: 'opacity 0.2s',
            '&:active': { opacity: 1 }
          }}
        />
      </TableCell>
    );
  };

  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    id: '',
    username: '',
    email: '',
    name: '',
    role: 'role-4',
    is_active: true,
    password: '',
  });

  // 삭제 확인 다이얼로그
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 삭제된 사용자 관리
  const [deletedUsersOpen, setDeletedUsersOpen] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [deletedUsersLoading, setDeletedUsersLoading] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);

  // 관리자 OTP 등록 권장 배너 상태
  const [adminOtpEnabled, setAdminOtpEnabled] = useState<boolean | null>(null);
  const [otpEnrollOpen, setOtpEnrollOpen] = useState(false);

  // OTP 초기화 확인 다이얼로그
  const [otpResetConfirmOpen, setOtpResetConfirmOpen] = useState(false);

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchRoleCodes(); }, [fetchRoleCodes]);

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
    }
  }, [settings]);

  const loadUsers = useCallback(async () => {
    if (!user || user.role !== 'role-1') { setLoading(false); return; }
    setLoading(true);
    try {
      const skip = page * rowsPerPage;
      const userResponse = await userService.getUsers(skip, rowsPerPage);
      setUsers(userResponse.users);
      setTotal(userResponse.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      setSnackbar({ open: true, message: t('loadDataFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, user, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 관리자 OTP 미등록 시 배너 표시 여부 확인
  useEffect(() => {
    if (user?.role === 'role-1') {
      api.get('/api/v1/auth/me').then(res => {
        setAdminOtpEnabled(res.data.otp_enabled ?? false);
      }).catch(() => setAdminOtpEnabled(null));
    }
  }, [user]);

  const handleOpenDialog = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id,
        username: user.username || user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        password: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        id: '',
        username: '',
        email: '',
        name: '',
        role: 'role-4',
        is_active: true,
        password: '',
      });
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData: UserUpdate = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          is_active: formData.is_active,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await userService.updateUser(editingUser.id, updateData);
      } else {
        await userService.createUser(formData);
      }
      setSnackbar({ open: true, message: t('saveSuccess'), severity: 'success' });
      handleCloseDialog();
      loadUsers();
    } catch (error: any) {
      console.error("User save failed:", error);
      let detail = error.response?.data?.detail || '저장에 실패했습니다.';
      
      // detail이 객체이거나 배열인 경우 문자열로 변환
      if (typeof detail === 'object') {
          // Pydantic validation error array handling
          if (Array.isArray(detail)) {
              detail = detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
          } else {
              detail = JSON.stringify(detail);
          }
      }
      
      setSnackbar({ open: true, message: detail, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await userService.deleteUser(deleteId);
      setSnackbar({ open: true, message: t('deleteSuccess'), severity: 'success' });
      setDeleteId(null);
      loadUsers();
    } catch {
      setSnackbar({ open: true, message: t('deleteFailed'), severity: 'error' });
    }
  };

  const handleOtpReset = async () => {
    if (!editingUser) return;
    try {
      const otpService = getOTPService(api);
      await otpService.adminDisableOTP(editingUser.id);
      setSnackbar({ open: true, message: t('otpResetSuccess'), severity: 'success' });
      setOtpResetConfirmOpen(false);
      loadUsers();
      // 수정 중인 사용자의 otp_enabled 상태 갱신
      setEditingUser({ ...editingUser, otp_enabled: false });
    } catch (error: any) {
      setSnackbar({ open: true, message: t('otpResetFailed'), severity: 'error' });
    }
  };

  const loadDeletedUsers = useCallback(async () => {
    setDeletedUsersLoading(true);
    try {
      const response = await userService.getDeletedUsers(0, 100);
      setDeletedUsers(response.users);
    } catch {
      setSnackbar({ open: true, message: t('loadDataFailed'), severity: 'error' });
    } finally {
      setDeletedUsersLoading(false);
    }
  }, [t]);

  const handleOpenDeletedUsers = () => {
    setDeletedUsersOpen(true);
    loadDeletedUsers();
  };

  const handleRestore = async (userId: string) => {
    try {
      await userService.restoreUser(userId);
      setSnackbar({ open: true, message: t('restoreSuccess'), severity: 'success' });
      loadDeletedUsers();
      loadUsers();
    } catch {
      setSnackbar({ open: true, message: t('saveFailed'), severity: 'error' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    try {
      await userService.permanentDeleteUser(permanentDeleteId);
      setSnackbar({ open: true, message: t('permanentDeleteSuccess'), severity: 'success' });
      setPermanentDeleteId(null);
      loadDeletedUsers();
    } catch {
      setSnackbar({ open: true, message: t('deleteFailed'), severity: 'error' });
    }
  };

  if (user && user.role !== 'role-1') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">{t('noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', position: 'relative', p: 3 }}>

      {/* 관리자 OTP 미등록 권장 배너 */}
      {adminOtpEnabled === false && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setOtpEnrollOpen(true)}>
              {t('otpEnrollTitle')}
            </Button>
          }
        >
          {t('otpAdminEnrollRecommend')}
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('userManagement')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DeleteSweepIcon />}
            onClick={handleOpenDeletedUsers}
          >
            {t('viewDeletedUsers')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadUsers()}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('addUser')}
          </Button>
        </Stack>
      </Stack>

      <Paper {...ALERT_TABLE_STYLES.paper}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('userManagement')}</Typography>
            <Chip label={`${total} 명`} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} />
          </Box>
        </Stack>

        <Divider sx={{ mx: 2 }} />

        <TableContainer {...ALERT_TABLE_STYLES.container}>
          <Table {...ALERT_TABLE_STYLES.table} size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <SortableHeader field="id" label={t('id')} width={columnWidths['id'] || 120} />
                <SortableHeader field="name" label={t('name')} width={columnWidths['name'] || 100} />
                <SortableHeader field="email" label={t('email')} width={columnWidths['email'] || 150} />
                <SortableHeader field="role" label={t('role')} width={columnWidths['role'] || 80} />
                <SortableHeader field="is_active" label={t('status')} width={columnWidths['status'] || 80} />
                <SortableHeader field="otp_enabled" label="OTP" width={columnWidths['otp'] || 60} />
                <SortableHeader field="last_login_at" label={t('lastLogin')} width={columnWidths['lastLogin'] || 120} />
                <SortableHeader field="created_at" label={t('createdAt')} width={columnWidths['createdAt'] || 120} />
                <TableCell sx={{ ...ALERT_TABLE_STYLES.headerCell, width: columnWidths['actions'] || 100 }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                    {loading ? t('loading') : '사용자가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((row) => (
                  <UserRow
                    key={row.id}
                    row={row}
                    onEdit={handleOpenDialog}
                    onDelete={setDeleteId}
                    roleNames={roleNames}
                    language={language}
                    t={t}
                    columnWidths={columnWidths}
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

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editingUser ? t('editUser') : t('addUser')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('id', { fallback: '아이디' })}
              fullWidth
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!!editingUser}
            />
            <TextField
              label={t('email')}
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label={t('name')}
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              select
              label={t('role')}
              fullWidth
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <MenuItem value="role-1">{getRoleName('role-1', roleNames, language)}</MenuItem>
              <MenuItem value="role-2">{getRoleName('role-2', roleNames, language)}</MenuItem>
              <MenuItem value="role-3">{getRoleName('role-3', roleNames, language)}</MenuItem>
              <MenuItem value="role-4">{getRoleName('role-4', roleNames, language)}</MenuItem>
            </TextField>
            <TextField
              label={t('password')}
              type="password"
              fullWidth
              placeholder={editingUser ? '변경 시에만 입력' : t('passwordPlaceholder')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label={t('status')}
            />
            {editingUser?.otp_enabled && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<LockResetIcon />}
                onClick={() => setOtpResetConfirmOpen(true)}
                fullWidth
              >
                {t('otpReset')}
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button variant="contained" color="secondary" onClick={handleSubmit}>{t('save')}</Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('deleteUser')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmDelete')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteId(null)}>{t('cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('deleteUser')}</Button>
        </DialogActions>
      </Dialog>

      {/* OTP 초기화 확인 다이얼로그 */}
      <Dialog open={otpResetConfirmOpen} onClose={() => setOtpResetConfirmOpen(false)}>
        <DialogTitle>{t('otpReset')}</DialogTitle>
        <DialogContent>
          <Typography>{t('otpResetConfirm')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOtpResetConfirmOpen(false)}>{t('cancel')}</Button>
          <Button variant="contained" color="warning" onClick={handleOtpReset}>{t('otpReset')}</Button>
        </DialogActions>
      </Dialog>

      {/* 삭제된 사용자 다이얼로그 */}
      <Dialog open={deletedUsersOpen} onClose={() => setDeletedUsersOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('deletedUsers')}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {deletedUsers.length === 0 && !deletedUsersLoading ? (
            <Typography color="text.secondary" sx={{ py: 10, textAlign: 'center' }}>{t('noDeletedUsers')}</Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...ALERT_TABLE_STYLES.headerCell, pl: 3 }} align="center">{t('id')}</TableCell>
                      <TableCell sx={ALERT_TABLE_STYLES.headerCell} align="center">{t('name')}</TableCell>
                      <TableCell sx={ALERT_TABLE_STYLES.headerCell} align="center">{t('email')}</TableCell>
                      <TableCell sx={ALERT_TABLE_STYLES.headerCell} align="center">{t('deletedAt')}</TableCell>
                      <TableCell sx={ALERT_TABLE_STYLES.headerCell} align="center">{t('actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deletedUsers.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ ...ALERT_TABLE_STYLES.bodyCell, pl: 3 }}>{row.id}</TableCell>
                        <TableCell sx={ALERT_TABLE_STYLES.bodyCell}>{row.name}</TableCell>
                        <TableCell sx={ALERT_TABLE_STYLES.bodyCell}>{row.email}</TableCell>
                        <TableCell sx={ALERT_TABLE_STYLES.bodyCell} align="center">
                          {row.deleted_at ? dayjs(row.deleted_at).format('YYYY-MM-DD HH:mm') : '-'}
                        </TableCell>
                        <TableCell sx={ALERT_TABLE_STYLES.bodyCell} align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button size="small" variant="outlined" onClick={() => handleRestore(row.id)}>
                              {t('restoreUser')}
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => setPermanentDeleteId(row.id)}>
                              {t('permanentDelete')}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeletedUsersOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      {/* 완전 삭제 확인 다이얼로그 */}
      <Dialog open={!!permanentDeleteId} onClose={() => setPermanentDeleteId(null)}>
        <DialogTitle>{t('permanentDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirmPermanentDelete')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setPermanentDeleteId(null)}>{t('cancel')}</Button>
          <Button variant="contained" color="error" onClick={handlePermanentDelete}>{t('permanentDelete')}</Button>
        </DialogActions>
      </Dialog>

      {/* 관리자 OTP 등록 모달 */}
      <OTPEnrollModal
        open={otpEnrollOpen}
        onClose={() => setOtpEnrollOpen(false)}
        onSuccess={() => { setOtpEnrollOpen(false); setAdminOtpEnabled(true); }}
        apiClient={api}
      />

      {/* 알림 메시지 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagementTab;
