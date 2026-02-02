import { useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom"; // Outlet 추가
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
// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";
import AdminSidemenu from "./components/AdminSidemenu"; // AdminSidemenu import

const drawerWidth = 273;
const collapsedWidth = 72;


// Figma 디자인 색상
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
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("App.tsx: Auth State:", { isAuthenticated, isLoading, user });
  }, [isAuthenticated, isLoading, user]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // localStorage에서 저장된 다크모드 읽기, 없으면 false
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState<string>(() => {
    // localStorage에서 저장된 언어 읽기, 없으면 "ko"
    return localStorage.getItem("appLanguage") || "ko";
  });
  const [drawerOpen, setDrawerOpen] = useState(false); // AdminSidemenu의 open 상태를 App에서 관리

  // 다크모드 변경 시 localStorage에 저장
  const handleDarkModeChange = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("appDarkMode", JSON.stringify(newDarkMode));
  }, [darkMode]);

  // 언어 변경 시 localStorage에 저장
  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem("appLanguage", newLanguage);
  }, []);

  // i18n: src/locales/*.json에서 번역 로드
  const translations: Record<string, Record<string, string>> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = (key: string, params?: Record<string, string>): string => { // t 함수 시그니처 변경
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || (params?.fallback || key);
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: FIGMA_COLORS.buttonBg,
      },
      background: {
        default: darkMode ? "#121212" : FIGMA_COLORS.contentBg,
      },
    },
  });

  // PrivateRoute에서 처리되므로 여기서는 주석 처리
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     navigate("/login", { replace: true });
  //   }
  // }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  }, [logout, navigate]);

  const handleDrawerToggle = () => { // Drawer 토글 함수를 App.tsx에서 관리
    setDrawerOpen(!drawerOpen);
  };

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  // PrivateRoute에서 인증되지 않은 사용자는 이미 리디렉션되므로 여기서는 이 분기 불필요
  // if (!isAuthenticated) {
  //   return (
  //     <ThemeProvider theme={theme}>
  //       <CssBaseline />
  //       <Box
  //         display="flex"
  //         justifyContent="center"
  //         alignItems="center"
  //         minHeight="100vh"
  //       >
  //         <Typography variant="h4">로그인이 필요합니다</Typography>
  //       </Box>
  //     </ThemeProvider>
  //   );
  // }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}> {/* 최상위 Flex 컨테이너 */}
        <AdminSidemenu t={t} userRole={user?.role} drawerOpen={drawerOpen} handleDrawerToggle={handleDrawerToggle} /> {/* AdminSidemenu는 첫 번째 Flex 아이템 */}

        <Box sx={{ flexGrow: 1, position: 'relative' }}> {/* AppBar와 main content를 감싸는 FlexGrow Box */}
          {/* 헤더 */}
          <AppBar
            position="fixed" // 헤더 고정
            elevation={0}
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: theme.palette.background.paper, // 테마 배경색 사용
              borderBottom: `1px solid ${theme.palette.divider}`, // 테마 구분선 색상 사용
              color: theme.palette.text.primary, // 텍스트 색상
              left: drawerOpen ? drawerWidth : collapsedWidth, // Drawer 너비만큼 왼쪽에서 시작
              width: `calc(100% - ${drawerOpen ? drawerWidth : collapsedWidth}px)`, // Drawer 제외한 나머지 너비
              transition: (theme) => theme.transitions.create(['width', 'left'], { // 너비와 left 속성 전환 효과
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          >
            <Toolbar
              sx={{
                justifyContent: "space-between",
                px: 3,
                py: 1.5,
              }}
            >
              {/* 왼쪽: 사용자 정보 */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                  }}
                >
                  {user?.name ? `${user.name} (${user.role})` : ''}
                </Typography>
              </Box>

              {/* 오른쪽: 로그아웃 + 언어 선택 + 다크모드 */}
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
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    mr: 1, // 언어 선택과 간격
                  }}
                >
                  {t("logout")}
                </Button>

                <Select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: "13px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.divider,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.text.secondary,
                    },
                    "& .MuiSvgIcon-root": {
                      color: theme.palette.text.secondary,
                    },
                  }}
                  size="small"
                >
                  <MenuItem value="ko">한국어</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ja">日本語</MenuItem>
                </Select>
                <IconButton
                  onClick={handleDarkModeChange}
                  sx={{
                    color: theme.palette.text.primary,
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0, // AdminPage handles padding
              mt: 8, // Fixed AppBar 높이 고려
              height: 'calc(100vh - 64px)', // AppBar 높이 제외
              overflow: 'hidden', // AdminPage handles overflow
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet /> {/* 자식 라우트 콘텐츠 렌더링 */}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;