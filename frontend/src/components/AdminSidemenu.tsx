import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, IconButton, Toolbar, useTheme, Typography,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Settings as SettingsIcon,
  People as PeopleIcon, Lock as LockIcon, ExpandLess, ExpandMore, Dashboard as DashboardIcon,
  ShowChart as ThreatsIcon, Terminal as TerminalIcon, Close as CloseIcon,
  Notifications as NotificationsIcon, ListAlt as ListAltIcon, History as HistoryIcon,
  Tune as AdvancedIcon,
} from '@mui/icons-material';
import useTabStore from '../stores/tabStore';

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
  const [openAdminMenu, setOpenAdminMenu] = useState(false);
  const [openNotificationMenu, setOpenNotificationMenu] = useState(false);
  const [openDashboardMenu, setOpenDashboardMenu] = useState(true); // 기본적으로 열림
  const theme = useTheme();
  const navigate = useNavigate();
  const { addTab, activeTabId } = useTabStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 사이드바가 닫힐 때 하위 메뉴를 강제로 닫지 않고, UI에서만 숨기도록 제어합니다.
  // 텍스트와 아이콘 배치는 Drawer의 open 상태에 따라 결정됩니다.

  const handleAdminMenuClick = () => {
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenAdminMenu(true);
    } else {
      setOpenAdminMenu(!openAdminMenu);
    }
  };

  const handleNotificationMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!drawerOpen && !isMobile) {
      handleDrawerToggle();
      setOpenNotificationMenu(true);
    } else {
      setOpenNotificationMenu(!openNotificationMenu);
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

  const handleMenuTabClick = (label: string, component: string, labelKey?: string) => {
    addTab({ label, component, labelKey });
    if (isMobile) handleDrawerToggle(); // 모바일에서는 클릭 후 사이드바 닫기
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
      <Toolbar sx={{ justifyContent: 'space-between', px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {(drawerOpen || isMobile) && (
            <Typography variant="h6" noWrap sx={{ ml: 1, fontWeight: 'bold' }}>
              cruxSIEM
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleDrawerToggle}>
          {isMobile ? <CloseIcon /> : (drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
        </IconButton>
      </Toolbar>
      
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        <List>
          {/* Dashboard Menu */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={handleDashboardMenuClick} sx={{ minHeight: listItemHeight, px: 2.5 }}>
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: (drawerOpen || isMobile) ? 3 : 'auto' }}><DashboardIcon /></ListItemIcon>
              <ListItemText primary={t('dashboard')} sx={listItemTextStyle} />
              {(drawerOpen || isMobile) && (openDashboardMenu ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          </ListItem>
          
          <Collapse in={openDashboardMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                sx={{ pl: 4, minHeight: listItemHeight }}
                onClick={() => handleMenuTabClick(t('threats'), 'DashboardTab', 'threats')}
              >
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}><ThreatsIcon /></ListItemIcon>
                <ListItemText primary={t('threats')} sx={listItemTextStyle} />
              </ListItemButton>
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
        </List>
      </Box>

      {userRole === 'admin' && (
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

                {/* Notification Center Accordion */}
                <ListItemButton
                  sx={{ pl: 4, minHeight: listItemHeight }}
                  onClick={handleNotificationMenuClick}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('notificationCenter')} sx={listItemTextStyle} />
                  {(drawerOpen || isMobile) && (openNotificationMenu ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>

                <Collapse in={openNotificationMenu && (drawerOpen || isMobile)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItemButton
                      sx={{ pl: 6, minHeight: listItemHeight }}
                      onClick={() => handleMenuTabClick(t('notificationRuleList'), 'NotificationRuleListTab', 'notificationRuleList')}
                    >
                      <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}>
                        <ListAltIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t('notificationRuleList')} sx={listItemTextStyle} />
                    </ListItemButton>
                    <ListItemButton
                      sx={{ pl: 6, minHeight: listItemHeight }}
                      onClick={() => handleMenuTabClick(t('notificationHistory'), 'NotificationHistoryTab', 'notificationHistory')}
                    >
                      <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2 }}>
                        <HistoryIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={t('notificationHistory')} sx={listItemTextStyle} />
                    </ListItemButton>
                  </List>
                </Collapse>

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
      )}
    </Drawer>
  );
};

export default AdminSidemenu;
