import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, IconButton, Toolbar, useTheme, Typography,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Settings as SettingsIcon,
  People as PeopleIcon, Lock as LockIcon, ExpandLess, ExpandMore, Dashboard as DashboardIcon,
} from '@mui/icons-material';
import useTabStore from '../pages/admin/stores/tabStore';

interface AdminSidemenuProps {
  darkMode: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  userRole: string | undefined;
  drawerOpen: boolean;
  handleDrawerToggle: () => void;
}

const drawerWidth = 273;
const collapsedWidth = 72;
const iconMinWidth = 48;
const listItemHeight = 48;

const FIGMA_COLORS = {
  sidebarBg: "#1A1A1A",
  selectedItemBg: "#E0E0E0",
  activeText: "#000000",
};

const AdminSidemenu: React.FC<AdminSidemenuProps> = ({ darkMode, t, userRole, drawerOpen, handleDrawerToggle }) => {
  const [openAdminMenu, setOpenAdminMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const addTab = useTabStore((state) => state.addTab);

  useEffect(() => {
    if (!drawerOpen) {
      setOpenAdminMenu(false);
    }
  }, [drawerOpen]);

  const handleAdminMenuClick = () => {
    setOpenAdminMenu(!openAdminMenu);
  };

  const handleAdminSubMenuClick = (label: string, component: string) => {
    addTab({ label, component });
    if (location.pathname !== '/main/admin') {
      navigate('/main/admin');
    }
  };

  const menuBg = darkMode ? '#1A1A1A' : FIGMA_COLORS.sidebarBg;
  const itemHoverBg = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  const selectedBg = FIGMA_COLORS.selectedItemBg;

  const isAnyAdminSubMenuActive = location.pathname === '/main/admin';

  const listItemTextStyle = {
    opacity: drawerOpen ? 1 : 0,
    width: drawerOpen ? 'auto' : 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
    transition: theme.transitions.create(['opacity', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  };

  return (
    <Drawer
      variant="permanent"
      open={drawerOpen}
      sx={{
        width: drawerOpen ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerOpen ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          bgcolor: menuBg,
          color: '#FFFFFF', // Text is mostly white in dark sidebar
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {drawerOpen && (
            <Typography variant="h6" noWrap component="div" sx={{ ml: 1, color: '#FFFFFF', fontWeight: 'bold' }}>
              cruxSIEM
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: '#FFFFFF' }}>
          {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      
      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flexGrow: 1 }}>
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={() => navigate('/main')}
              selected={location.pathname === '/main'}
              sx={{
                minHeight: listItemHeight,
                justifyContent: drawerOpen ? 'initial' : 'center',
                px: 2.5,
                color: '#FFFFFF',
                '&.Mui-selected': {
                  bgcolor: selectedBg,
                  color: FIGMA_COLORS.activeText,
                  '& .MuiListItemIcon-root': { color: FIGMA_COLORS.activeText },
                },
                '&:hover': {
                  bgcolor: itemHoverBg,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: iconMinWidth, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary={t('dashboard')} sx={listItemTextStyle} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {userRole === 'admin' && (
        <Box sx={{ mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <List>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={handleAdminMenuClick}
                sx={{
                  minHeight: listItemHeight,
                  justifyContent: drawerOpen ? 'initial' : 'center',
                  px: 2.5,
                  color: '#FFFFFF',
                  bgcolor: (openAdminMenu && drawerOpen) || isAnyAdminSubMenuActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  '&:hover': {
                    bgcolor: itemHoverBg,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: iconMinWidth, mr: drawerOpen ? 3 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary={t('adminMenu')} sx={listItemTextStyle} />
                {drawerOpen && ((openAdminMenu || isAnyAdminSubMenuActive) ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>
            <Collapse in={openAdminMenu && drawerOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    minHeight: listItemHeight,
                    color: '#FFFFFF',
                    '&:hover': { bgcolor: itemHoverBg }
                  }}
                  onClick={() => handleAdminSubMenuClick(t('userManagement'), 'UserManagementTab')}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2, justifyContent: 'center', color: 'inherit' }}><PeopleIcon /></ListItemIcon>
                  <ListItemText primary={t('userManagement')} sx={listItemTextStyle} />
                </ListItemButton>
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    minHeight: listItemHeight,
                    color: '#FFFFFF',
                    '&:hover': { bgcolor: itemHoverBg }
                  }}
                  onClick={() => handleAdminSubMenuClick(t('passwordPolicy'), 'PasswordPolicyTab')}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2, justifyContent: 'center', color: 'inherit' }}><LockIcon /></ListItemIcon>
                  <ListItemText primary={t('passwordPolicy')} sx={listItemTextStyle} />
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
