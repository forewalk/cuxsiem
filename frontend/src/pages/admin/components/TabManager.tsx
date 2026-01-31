import React from 'react';
import { Box, Tabs, Tab, IconButton, Typography } from '@mui/material';
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleCloseTab = (id: string) => (event: React.MouseEvent) => {
    event.stopPropagation(); // 탭 변경 이벤트와 중복 방지
    removeTab(id);
  };

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <Tabs
        value={activeTabId}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="admin tabs"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>{tab.label}</Typography>
                <IconButton
                  size="small"
                  onClick={handleCloseTab(tab.id)}
                  sx={{ ml: 1, p: 0 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          />
        ))}
      </Tabs>
      <Box sx={{ p: 2, height: 'calc(100vh - 120px)', overflow: 'auto' }}> {/* 임시 높이 */}
        {tabs.map((tab) => {
          const TabComponent = tabComponents[tab.component];
          if (!TabComponent) {
            return (
              <div
                key={tab.id}
                role="tabpanel"
                hidden={activeTabId !== tab.id}
                id={`tabpanel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
              >
                {activeTabId === tab.id && (
                  <Box>
                    <Typography>컴포넌트를 찾을 수 없습니다: {tab.component}</Typography>
                  </Box>
                )}
              </div>
            );
          }
          return (
            <div
              key={tab.id}
              role="tabpanel"
              hidden={activeTabId !== tab.id}
              id={`tabpanel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
            >
              <TabComponent {...tab.props} />
            </div>
          );
        })}
      </Box>
    </Box>
  );
};

export default TabManager;
