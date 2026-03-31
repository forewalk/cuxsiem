import {
  Box, Collapse, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Tune as AdvancedIcon, Computer as AgentIcon,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  ExpandLess, ExpandMore,
  History as HistoryIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  ShowChart as ThreatsIcon,
  Shield as EdrIcon,
  FlashOn as ActionIcon,
  MonitorHeart as MonitoringIcon,
  Favorite as HeartbeatIcon,
  ListAlt as ListAltIcon,
  BarChart as BarChartIcon,
  WorkspacePremium as LicenseIcon,
  ReceiptLong as BomIcon,
  Code as SbomIcon,
  SmartToy as AibomIcon,
  Schema as ScenarioIcon,
  AccountTree as ProcessTreeIcon,
  Rule as RuleIcon,
} from '@mui/icons-material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTabStore from '../stores/tabStore';

import koMessages from '../locales/ko.json';
import enMessages from '../locales/en.json';
import jaMessages from '../locales/ja.json';
import cnMessages from '../locales/cn.json';
const _allLocales: Record<string, Record<string, string>> = { ko: koMessages, en: enMessages, ja: jaMessages, cn: cnMessages };
function _t(key: string): string {
  const lang = localStorage.getItem('appLanguage') || 'ko';
  return _allLocales[lang]?.[key] ?? _allLocales['ko']?.[key] ?? key;
}

interface AdminSidemenuProps {
  t: (key: string, params?: Record<string, string>) => string;
  userRole: string | undefined;
  drawerOpen: boolean;
  handleDrawerToggle: () => void;
}

const drawerWidth = 246;
const collapsedWidth = 65;
const mobileDrawerWidth = 240;
const iconMinWidth = 48;
const listItemHeight = 48;

