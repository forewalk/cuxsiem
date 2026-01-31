import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, IconButton, Toolbar, useTheme, Typography,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Settings as SettingsIcon,
  People as PeopleIcon, Lock as LockIcon, ExpandLess, ExpandMore, Dashboard as DashboardIcon,
} from '@mui/icons-material';
// import useTabStore from '../pages/admin/stores/tabStore'; // TabManager 통합 시 활성화

interface AdminSidemenuProps {
  darkMode: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  userRole: string | undefined; // userRole prop 추가
  drawerOpen: boolean; // App.tsx로부터 받은 drawerOpen 상태
  handleDrawerToggle: () => void; // App.tsx로부터 받은 토글 함수
}

const drawerWidth = 240;
const collapsedWidth = 72;
const iconMinWidth = 48; // 아이콘의 최소 너비 설정
const listItemHeight = 48; // ListItemButton의 높이 고정

const AdminSidemenu: React.FC<AdminSidemenuProps> = ({ darkMode, t, userRole, drawerOpen, handleDrawerToggle }) => {
  const [openAdminMenu, setOpenAdminMenu] = useState(false); // 관리자 메뉴 2단계 확장/축소 상태
  const location = useLocation();
  const theme = useTheme();

  // Drawer가 닫힐 때 하위 메뉴도 닫히도록 로직 추가
  useEffect(() => {
    if (!drawerOpen) {
      setOpenAdminMenu(false);
    }
  }, [drawerOpen]);

  const handleAdminMenuClick = () => {
    setOpenAdminMenu(!openAdminMenu);
  };

  // 배경색은 다크모드/라이트모드에 따라 Material-UI 테마 사용
  const menuBg = theme.palette.mode === 'dark' ? '#1A1A1A' : theme.palette.background.paper;
  const itemHoverBg = theme.palette.action.hover;

  // 선택된 항목의 배경 색상 (가시성 개선)
  const selectedBg = theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light;

  // 라우터 경로에 따른 활성화 상태
  const isUserManagementActive = location.pathname === '/main/users';
  const isPasswordPolicyActive = location.pathname === '/main/password-policy';
  const isAnyAdminSubMenuActive = isUserManagementActive || isPasswordPolicyActive;

  // ListItemText의 스타일을 동적으로 조정 (축소 시 공간 차지 방지 및 폰트 크기 조정)
  const listItemTextStyle = {
    opacity: drawerOpen ? 1 : 0, // drawerOpen 상태 사용
    width: drawerOpen ? 'auto' : 0, // 열렸을 때 auto, 닫혔을 때 0
    overflow: 'hidden',
    whiteSpace: 'nowrap', // 텍스트 개행 방지
    fontSize: '0.875rem', // 폰트 크기 조정 (예: 14px)
    transition: theme.transitions.create(['opacity', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  };

  return (
    <Drawer
      variant="permanent"
      open={drawerOpen} // App.tsx로부터 받은 drawerOpen 상태 사용
      sx={{
        width: drawerOpen ? drawerWidth : collapsedWidth, // drawerOpen 상태 사용
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerOpen ? drawerWidth : collapsedWidth, // drawerOpen 상태 사용
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
      {/* Drawer 토글 버튼을 Toolbar 내부에 배치 */}
      <Toolbar sx={{ justifyContent: 'space-between' }}> {/* Toolbar에 justifyContent 추가 */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* 여기에 로고 또는 앱 이름 */}
          {drawerOpen && (
            <Typography variant="h6" noWrap component="div" sx={{ ml: 1, color: theme.palette.text.primary }}>
              cruxSIEM
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            color: theme.palette.text.primary, // 아이콘 색상을 테마 텍스트 기본색으로
            // position: 'absolute' 속성 제거, Toolbar 내에서 정렬
          }}
        >
          {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flexGrow: 1 }}> {/* 가로 스크롤바 방지 */}
        <List>
          {/* 대시보드 메뉴 */}
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              component={RouterLink}
              to="/main"
              selected={location.pathname === '/main'}
              sx={{
                minHeight: listItemHeight, // 높이 고정
                justifyContent: drawerOpen ? 'initial' : 'center', // drawerOpen 상태 사용
                px: 2.5,
                bgcolor: location.pathname === '/main' ? selectedBg : 'transparent',
                color: theme.palette.text.primary, // 텍스트 색상 유지
                '&:hover': {
                  bgcolor: location.pathname === '/main' ? selectedBg : itemHoverBg,
                  color: theme.palette.text.primary, // 텍스트 색상 유지
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: iconMinWidth, // 아이콘 최소 너비 설정
                  mr: drawerOpen ? 3 : 'auto', // drawerOpen 상태 사용
                  justifyContent: 'center',
                  color: theme.palette.text.secondary, // 아이콘 색상 유지
                }}
              >
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary={t('dashboard')} sx={listItemTextStyle} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* 관리자 메뉴 (admin 역할일 때만 표시) */}
      {userRole === 'admin' && (
        <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
          <List>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={handleAdminMenuClick}
                sx={{
                  minHeight: listItemHeight, // 높이 고정
                  justifyContent: drawerOpen ? 'initial' : 'center', // drawerOpen 상태 사용
                  px: 2.5,
                  bgcolor: (openAdminMenu && drawerOpen) || isAnyAdminSubMenuActive ? selectedBg : menuBg, // 2단계 메뉴가 열려있거나 하위 메뉴가 활성화되면 배경색 변경
                  color: theme.palette.text.primary, // 텍스트 색상 유지
                  '&:hover': {
                    bgcolor: (openAdminMenu && drawerOpen) || isAnyAdminSubMenuActive ? selectedBg : itemHoverBg,
                    color: theme.palette.text.primary, // 텍스트 색상 유지
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: iconMinWidth, // 아이콘 최소 너비 설정
                    mr: drawerOpen ? 3 : 'auto', // drawerOpen 상태 사용
                    justifyContent: 'center',
                    color: theme.palette.text.secondary, // 아이콘 색상 유지
                  }}
                >
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary={t('adminMenu')} sx={listItemTextStyle} />
                {drawerOpen && ((openAdminMenu || isAnyAdminSubMenuActive) ? <ExpandLess sx={{color: theme.palette.text.secondary}} /> : <ExpandMore sx={{color: theme.palette.text.secondary}} />)}
              </ListItemButton>
            </ListItem>
            <Collapse in={openAdminMenu && drawerOpen} timeout="auto" unmountOnExit> {/* drawerOpen 상태 사용 */}
              <List component="div" disablePadding sx={{ bgcolor: theme.palette.background.default }}> {/* 2단계 메뉴 배경색 */}
                <ListItemButton
                  sx={{ pl: 4, minHeight: listItemHeight }} // 높이 고정
                  component={RouterLink}
                  to="/main/users"
                  selected={isUserManagementActive}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2, justifyContent: 'center', color: theme.palette.text.secondary }}><PeopleIcon /></ListItemIcon>
                  <ListItemText primary={t('userManagement')} sx={listItemTextStyle} />
                </ListItemButton>
                <ListItemButton
                  sx={{ pl: 4, minHeight: listItemHeight }} // 높이 고정
                  component={RouterLink}
                  to="/main/password-policy"
                  selected={isPasswordPolicyActive}
                >
                  <ListItemIcon sx={{ minWidth: iconMinWidth, mr: 2, justifyContent: 'center', color: theme.palette.text.secondary }}><LockIcon /></ListItemIcon>
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