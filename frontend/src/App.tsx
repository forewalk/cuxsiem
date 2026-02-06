import { useState, useCallback, useEffect, useMemo } from "react";
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
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useAuth } from "./hooks/useAuth";
import { useLanguageStore } from "./stores/useLanguageStore";

// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";
import AdminSidemenu from "./components/AdminSidemenu";

const drawerWidth = 273;
const collapsedWidth = 72;

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

  const handleDarkModeChange = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("appDarkMode", JSON.stringify(newDarkMode));
  }, [darkMode]);

  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  // t 함수를 useMemo로 감싸서 언어 변경 시에만 재생성되도록 함
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
  }), [darkMode]);

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AdminSidemenu t={t} userRole={user?.role} drawerOpen={drawerOpen} handleDrawerToggle={handleDrawerToggle} />

        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              left: drawerOpen ? drawerWidth : collapsedWidth,
              width: `calc(100% - ${drawerOpen ? drawerWidth : collapsedWidth}px)`,
              transition: (theme) => theme.transitions.create(['width', 'left'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", px: 3, py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                  {user?.name ? `${user.name} (${user.role})` : ''}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                 <Button
                  onClick={handleLogout}
                  sx={{
                    color: theme.palette.text.primary,
                    textTransform: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "3px",
                    padding: "6px 12px",
                    "&:hover": { bgcolor: theme.palette.action.hover },
                    mr: 1,
                  }}
                >
                  {t("logout")}
                </Button>

                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: "13px",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
                  }}
                  size="small"
                >
                  <MenuItem value="ko">한국어</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ja">日本語</MenuItem>
                </Select>
                <IconButton onClick={handleDarkModeChange} sx={{ color: theme.palette.text.primary }}>
                  {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              mt: 8,
              height: 'calc(100vh - 64px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet context={{ t, language }} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