const AdminSidemenu: React.FC<AdminSidemenuProps> = ({ t, userRole, drawerOpen, handleDrawerToggle }) => {
  // 초기값 항상 false: 로그인·로고 클릭·새로고침 시 모두 접힌 상태로 시작
  const [openAdminMenu, setOpenAdminMenu] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState(false);
  const [openDashboardMenu, setOpenDashboardMenu] = useState(false);
  const [openThreatMenu, setOpenThreatMenu] = useState(false);
  const [openAgentMenu, setOpenAgentMenu] = useState(false);
  const [openEdrMenu, setOpenEdrMenu] = useState(false);
  const [openMonitorMenu, setOpenMonitorMenu] = useState(false);
  const [openBomMenu, setOpenBomMenu] = useState(false);
  const [openScenarioMenu, setOpenScenarioMenu] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const { addTab, activeTabId, clearAndGoHome } = useTabStore();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const collapseAllMenus = () => {
    setOpenAdminMenu(false);
    setOpenActionMenu(false);
    setOpenDashboardMenu(false);
    setOpenThreatMenu(false);
    setOpenAgentMenu(false);
    setOpenEdrMenu(false);
    setOpenMonitorMenu(false);
    setOpenBomMenu(false);
    setOpenScenarioMenu(false);
  };

  const handleGoHome = () => {
    collapseAllMenus();
    clearAndGoHome({ label: _t('threatDashboardTitle'), component: 'DashboardTab', labelKey: 'threatDashboardTitle' });
    if (!drawerOpen && !isMobile) handleDrawerToggle();
    if (isMobile) handleDrawerToggle();
    if (window.location.pathname !== '/main') navigate('/main');
  };

  const handleAdminMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenAdminMenu(true);
    } else {
      setOpenAdminMenu(!openAdminMenu);
    }
  };

  const handleDashboardMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenDashboardMenu(true);
    } else {
      setOpenDashboardMenu(!openDashboardMenu);
    }
  };

  const handleActionMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenActionMenu(true);
    } else {
      setOpenActionMenu(!openActionMenu);
    }
  };

  const handleMonitorMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenMonitorMenu(true);
    } else {
      setOpenMonitorMenu(!openMonitorMenu);
    }
  };

  const handleScenarioMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenScenarioMenu(true);
    } else {
      setOpenScenarioMenu(!openScenarioMenu);
    }
  };

  const handleBomMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenBomMenu(true);
    } else {
      setOpenBomMenu(!openBomMenu);
    }
  };

  const handleThreatMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenThreatMenu(!openThreatMenu);
  };

  const handleAgentMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenAgentMenu(!openAgentMenu);
  };

  const handleEdrMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenEdrMenu(!openEdrMenu);
  };

  const handleMenuTabClick = (label: string, component: string, labelKey?: string) => {
    if (!drawerOpen && !isMobile) handleDrawerToggle();
    addTab({ label, component, labelKey });
    if (isMobile) handleDrawerToggle();
    if (window.location.pathname !== '/main') {
      navigate('/main');
    }
  };

  const menuBg = theme.palette.mode === 'dark' ? '#1A1A1A' : theme.palette.background.paper;
  const textColor = theme.palette.text.primary;
  const isLogStreamingActive = activeTabId === 'LogStreamingTab';

  const listItemTextStyle = {
    opacity: (drawerOpen || isMobile) ? 1 : 0,
    width: (drawerOpen || isMobile) ? 'auto' : 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
  };

  const subListItemTextStyle = {
    ...listItemTextStyle,
    fontSize: '0.8125rem',
  };

  const currentWidth = isMobile ? (drawerOpen ? mobileDrawerWidth : 0) : (drawerOpen ? drawerWidth : collapsedWidth);

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={drawerOpen}
      onClose={handleDrawerToggle}
      sx={{
        width: currentWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: isMobile ? mobileDrawerWidth : currentWidth,
          boxSizing: 'border-box',
          bgcolor: menuBg,
          color: textColor,
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 1, minHeight: 56 }}>
        <Box
          onClick={handleGoHome}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 1, flexGrow: 1, overflow: 'hidden' }}
        >
          <img src="/favicon.svg" alt="logo" style={{ width: 28, height: 28, flexShrink: 0 }} />
          {(drawerOpen || isMobile) && (
            <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
              CruxSIEM
            </Typography>
          )}
        </Box>
        {!isMobile && (
          <IconButton size="small" onClick={handleDrawerToggle}>
            {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
        {isMobile && (
          <IconButton size="small" onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>

      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flexGrow: 1 }}>
        <List>
          {/* Dashboard Menu Group */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleDashboardMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}><DashboardIcon /></ListItemIcon>
              <ListItemText primary={t('dashboard')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openDashboardMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>

          <Collapse in={openDashboardMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* 1. Threat Status Sub-Group */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={handleThreatMenuClick}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><ThreatsIcon /></ListItemIcon>
                <ListItemText primary={t('threats')} sx={listItemTextStyle} />
                {(drawerOpen || isMobile) && (openThreatMenu ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              <Collapse in={openThreatMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('threatListTitle'), 'ThreatListTab', 'threatListTitle')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><ListAltIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('threatList')} sx={subListItemTextStyle} />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('threatDashboardTitle'), 'DashboardTab', 'threatDashboardTitle')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><BarChartIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('threatDashboard')} sx={subListItemTextStyle} />
                  </ListItemButton>
                </List>
              </Collapse>

              {/* 2. Agent Sub-Group */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={handleAgentMenuClick}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><AgentIcon /></ListItemIcon>
                <ListItemText primary={t('agent')} sx={listItemTextStyle} />
                {(drawerOpen || isMobile) && (openAgentMenu ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              <Collapse in={openAgentMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('agentListTitle'), 'AgentListTab', 'agentListTitle')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><ListAltIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('agentList')} sx={subListItemTextStyle} />
                  </ListItemButton>
                </List>
              </Collapse>

              {/* 3. EDR Sub-Group */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={handleEdrMenuClick}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><EdrIcon /></ListItemIcon>
                <ListItemText primary={t('edr')} sx={listItemTextStyle} />
                {(drawerOpen || isMobile) && (openEdrMenu ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              <Collapse in={openEdrMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('edrListTitle'), 'EdrListTab', 'edrListTitle')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><ListAltIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('edrList')} sx={subListItemTextStyle} />
                  </ListItemButton>
                </List>
              </Collapse>
            </List>
          </Collapse>

          {/* Log Streaming Menu */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={() => handleMenuTabClick(t('logStreaming'), 'LogStreamingTab', 'logStreaming')}
              selected={isLogStreamingActive}
              sx={{ minHeight: listItemHeight, px: 2.5 }}
            >
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <TerminalIcon />
              </ListItemIcon>
              <ListItemText primary={t('logStreaming')} sx={listItemTextStyle} />
            </ListItemButton>
          </ListItem>

          {/* Scenario Menu Group */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleScenarioMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <ScenarioIcon />
              </ListItemIcon>
              <ListItemText primary={t('scenarioMenu')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openScenarioMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>

          <Collapse in={openScenarioMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('processTree'), 'ScenarioProcessTreeTab', 'processTree')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><ProcessTreeIcon /></ListItemIcon>
                <ListItemText primary={t('processTree')} sx={listItemTextStyle} />
              </ListItemButton>
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('detectionRules'), 'DetectionRuleTab', 'detectionRules')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><RuleIcon /></ListItemIcon>
                <ListItemText primary={t('detectionRules')} sx={listItemTextStyle} />
              </ListItemButton>
            </List>
          </Collapse>

          {/* Action Menu Group */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleActionMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <ActionIcon />
              </ListItemIcon>
              <ListItemText primary={t('actionMenu')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openActionMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>

          <Collapse in={openActionMenu} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Action Management (was API Management) */}
              {userRole === 'role-1' && (
                <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('apiMgmtMenu'), 'ActionApiTab', 'apiMgmtMenu')}>
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><SettingsIcon /></ListItemIcon>
                  <ListItemText primary={t('apiMgmtMenu')} sx={listItemTextStyle} />
                </ListItemButton>
              )}
              {/* Action History (New) */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('actionHistory'), 'ActionHistoryTab', 'actionHistory')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><HistoryIcon /></ListItemIcon>
                <ListItemText primary={t('actionHistory')} sx={listItemTextStyle} />
              </ListItemButton>
              {/* Notification History */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('notificationHistory'), 'NotificationHistoryTab', 'notificationHistory')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><HistoryIcon /></ListItemIcon>
                <ListItemText primary={t('notificationHistory')} sx={listItemTextStyle} />
              </ListItemButton>
              {/* Notification Management */}
              {userRole === 'role-1' && (
                <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('notificationRuleList'), 'NotificationRuleListTab', 'notificationRuleList')}>
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><NotificationsIcon /></ListItemIcon>
                  <ListItemText primary={t('notificationCenter')} sx={listItemTextStyle} />
                </ListItemButton>
              )}
            </List>
          </Collapse>

          {/* BOM Menu Group */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleBomMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <BomIcon />
              </ListItemIcon>
              <ListItemText primary={t('bomMenu')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openBomMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>

          <Collapse in={openBomMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('sbomMenu'), 'SbomTab', 'sbomMenu')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><SbomIcon /></ListItemIcon>
                <ListItemText primary={t('sbomMenu')} sx={listItemTextStyle} />
              </ListItemButton>
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('aibomMenu'), 'AibomTab', 'aibomMenu')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><AibomIcon /></ListItemIcon>
                <ListItemText primary={t('aibomMenu')} sx={listItemTextStyle} />
              </ListItemButton>
            </List>
          </Collapse>

          {/* Monitoring Menu Group */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleMonitorMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <MonitoringIcon />
              </ListItemIcon>
              <ListItemText primary={t('monitoringMenu')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openMonitorMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>

          <Collapse in={openMonitorMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={() => handleMenuTabClick(t('heartbeatMenu'), 'HeartbeatTab', 'heartbeatMenu')}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><HeartbeatIcon /></ListItemIcon>
                <ListItemText primary={t('heartbeatMenu')} sx={listItemTextStyle} />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      </Box>

      <Box sx={{ mt: 'auto', borderTop: `1px solid ${theme.palette.divider}` }}>
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleAdminMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary={t('adminMenu')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openAdminMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>
          <Collapse in={openAdminMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {userRole === 'role-1' && (
                <>
                  <ListItemButton
                    sx={{ pl: 4, minHeight: listItemHeight }}
                    onClick={() => handleMenuTabClick(t('userManagement'), 'UserManagementTab', 'userManagement')}
                  >
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><PeopleIcon /></ListItemIcon>
                    <ListItemText primary={t('userManagement')} sx={listItemTextStyle} />
                  </ListItemButton>
                  <ListItemButton
                    sx={{ pl: 4, minHeight: listItemHeight }}
                    onClick={() => handleMenuTabClick(t('passwordPolicy'), 'PasswordPolicyTab', 'passwordPolicy')}
                  >
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><LockIcon /></ListItemIcon>
                    <ListItemText primary={t('passwordPolicy')} sx={listItemTextStyle} />
                  </ListItemButton>
                </>
              )}

              {userRole === 'role-1' && (
                <ListItemButton
                  sx={{ pl: 4, minHeight: listItemHeight }}
                  onClick={() => handleMenuTabClick(t('licenseManagement'), 'LicenseManagementTab', 'licenseManagement')}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><LicenseIcon /></ListItemIcon>
                  <ListItemText primary={t('licenseManagement')} sx={listItemTextStyle} />
                </ListItemButton>
              )}

              <ListItemButton
                sx={{ pl: 4, minHeight: listItemHeight }}
                onClick={() => handleMenuTabClick(t('advancedSettings'), 'AdvancedSettingsTab', 'advancedSettings')}
              >
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><AdvancedIcon /></ListItemIcon>
                <ListItemText primary={t('advancedSettings')} sx={listItemTextStyle} />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      </Box>

      {(drawerOpen || isMobile) && (
        <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
            version: {import.meta.env.VITE_APP_VERSION || 'dev'}
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default AdminSidemenu;
