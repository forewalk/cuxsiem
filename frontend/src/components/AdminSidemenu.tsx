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
  Language as HttpIcon,
  Router as TcpIcon,
  VerifiedUser as CertIcon,
  ListAlt as ListAltIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
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

const drawerWidth = 273;
const collapsedWidth = 72;
const mobileDrawerWidth = 240;
const iconMinWidth = 48;
const listItemHeight = 48;

const AdminSidemenu: React.FC<AdminSidemenuProps> = ({ t, userRole, drawerOpen, handleDrawerToggle }) => {
  // localStorage에서 상태 로드 (저장된 값이 없으면 기본 false)
  const [openAdminMenu, setOpenAdminMenu] = useState(() => localStorage.getItem('sidemenu_admin') === 'true');
  const [openActionMenu, setOpenActionMenu] = useState(() => localStorage.getItem('sidemenu_action') === 'true');
  const [openNotifSubMenu, setOpenNotifSubMenu] = useState(() => localStorage.getItem('sidemenu_notif') === 'true');
  const [openDashboardMenu, setOpenDashboardMenu] = useState(() => localStorage.getItem('sidemenu_dash') === 'true');
  const [openThreatMenu, setOpenThreatMenu] = useState(() => localStorage.getItem('sidemenu_threat') === 'true');
  const [openAgentMenu, setOpenAgentMenu] = useState(() => localStorage.getItem('sidemenu_agent') === 'true');
  const [openEdrMenu, setOpenEdrMenu] = useState(() => localStorage.getItem('sidemenu_edr') === 'true');
  const [openMonitorMenu, setOpenMonitorMenu] = useState(() => localStorage.getItem('sidemenu_monitor') === 'true');
  const [openHeartbeatSubMenu, setOpenHeartbeatSubMenu] = useState(() => localStorage.getItem('sidemenu_heartbeat') === 'true');

  const theme = useTheme();
  const navigate = useNavigate();
  const { addTab, activeTabId, clearAndGoHome } = useTabStore();

  const handleGoHome = () => {
    clearAndGoHome({ label: _t('threatDashboardTitle'), component: 'DashboardTab', labelKey: 'threatDashboardTitle' });
    if (!drawerOpen && !isMobile) handleDrawerToggle();
    if (isMobile) handleDrawerToggle();
    if (window.location.pathname !== '/main') navigate('/main');
  };
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 상태 변경 시 localStorage 저장
  useEffect(() => { localStorage.setItem('sidemenu_admin', openAdminMenu.toString()); }, [openAdminMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_action', openActionMenu.toString()); }, [openActionMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_notif', openNotifSubMenu.toString()); }, [openNotifSubMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_dash', openDashboardMenu.toString()); }, [openDashboardMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_threat', openThreatMenu.toString()); }, [openThreatMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_agent', openAgentMenu.toString()); }, [openAgentMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_edr', openEdrMenu.toString()); }, [openEdrMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_monitor', openMonitorMenu.toString()); }, [openMonitorMenu]);
  useEffect(() => { localStorage.setItem('sidemenu_heartbeat', openHeartbeatSubMenu.toString()); }, [openHeartbeatSubMenu]);

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

  const handleNotifMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenNotifSubMenu(!openNotifSubMenu);
  };

  const handleMonitorMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenMonitorMenu(true);
    } else {
      setOpenMonitorMenu(!openMonitorMenu);
    }
  };

  const handleHeartbeatMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenHeartbeatSubMenu(!openHeartbeatSubMenu);
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

      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
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
              sx={{
                minHeight: listItemHeight,
                px: 2.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}>
                <TerminalIcon />
              </ListItemIcon>
              <ListItemText primary={t('logStreaming')} sx={listItemTextStyle} />
            </ListItemButton>
          </ListItem>

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
              {/* Heartbeat Sub-Group */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={handleHeartbeatMenuClick}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><HeartbeatIcon /></ListItemIcon>
                <ListItemText primary={t('heartbeatMenu')} sx={listItemTextStyle} />
                {(drawerOpen || isMobile) && (openHeartbeatSubMenu ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              <Collapse in={openHeartbeatSubMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('heartbeatHttp'), 'HeartbeatHttpTab', 'heartbeatHttp')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><HttpIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('heartbeatHttp')} sx={subListItemTextStyle} />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('heartbeatTcp'), 'HeartbeatTcpTab', 'heartbeatTcp')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><TcpIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('heartbeatTcp')} sx={subListItemTextStyle} />
                  </ListItemButton>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('heartbeatCert'), 'HeartbeatCertTab', 'heartbeatCert')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><CertIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('heartbeatCert')} sx={subListItemTextStyle} />
                  </ListItemButton>
                </List>
              </Collapse>
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

          <Collapse in={openActionMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Notification Sub-Group */}
              <ListItemButton sx={{ pl: 4, minHeight: listItemHeight }} onClick={handleNotifMenuClick}>
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><NotificationsIcon /></ListItemIcon>
                <ListItemText primary={t('notificationMenu')} sx={listItemTextStyle} />
                {(drawerOpen || isMobile) && (openNotifSubMenu ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              <Collapse in={openNotifSubMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('notificationHistory'), 'NotificationHistoryTab', 'notificationHistory')}>
                    <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><HistoryIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('notificationHistory')} sx={subListItemTextStyle} />
                  </ListItemButton>
                  {userRole === 'role-1' && (
                    <ListItemButton sx={{ pl: 9, minHeight: 40 }} onClick={() => handleMenuTabClick(t('notificationRuleList'), 'NotificationRuleListTab', 'notificationRuleList')}>
                      <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 1 }}><SettingsIcon fontSize="small" /></ListItemIcon>
                      <ListItemText primary={t('notificationCenter')} sx={subListItemTextStyle} />
                    </ListItemButton>
                  )}
                </List>
              </Collapse>
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
