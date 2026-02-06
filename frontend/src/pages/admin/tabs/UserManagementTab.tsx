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
import type { User, UserCreate, UserUpdate } from '../../../types';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../../locales/ko.json";
import enMessages from "../../../locales/en.json";
import jaMessages from "../../../locales/ja.json";

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    id: '', // 초기화 값
    username: '',
    email: '',
    name: '',
    role: 'user',
    is_active: true,
    password: '',
  });

  // ... (중략) ...

  const handleOpenDialog = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        id: user.id,
        username: user.username || user.id, // 호환성
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
  
  // ... (중략) ...

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
              disabled={!!editingUser}
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
              <MenuItem value="user">{t('userRoleUser')}</MenuItem>
              <MenuItem value="admin">{t('userRoleAdmin')}</MenuItem>
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
