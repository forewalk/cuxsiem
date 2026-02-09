import React, { useMemo } from 'react';
import { Box, Tabs, Tab, IconButton, Typography, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useTabStore from '../../stores/tabStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import UserManagementTab from '../../pages/admin/tabs/UserManagementTab';
import PasswordPolicyTab from '../../pages/admin/tabs/PasswordPolicyTab';
import DashboardTab from '../../pages/dashboard/tabs/DashboardTab';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";

const tabComponents: { [key: string]: React.ComponentType<any> } = {
  UserManagementTab: UserManagementTab,
  PasswordPolicyTab: PasswordPolicyTab,
  DashboardTab: DashboardTab,
};

const TabManager: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();
  const { language } = useLanguageStore();
  const theme = useTheme();

  // i18n 지원
  const translations: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleCloseTab = (id: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    removeTab(id);
  };

  if (tabs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="h6">{t('noOpenMenus') || '열려있는 메뉴가 없습니다.'}</Typography>
        <Typography>{t('selectMenuHint') || '왼쪽 메뉴에서 기능을 선택하세요.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff' }}>
        <Tabs
          value={activeTabId}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
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
                  {/* labelKey가 있으면 실시간 번역, 없으면 저장된 label 사용 */}
                  <Typography variant="body2">
                    {tab.labelKey ? t(tab.labelKey) : tab.label}
                  </Typography>
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
          if (activeTabId !== tab.id) return null;
          return (
            <Box
              key={tab.id}
              sx={{ height: '100%', overflow: 'auto' }}
            >
              {TabComponent ? <TabComponent {...tab.props} /> : <Box sx={{p:2}}><Typography>Error: {tab.component}</Typography></Box>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TabManager;
