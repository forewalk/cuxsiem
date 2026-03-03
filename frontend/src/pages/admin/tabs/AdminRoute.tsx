import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>사용자 정보를 확인하는 중...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'role-1') {
    return <Navigate to="/main" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
