import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, IconButton, Toolbar, useTheme,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Settings as SettingsIcon,
  People as PeopleIcon, Lock as LockIcon, ExpandLess, ExpandMore, Dashboard as DashboardIcon,
} from '@mui/icons-material';
// import useTabStore from '../pages/admin/stores/tabStore'; // TabManager 통합 시 활성화

interface AdminSidemenuProps {
  darkMode: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}

const drawerWidth = 240;
const collapsedWidth = 72;

const AdminSidemenu: React.FC<AdminSidemenuProps> = ({ darkMode, t }) => {
  const [open, setOpen] = useState(false); // 메뉴 확장/축소 상태 (사이드바 전체)
  const [openAdminMenu, setOpenAdminMenu] = useState(false); // 관리자 메뉴 2단계 확장/축소 상태
  const location = useLocation();
  // const addTab = useTabStore((state) => state.addTab); // TabManager 통합 시 활성화
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setOpen(!open);
    if (open) { // 메뉴가 닫힐 때 하위 메뉴도 닫기
      setOpenAdminMenu(false);
    }
  };

  const handleAdminMenuClick = () => {
    setOpenAdminMenu(!openAdminMenu);
    if (!open) { // 관리자 메뉴를 열면 사이드바도 확장
      setOpen(true);
    }
  };

  // TabManager 통합 시 활성화
  // const handleAddTab = (label: string, component: string, idPrefix: string) => {
  //   addTab({
  //     label,
  //     component,
  //   }, (tab) => `${idPrefix}-${Math.random().toString(36).substring(2, 9)}`); // 탭마다 고유 ID 생성
  //   if (!open) setOpen(true); // 탭 추가 시 메뉴가 닫혀있으면 열기
  // };

  const menuBg = darkMode ? '#1A1A1A' : theme.palette.background.paper;
  const activeItemBg = darkMode ? '#E0E0E0' : theme.palette.action.selected;
  const activeItemColor = darkMode ? '#1A1A1A' : theme.palette.primary.main;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          bgcolor: menuBg,
          color: theme.palette.text.primary,
          overflowX: 'hidden', // 가로 스크롤바 방지
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Toolbar /> {/* 헤더 공간 */}
      <IconButton
        onClick={handleDrawerToggle}
        sx={{
          position: 'absolute',
          top: 15,
          right: -12, // Drawer 경계에 겹치도록
          zIndex: (theme) => theme.zIndex.drawer + 2, // Drawer보다 위에
          bgcolor: theme.palette.background.paper, // 배경색 추가
          '&:hover': {
            bgcolor: theme.palette.background.paper,
          },
          ...(open && {
            transform: 'translateX(0%)',
          }),
        }}
      >
        {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {/* 대시보드 메뉴 */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={RouterLink}
              to="/main"
              selected={location.pathname === '/main'}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                bgcolor: location.pathname === '/main' ? activeItemBg : 'transparent',
                color: location.pathname === '/main' ? activeItemColor : theme.palette.text.primary,
                '&:hover': {
                  bgcolor: location.pathname === '/main' ? activeItemBg : theme.palette.action.hover,
                  color: location.pathname === '/main' ? activeItemColor : theme.palette.text.primary,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname === '/main' ? activeItemColor : theme.palette.text.secondary,
                }}
              >
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary={t('dashboard')} sx={{ opacity: open ? 1 : 0 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={handleAdminMenuClick}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                bgcolor: openAdminMenu ? activeItemBg : menuBg,
                color: openAdminMenu ? activeItemColor : theme.palette.text.primary,
                '&:hover': {
                  bgcolor: openAdminMenu ? activeItemBg : theme.palette.action.hover,
                  color: openAdminMenu ? activeItemColor : theme.palette.text.primary,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: openAdminMenu ? activeItemColor : theme.palette.text.secondary,
                }}
              >
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={t('adminMenu')} sx={{ opacity: open ? 1 : 0 }} />
              {open && (openAdminMenu ? <ExpandLess sx={{color: openAdminMenu ? activeItemColor : theme.palette.text.secondary}} /> : <ExpandMore sx={{color: openAdminMenu ? activeItemColor : theme.palette.text.secondary}} />)}
            </ListItemButton>
          </ListItem>
          <Collapse in={openAdminMenu && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ bgcolor: theme.palette.background.default }}> {/* 2단계 메뉴 배경색 */}
              <ListItemButton sx={{ pl: 4 }} component={RouterLink} to="/main/users" selected={location.pathname === '/main/users'}>
                <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center', color: theme.palette.text.secondary }}><PeopleIcon /></ListItemIcon>
                <ListItemText primary={t('userManagement')} />
              </ListItemButton>
              <ListItemButton sx={{ pl: 4 }} component={RouterLink} to="/main/password-policy" selected={location.pathname === '/main/password-policy'}>
                <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center', color: theme.palette.text.secondary }}><LockIcon /></ListItemIcon>
                <ListItemText primary={t('passwordPolicy')} />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      </Box>
    </Drawer>
  );
};

export default AdminSidemenu;
