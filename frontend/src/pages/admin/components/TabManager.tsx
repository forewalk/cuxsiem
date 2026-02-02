import React from 'react';
import { Box, Tabs, Tab, IconButton, Typography, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useTabStore from '../stores/tabStore';
import UserManagementTab from '../tabs/UserManagementTab';
import PasswordPolicyTab from '../tabs/PasswordPolicyTab';

// 탭 컴포넌트 맵
const tabComponents: { [key: string]: React.ComponentType<any> } = {
  UserManagementTab: UserManagementTab,
  PasswordPolicyTab: PasswordPolicyTab,
};

const TabManager: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();
  const theme = useTheme();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleCloseTab = (id: string) => (event: React.MouseEvent) => {
    event.stopPropagation(); // 탭 변경 이벤트와 중복 방지
    removeTab(id);
  };

  if (tabs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="h6">열려있는 메뉴가 없습니다.</Typography>
        <Typography>왼쪽 메뉴에서 관리 기능을 선택하세요.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff' }}>
        <Tabs
          value={activeTabId}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="admin tabs"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              borderRight: `1px solid ${theme.palette.divider}`,
              px: 2,
            }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{tab.label}</Typography>
                  <IconButton
                    size="small"
                    onClick={handleCloseTab(tab.id)}
                    sx={{ p: 0.2, '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' } }}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {tabs.map((tab) => {
          const TabComponent = tabComponents[tab.component];
          return (
            <Box
              key={tab.id}
              role="tabpanel"
              hidden={activeTabId !== tab.id}
              id={`tabpanel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              sx={{
                display: activeTabId === tab.id ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
                p: 2
              }}
            >
              {TabComponent ? (
                <TabComponent {...tab.props} />
              ) : (
                <Typography>컴포넌트를 찾을 수 없습니다: {tab.component}</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TabManager;