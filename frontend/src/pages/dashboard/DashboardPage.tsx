import React from 'react';
import { Box } from '@mui/material';
import TabManager from '../admin/components/TabManager';

const DashboardPage: React.FC = () => {
  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <TabManager />
    </Box>
  );
};

export default DashboardPage;