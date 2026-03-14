import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { createPixelTheme } from "./theme";

// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";
import cnMessages from "./locales/cn.json";
import AdminSidemenu from "./components/AdminSidemenu";
import { useRoleCodesStore } from "./stores/useRoleCodesStore";
import NotificationBell from "./components/NotificationBell";
import { getRoleName } from "./utils/roleUtils";

const drawerWidth = 273;
const collapsedWidth = 72;
const mobileDrawerWidth = 0;

function App() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguageStore();
  const { roleNames, fetch: fetchRoleCodes } = useRoleCodesStore();
  
  const { setMaxTabs } = useTabStore();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [pixelMode, setPixelMode] = useState<boolean>(() => {
    return localStorage.getItem("appPixelMode") === "true";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 픽셀 모드 마우스 트레일러 (ref로 DOM 직접 제어 — 상태 변경 없이 성능 유지)
  const trailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (user) fetchRoleCodes();
  }, [user, fetchRoleCodes]);

  useEffect(() => {
    if (!pixelMode) return;
    const onMove = (e: MouseEvent) => {
      if (trailRef.current) {
        trailRef.current.style.left = `${e.clientX - 4}px`;
        trailRef.current.style.top = `${e.clientY - 4}px`;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [pixelMode]);

  // 로그인 후 서버 설정 로드 (탭 수, 픽셀 모드)
  useEffect(() => {
    if (user) {
      const loadSettings = async () => {
        try {
          const settings = await advancedSettingsService.getSettings();
          if (settings.tab_count) {
            setMaxTabs(settings.tab_count);
          }
          if (settings.pixel_mode !== undefined) {
            setPixelMode(settings.pixel_mode);
            localStorage.setItem("appPixelMode", String(settings.pixel_mode));
          }
        } catch (error) {
          console.error("Failed to load advanced settings:", error);
        }
      };
      loadSettings();
    }
  }, [user, setMaxTabs]);

  // 픽셀 모드 변경 시 폰트 동적 로드/제거
  useEffect(() => {
    if (pixelMode) {
      if (!document.getElementById("pixel-font-link")) {
        const link = document.createElement("link");
        link.id = "pixel-font-link";
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap";
        document.head.appendChild(link);
      }
    } else {
      document.getElementById("pixel-font-link")?.remove();
    }
  }, [pixelMode]);

  // AdvancedSettingsTab 저장 시 발생하는 픽셀 모드 변경 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const { pixelMode: newMode } = (e as CustomEvent).detail;
      setPixelMode(newMode);
      localStorage.setItem("appPixelMode", String(newMode));
    };
    window.addEventListener("pixelModeChanged", handler);
    return () => window.removeEventListener("pixelModeChanged", handler);
  }, []);

  // 전역 알림 시스템 (WebSocket 기반 - 다중 Snackbar)
  const token = authService.getToken();
  const { snackbars, handleCloseSnackbar, unreadCount, resetUnreadCount } = useGlobalAlertNotification(!!user, token);
  
  const theme = useMemo(() => {
    if (pixelMode) return createPixelTheme();
    return createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#4A5568",
      },
      background: {
        default: darkMode ? "#121212" : "#F4F5F7",
        paper: darkMode ? "#1E1E1E" : "#FFFFFF",
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
            width: 12px;
            height: 12px;
            display: block !important;
          }
          ::-webkit-scrollbar-track {
            background: ${darkMode ? '#2d2d2d' : '#e0e0e0'} !important;
            border-radius: 0px;
          }
          ::-webkit-scrollbar-thumb {
            background-color: ${darkMode ? '#5b6b7f' : '#8895a5'} !important;
            border-radius: 0px;
            border: 1px solid ${darkMode ? '#2d2d2d' : '#e0e0e0'};
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${darkMode ? '#718096' : '#5b6b7f'} !important;
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
  }); }, [darkMode, pixelMode]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const ROLE_BADGES: Record<string, string> = {
    admin: '[ADMIN]',
    monitoring: '[MON]',
    approver: '[APV]',
    user: '[USR]',
  };

  const handleDarkModeChange = useCallback(() => {
    if (pixelMode) {
      // 픽셀 모드 해제 후 라이트/다크로 복귀 (UI 즉시 반응, 백엔드 비동기 저장)
      setPixelMode(false);
      localStorage.setItem("appPixelMode", "false");
      // AdvancedSettingsTab 스위치 UI 동기화
      window.dispatchEvent(new CustomEvent('pixelModeChanged', { detail: { pixelMode: false } }));
      advancedSettingsService.getSettings()
        .then((current) => advancedSettingsService.updateSettings({ ...current, pixel_mode: false }))
        .catch(console.error);
      return;
    }
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("appDarkMode", JSON.stringify(newDarkMode));
  }, [darkMode, pixelMode]);

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
      <style>
        {`
          @media print {
            /* 1. 불필요한 UI 숨기기 */
            header, nav, .MuiDrawer-root, .no-print, button, .MuiAppBar-root, .MuiTabs-root, footer, .MuiIconButton-root {
              display: none !important;
            }

            /* 2. 하단 잘림 방지: 최상위부터 하위까지 높이 제한 완전 해제 */
            html, body, #root, [role="main"], main {
              height: auto !important;
              min-height: 100% !important;
              overflow: visible !important;
              display: block !important;
            }

            /* 대시보드 각 탭의 컨테이너 (id로 직접 타겟팅) */
            #threat-list-tab-container,
            #agent-list-tab-container,
            .MuiBox-root[id$="-tab-container"] {
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              display: block !important;
            }

            /* 3. 대시보드 그리드 컨테이너: CSS Grid 사용 (인쇄 호환성 및 배치 유지 최적) */
            #threat-dashboard-grid-container, 
            #agent-dashboard-grid-container {
              display: block !important; /* Grid도 인쇄시 불안정할 수 있어 Block을 기반으로 하되 */
              /* 만약 block으로도 안되면, 아예 float를 씁니다 */
            }

            /* 4. 패널 배치: float 사용 (가장 고전적이고 확실한 방법) */
            #threat-dashboard-grid-container > div,
            #agent-dashboard-grid-container > div {
              float: left !important; /* 왼쪽으로 붙임 */
              display: block !important;
              
              /* 간격 확보 */
              padding: 8px !important;
              margin: 0 !important;
              
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: auto !important;
              
              box-sizing: border-box !important;
            }

            /* Clearfix */
            #threat-dashboard-grid-container::after, 
            #agent-dashboard-grid-container::after {
              content: "";
              display: table;
              clear: both;
            }

            .MuiPaper-root {
              height: 100% !important;
              background-color: white !important;
              border: 1px solid #eee !important;
              box-shadow: none !important;
            }

            /* 5. 색상 및 폰트 최적화 */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            body {
              background-color: white !important;
              color: black !important;
            }

            svg {
              max-width: 100% !important;
            }

            /* 차트 내 축 라벨 폰트 크기 축소 (겹침 방지) */
            #threat-dashboard-grid-container .MuiTypography-caption {
              font-size: 8px !important;
              line-height: 1 !important;
            }
          }
        `}
      </style>
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
                  {user?.name ? (pixelMode ? `${ROLE_BADGES[user.role] || '[???]'} ${user.name}` : `${user.name} (${getRoleName(user.role, roleNames, language)})`) : ''}
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
                    height: { xs: 32, sm: 40 },
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
                {user && (
                  <NotificationBell unreadCount={unreadCount} onOpen={resetUnreadCount} />
                )}
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
            <Outlet context={{ t, language, pixelMode }} />
          </Box>
        </Box>

        {/* 전역 알림 스낵바 (다중 표시) */}
        <GlobalAlertSnackbar snackbars={snackbars} onClose={handleCloseSnackbar} />
      </Box>

      {/* 픽셀 모드: 마우스 트레일러 */}
      {pixelMode && (
        <div
          ref={trailRef}
          style={{
            position: 'fixed',
            left: -20,
            top: -20,
            width: 8,
            height: 8,
            backgroundColor: '#00FF9C',
            pointerEvents: 'none',
            zIndex: 999999,
            boxShadow: '0 0 6px #00FF9C, 0 0 14px #00FF9C66',
            transition: 'left 0.07s linear, top 0.07s linear',
          }}
        />
      )}

      {/* 픽셀 모드: 하단 마르키 전광판 */}
      {pixelMode && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 22,
          backgroundColor: '#0D0E1A',
          borderTop: '1px solid #00FF9C44',
          overflow: 'hidden',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <style>{`
            @keyframes pixelMarquee {
              0%   { transform: translateX(100vw); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
          <span style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            animation: 'pixelMarquee 28s linear infinite',
            color: '#00FF9C',
            fontSize: '11px',
            fontFamily: "'DotGothic16', 'Courier New', monospace",
            lineHeight: '22px',
            paddingLeft: '100vw',
          }}>
            {'>> CRUX SIEM // PIXEL MODE ACTIVATED // ALL SYSTEMS NOMINAL // THREAT LEVEL: NORMAL // MONITORING ALL CHANNELS // LOGS INCOMING // 픽셀 모드 활성화됨 // 시스템 이상 없음 // 위협 탐지 중 // NO ANOMALIES DETECTED // STAND BY <<'}
          </span>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
