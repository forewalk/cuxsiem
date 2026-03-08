import React, { useMemo } from 'react';
import { Box, IconButton, Typography, useTheme, styled } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import useTabStore from '../../stores/tabStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import UserManagementTab from '../../pages/admin/tabs/UserManagementTab';
import PasswordPolicyTab from '../../pages/admin/tabs/PasswordPolicyTab';
import DashboardTab from '../../pages/dashboard/tabs/DashboardTab';
import ThreatListTab from '../../pages/dashboard/tabs/ThreatListTab';
import AgentListTab from '../../pages/dashboard/tabs/AgentListTab';
import EdrListTab from '../../pages/dashboard/tabs/EdrListTab';
import LogStreamingTab from '../../pages/admin/tabs/LogStreamingTab';
import NotificationRuleListTab from '../../pages/admin/alerts/tabs/NotificationRuleListTab';
import NotificationHistoryTab from '../../pages/admin/alerts/tabs/NotificationHistoryTab';
import AdvancedSettingsTab from '../../pages/admin/tabs/AdvancedSettingsTab';

// i18n: JSON 파일에서 번역 로드
import koMessages from "../../locales/ko.json";
import enMessages from "../../locales/en.json";
import jaMessages from "../../locales/ja.json";
import cnMessages from "../../locales/cn.json";

const tabComponents: { [key: string]: React.ComponentType<any> } = {
  UserManagementTab: UserManagementTab,
  PasswordPolicyTab: PasswordPolicyTab,
  DashboardTab: DashboardTab,
  ThreatListTab: ThreatListTab,
  AgentListTab: AgentListTab,
  EdrListTab: EdrListTab,
  LogStreamingTab: LogStreamingTab,
  NotificationRuleListTab: NotificationRuleListTab,
  NotificationHistoryTab: NotificationHistoryTab,
  AdvancedSettingsTab: AdvancedSettingsTab,
};

const TabItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  minHeight: 40,
  cursor: 'pointer',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: active 
    ? (theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5') 
    : 'transparent',
  borderBottom: active ? `2px solid ${theme.palette.secondary.main}` : 'none',
  color: active ? theme.palette.secondary.main : theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9',
  },
  transition: 'background-color 0.2s, color 0.2s',
  userSelect: 'none',
  minWidth: 'fit-content',
  maxWidth: 200,
  flexShrink: 0,
}));

const TabManager: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, reorderTabs } = useTabStore();
  const { language } = useLanguageStore();
  const theme = useTheme();

  // i18n 지원
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages
  };
  const t = useMemo(() => (key: string): string => {
    const currentTranslations = translations[language] || translations["ko"];
    return currentTranslations[key] || key;
  }, [language]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderTabs(result.source.index, result.destination.index);
  };

  const handleTabClick = (id: string) => {
    setActiveTab(id);
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
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
        overflowX: 'auto',
        minHeight: 40,
        display: 'flex',
        msOverflowStyle: 'none',  /* IE and Edge */
        scrollbarWidth: 'none',   /* Firefox */
        '&::-webkit-scrollbar': {
          display: 'none'         /* Chrome, Safari, Opera */
        }
      }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tabs-list" direction="horizontal">
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ display: 'flex', minWidth: '100%', minHeight: 40 }}
              >
                {tabs.map((tab, index) => (
                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                    {(provided, snapshot) => (
                      <TabItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        active={activeTabId === tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        sx={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                          boxShadow: snapshot.isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : 'none',
                          zIndex: snapshot.isDragging ? 1000 : 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography 
                            variant="body2" 
                            noWrap 
                            sx={{ 
                              fontWeight: activeTabId === tab.id ? 600 : 400,
                              flexGrow: 1 
                            }}
                          >
                            {tab.labelKey ? t(tab.labelKey) : tab.label}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={handleCloseTab(tab.id)}
                            sx={{ p: 0.2, ml: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' } }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </TabItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Box>
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden', 
        position: 'relative',
        bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#F4F5F7'
      }}>
        {tabs.map((tab) => {
          const TabComponent = tabComponents[tab.component];
          return (
            <Box
              key={tab.id}
              sx={{
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                display: activeTabId === tab.id ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              {TabComponent ? (
                <TabComponent {...tab.props} />
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography>Error: {tab.component}</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TabManager;