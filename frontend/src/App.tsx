import { useState, useCallback, useMemo } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery, Snackbar, Alert } from "@mui/material";
import { useAuth } from "./hooks/useAuth";
import { useLanguageStore } from "./stores/useLanguageStore";
import { useGlobalAlertNotification } from "./hooks/useGlobalAlertNotification";

// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";
import cnMessages from "./locales/cn.json";
import AdminSidemenu from "./components/AdminSidemenu";

const drawerWidth = 273;
const collapsedWidth = 72;
const mobileDrawerWidth = 0;

const FIGMA_COLORS = {
  buttonBg: "#4A5568",
  inputBorder: "#D1DBE8",
  labelBg: "#EFF2F6",
  darkGray: "#5B6B7F",
  headerBg: "#121212",
  sidebarBg: "#1A1A1A",
  contentBg: "#F4F5F7",
};

function App() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguageStore();
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 전역 알림 시스템
  const { snackbar, handleCloseSnackbar } = useGlobalAlertNotification(!!user);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: FIGMA_COLORS.buttonBg,
      },
      background: {
        default: darkMode ? "#121212" : FIGMA_COLORS.contentBg,
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  }), [darkMode]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDarkModeChange = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("appDarkMode", JSON.stringify(newDarkMode));
  }, [darkMode]);

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
    cn: cnMessages,
  };

  const t = useMemo(() => (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || (params?.fallback || key);
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  }, [language]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  const currentDrawerWidth = isMobile 
    ? (drawerOpen ? 240 : mobileDrawerWidth) 
    : (drawerOpen ? drawerWidth : collapsedWidth);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
        <AdminSidemenu t={t} userRole={user?.role} drawerOpen={drawerOpen} handleDrawerToggle={handleDrawerToggle} />

        <Box sx={{ 
          flexGrow: 1, 
          position: 'relative',
          width: isMobile ? '100%' : `calc(100% - ${currentDrawerWidth}px)`,
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              left: isMobile ? 0 : currentDrawerWidth,
              width: isMobile ? '100%' : `calc(100% - ${currentDrawerWidth}px)`,
              transition: (theme) => theme.transitions.create(['width', 'left'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, sm: 3 }, py: { xs: 0.5, sm: 1.5 }, minHeight: { xs: 56, sm: 64 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
                {isMobile && (
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    onClick={handleDrawerToggle}
                    edge="start"
                    sx={{ mr: 0 }}
                  >
                    <Box sx={{ width: 20, height: 2, bgcolor: 'text.primary', position: 'relative', '&::before, &::after': { content: '""', position: 'absolute', width: 20, height: 2, bgcolor: 'text.primary', left: 0 }, '&::before': { top: -6 }, '&::after': { top: 6 } }} />
                  </IconButton>
                )}
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {user?.name ? `${user.name} (${user.role})` : ''}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 } }}>
                 <Button
                  onClick={handleLogout}
                  sx={{
                    color: theme.palette.text.primary,
                    textTransform: "none",
                    fontSize: { xs: "11px", sm: "13px" },
                    fontWeight: 500,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "3px",
                    padding: { xs: "4px 8px", sm: "6px 12px" },
                    "&:hover": { bgcolor: theme.palette.action.hover },
                  }}
                >
                  {t("logout")}
                </Button>

                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: { xs: "11px", sm: "13px" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
                    height: { xs: 32, sm: 40 }
                  }}
                  size="small"
                >
                  <MenuItem value="ko">한국어</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ja">日本語</MenuItem>
                  <MenuItem value="cn">简体中文</MenuItem>
                </Select>
                <IconButton onClick={handleDarkModeChange} sx={{ color: theme.palette.text.primary, p: { xs: 0.5, sm: 1 } }}>
                  {darkMode ? <Brightness7Icon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <Brightness4Icon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              mt: { xs: 7, sm: 8 },
              height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.default'
            }}
          >
            <Outlet context={{ t, language }} />
          </Box>
        </Box>

        {/* 전역 알림 스낵바 (모든 페이지에서 표시) */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: 2, mr: 2 }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={
              snackbar.severity === 'critical' || snackbar.severity === 'high' 
                ? 'error' 
                : snackbar.severity === 'medium' 
                  ? 'warning' 
                  : snackbar.severity === 'low' 
                    ? 'info' 
                    : 'info'
            }
            variant="filled"
            icon={<NotificationsActiveIcon />}
            sx={{ 
              width: '100%', 
              minWidth: 320,
              maxWidth: 500,
              boxShadow: 6,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', opacity: 0.95, mb: 0.5 }}>
                🔔 {snackbar.severity.toUpperCase()} ALERT
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {snackbar.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                {snackbar.message.length > 100 
                  ? `${snackbar.message.substring(0, 100)}...` 
                  : snackbar.message}
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
