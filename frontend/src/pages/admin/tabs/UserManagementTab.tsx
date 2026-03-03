import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Stack, Alert, Snackbar
} from '@mui/material';
import OTPEnrollModal from '../../../components/auth/OTPEnrollModal';
import api from '../../../services/api';
import {
  DataGrid, GridToolbar
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { userService } from '../../../services/userService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useRoleCodesStore } from '../../../stores/useRoleCodesStore';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import type { User, UserCreate, UserUpdate } from '../../../types';
import { getRoleName } from '../../../utils/roleUtils';

const UserManagementTab: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>([10, 25, 50]);

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

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchRoleCodes(); }, [fetchRoleCodes]);

  useEffect(() => {
    if (settings && settings.pagination_size) {
      setPaginationModel(prev => ({ ...prev, pageSize: settings.pagination_size! }));
      setPageSizeOptions(prev => {
        const newOptions = [...prev];
        if (!newOptions.includes(settings.pagination_size!)) {
          newOptions.unshift(settings.pagination_size!);
          return newOptions.sort((a, b) => a - b);
        }
        return newOptions;
      });
    }
  }, [settings]);

  const loadUsers = useCallback(async () => {
    if (!user || user.role !== 'role-1') { setLoading(false); return; }
    setLoading(true);
    try {
      const skip = paginationModel.page * paginationModel.pageSize;
      const userResponse = await userService.getUsers(skip, paginationModel.pageSize);
      setUsers(userResponse.users);
      setTotal(userResponse.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      setSnackbar({ open: true, message: t('loadDataFailed'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [paginationModel, user, t]);

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
    } catch (error) {
      setSnackbar({ open: true, message: t('deleteFailed'), severity: 'error' });
    }
  };

  const loadDeletedUsers = useCallback(async () => {
    setDeletedUsersLoading(true);
    try {
      const response = await userService.getDeletedUsers(0, 100);
      setDeletedUsers(response.users);
    } catch (error) {
      setSnackbar({ open: true, message: t('loadDataFailed'), severity: 'error' });
    } finally {
      setDeletedUsersLoading(false);
    }
  }, []);

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
    } catch (error) {
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
    } catch (error) {
      setSnackbar({ open: true, message: t('deleteFailed'), severity: 'error' });
    }
  };

  const deletedColumns: GridColDef[] = [
    { field: 'id', headerName: t('id'), flex: 1.2 },
    { field: 'name', headerName: t('name'), flex: 1 },
    { field: 'email', headerName: t('email'), flex: 1.5 },
    {
      field: 'deleted_at',
      headerName: t('deletedAt'),
      flex: 1.2,
      valueFormatter: (value) => {
        if (!value) return '-';
        return dayjs(value).format('YYYY-MM-DD HH:mm');
      }
    },
    {
      field: 'actions',
      headerName: t('actions'),
      flex: 1.2,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="column" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: '100%', height: '100%', py: 0.5 }}>
          <Button size="small" variant="outlined" color="primary" onClick={() => handleRestore(params.row.id)} sx={{ width: '100%', fontSize: '0.7rem', py: 0.3 }}>
            {t('restoreUser')}
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => setPermanentDeleteId(params.row.id)} sx={{ width: '100%', fontSize: '0.7rem', py: 0.3 }}>
            {t('permanentDelete')}
          </Button>
        </Stack>
      )
    },
  ];

  const columns: GridColDef[] = [
    { field: 'id', headerName: t('id'), flex: 1.2 },
    { field: 'name', headerName: t('name'), flex: 1 },
    { field: 'email', headerName: t('email'), flex: 1.5 },
    {
      field: 'role',
      headerName: t('role'),
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => {
        return getRoleName(params.value as string, roleNames, language);
      }
    },
    {
      field: 'is_active',
      headerName: t('status'),
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <Box
          sx={{
            color: params.value ? 'success.main' : 'error.main',
            fontWeight: 'bold',
          }}
        >
          {params.value ? t('active') : t('inactive')}
        </Box>
      )
    },
    {
      field: 'otp_enabled',
      headerName: 'OTP',
      flex: 0.6,
      renderCell: (params: GridRenderCellParams) => (
        <Box
          sx={{
            color: params.value ? 'success.main' : 'text.secondary',
            fontWeight: 'bold',
          }}
        >
          {params.value ? t('active') : '-'}
        </Box>
      )
    },
    {
      field: 'last_login_at',
      headerName: t('lastLogin'),
      flex: 1.2,
      valueFormatter: (value) => {
        if (!value) return '-';
        return dayjs(value).format('YYYY-MM-DD HH:mm');
      }
    },
    {
      field: 'created_at',
      headerName: t('createdAt'),
      flex: 1.2,
      valueFormatter: (value) => {
        return dayjs(value).format('YYYY-MM-DD HH:mm');
      }
    },
    {
      field: 'actions',
      headerName: t('actions'),
      flex: 0.8,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={() => handleOpenDialog(params.row as User)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
            disabled={params.row.role === 'role-1'}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    },
  ];

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

      <Paper sx={{ height: 'calc(100vh - 160px)', width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          pageSizeOptions={pageSizeOptions}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
          }}
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

      {/* 삭제된 사용자 다이얼로그 */}
      <Dialog open={deletedUsersOpen} onClose={() => setDeletedUsersOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('deletedUsers')}</DialogTitle>
        <DialogContent>
          {deletedUsers.length === 0 && !deletedUsersLoading ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('noDeletedUsers')}</Typography>
          ) : (
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={deletedUsers}
                columns={deletedColumns}
                loading={deletedUsersLoading}
                disableRowSelectionOnClick
                rowHeight={80}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                sx={{ border: 'none', '& .MuiDataGrid-cell:focus': { outline: 'none' } }}
              />
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
