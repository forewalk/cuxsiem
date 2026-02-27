import { useState, useCallback, useMemo, useEffect } from "react";
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
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from "@mui/material";
import { useAuth } from "./hooks/useAuth";
import { useLanguageStore } from "./stores/useLanguageStore";
import { useGlobalAlertNotification } from "./hooks/useGlobalAlertNotification";
import { GlobalAlertSnackbar } from "./pages/admin/alerts/components";
import { authService } from "./services/authService";
import { advancedSettingsService } from "./services/advancedSettingsService";
import useTabStore from "./stores/tabStore";

// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";
import cnMessages from "./locales/cn.json";
import AdminSidemenu from "./components/AdminSidemenu";

const drawerWidth = 273;
const collapsedWidth = 72;
const mobileDrawerWidth = 0;

function App() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguageStore();
  
  const { setMaxTabs } = useTabStore();
  
  useEffect(() => {
    if (user) {
      const loadSettings = async () => {
        try {
          const settings = await advancedSettingsService.getSettings();
          if (settings.tab_count) {
            setMaxTabs(settings.tab_count);
          }
        } catch (error) {
          console.error("Failed to load advanced settings:", error);
        }
      };
      loadSettings();
    }
  }, [user, setMaxTabs]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 전역 알림 시스템 (WebSocket 기반 - 다중 Snackbar)
  const token = authService.getToken();
  const { snackbars, handleCloseSnackbar } = useGlobalAlertNotification(!!user, token);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#4A5568",
      },
      background: {
        default: darkMode ? "#121212" : "#F4F5F7",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          /* 브라우저 전체 페이지 스크롤바 숨김 */
          html, body {
            overflow: hidden !important;
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          /* 내부의 모든 요소에 대해서만 스크롤바 스타일 적용 */
          ::-webkit-scrollbar {
            width: 10px !important;
            height: 10px !important;
          }
          ::-webkit-scrollbar-track {
            background: transparent !important;
          }
          ::-webkit-scrollbar-thumb {
            background-color: ${darkMode ? '#5b6b7f' : '#8895a5'} !important;
            border-radius: 10px !important;
            border: 2px solid transparent !important;
            background-clip: content-box !important;
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${darkMode ? '#718096' : '#5b6b7f'} !important;
          }
          
          /* Firefox 지원 */
          * {
            scrollbar-width: thin;
            scrollbar-color: ${darkMode ? '#5b6b7f transparent' : '#8895a5 transparent'};
          }
        `,
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

        {/* 전역 알림 스낵바 (다중 표시) */}
        <GlobalAlertSnackbar snackbars={snackbars} onClose={handleCloseSnackbar} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
