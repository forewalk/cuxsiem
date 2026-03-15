import React from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider, Button,
  Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import {
  WorkspacePremium as LicenseIcon,
  UploadFile as UploadIcon,
  ConstructionOutlined as ConstructionIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../hooks/useAuth';

const MOCK_LICENSE = {
  type: 'Enterprise',
  issuedTo: 'CruxSIEM Demo',
  issuedAt: '2026-01-01',
  expiresAt: '2027-01-01',
  maxNodes: 10,
  status: 'active',
};

const LicenseManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (user?.role !== 'role-1') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography color="text.secondary">{t('noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', height: '100%', p: 3 }}>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <LicenseIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>{t('licenseManagement')}</Typography>
        <Chip
          label={t('heartbeatBeta')}
          size="small"
          variant="outlined"
          color="warning"
          icon={<ConstructionIcon />}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('licenseManagementDesc')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>
        {/* 현재 라이선스 정보 */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>{t('licenseCurrentInfo')}</Typography>
            <Chip
              icon={<CheckCircleIcon />}
              label={t('active')}
              color="success"
              size="small"
              variant="outlined"
            />
          </Stack>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', width: 140, border: 'none', pl: 0 }}>
                  {t('licenseType')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, border: 'none' }}>
                  {MOCK_LICENSE.type}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', border: 'none', pl: 0 }}>
                  {t('licenseIssuedTo')}
                </TableCell>
                <TableCell sx={{ border: 'none' }}>{MOCK_LICENSE.issuedTo}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', border: 'none', pl: 0 }}>
                  {t('licenseIssuedAt')}
                </TableCell>
                <TableCell sx={{ border: 'none' }}>{MOCK_LICENSE.issuedAt}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', border: 'none', pl: 0 }}>
                  {t('licenseExpiresAt')}
                </TableCell>
                <TableCell sx={{ border: 'none' }}>{MOCK_LICENSE.expiresAt}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', border: 'none', pl: 0 }}>
                  Max Nodes
                </TableCell>
                <TableCell sx={{ border: 'none' }}>{MOCK_LICENSE.maxNodes}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        {/* 라이선스 업로드 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            {t('licenseUpload')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('licenseUploadDesc')}
          </Typography>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              .json 파일을 드래그하거나 버튼으로 선택하세요.
            </Typography>
            <Button variant="outlined" startIcon={<UploadIcon />} disabled>
              {t('licenseUpload')}
            </Button>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};

export default LicenseManagementTab;
