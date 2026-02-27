import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Stack, Alert, Snackbar
} from '@mui/material';
import {
  DataGrid, GridToolbar
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { userService } from '../../../services/userService';
import { codeService } from '../../../services/codeService';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import type { User, UserCreate, UserUpdate } from '../../../types';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";
import cnMessages from "../../../locales/cn.json";

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { settings, fetchSettings } = useSettingsStore();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [pageSizeOptions, setPageSizeOptions] = useState<number[]>([10, 25, 50]);

  const [roleNames, setRoleNames] = useState<Record<string, string>>({
    admin: '관리자',
    monitoring: '모니터링',
    approver: '결재자',
    user: '사용자'
  });

  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    id: '',
    username: '',
    email: '',
    name: '',
    role: 'user',
    is_active: true,
    password: '',
  });

  // 삭제 확인 다이얼로그
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // i18n 지원
  const savedLanguage = localStorage.getItem("appLanguage") || "ko";
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
  };

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[savedLanguage] || translations["ko"] || {};
    let text = currentTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [savedLanguage]);

  // 고급 설정 로드 (초기 1회)
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
    setLoading(true);
    try {
      const skip = paginationModel.page * paginationModel.pageSize;
      const [userResponse, codesData] = await Promise.all([
        userService.getUsers(skip, paginationModel.pageSize),
        codeService.getRoleCodes()
      ]);
      
      setUsers(userResponse.users);
      setTotal(userResponse.total);

      if (codesData.length > 0) {
        const newMapping: Record<string, string> = {};
        codesData.forEach(c => {
          if (c.id === 'role-1') newMapping.admin = c.code_name;
          if (c.id === 'role-2') newMapping.monitoring = c.code_name;
          if (c.id === 'role-3') newMapping.approver = c.code_name;
          if (c.id === 'role-4') newMapping.user = c.code_name;
        });
        setRoleNames(prev => ({ ...prev, ...newMapping }));
      }
    } catch (error) {
      console.error('Failed to load users or roles:', error);
      setSnackbar({ open: true, message: '데이터를 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [paginationModel]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
        role: 'user',
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
      setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: t('name'), flex: 1 },
    { field: 'email', headerName: t('email'), flex: 1.5 },
    {
      field: 'role',
      headerName: t('role'),
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => {
        return roleNames[params.value as string] || params.value;
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
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row as User)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.id)}
            disabled={params.row.role === 'admin'}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    },
  ];

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{t('userManagement')}</Typography>
        <Stack direction="row" spacing={1}>
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

      <Paper sx={{ height: 'calc(100% - 60px)', width: '100%' }}>
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
              <MenuItem value="admin">{roleNames.admin}</MenuItem>
              <MenuItem value="monitoring">{roleNames.monitoring}</MenuItem>
              <MenuItem value="approver">{roleNames.approver}</MenuItem>
              <MenuItem value="user">{roleNames.user}</MenuItem>
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
