import React, { useState, useCallback, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom"; // Outlet, useLocation 추가
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

// Figma 디자인 색상
const FIGMA_COLORS = {
  buttonBg: "#4A5568",
  inputBorder: "#D1DBE8",
  labelBg: "#EFF2F6",
  darkGray: "#5B6B7F",
};

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // useLocation 추가
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // localStorage에서 저장된 다크모드 읽기, 없으면 false
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState<string>(() => {
    // localStorage에서 저장된 언어 읽기, 없으면 "ko"
    return localStorage.getItem("appLanguage") || "ko";
  });

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
    let text = translations[language]?.[key] || (params?.fallback || key);
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
        default: darkMode ? "#121212" : "#ffffff",
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
      <Box sx={{ display: 'flex', minHeight: '100vh' }}> {/* Flex 컨테이너로 변경 */}
        {/* 헤더 */}
        <AppBar
          position="fixed" // 헤더 고정
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1, // Drawer 위에 오도록 zIndex 설정
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            borderBottom: `1px solid ${darkMode ? '#333' : '#eee'}`
          }}
        >
          <Toolbar
            sx={{
              justifyContent: "space-between",
              px: 3,
              py: 1.5,
            }}
          >
            {/* 왼쪽: 사용자 정보 및 로그아웃 */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "#b0b0b0" : "#333", // 라이트 모드 가독성 개선
                }}
              >
                {String(user?.name)} ({String(user?.role)})
              </Typography>
              <Button
                onClick={handleLogout}
                sx={{
                  color: FIGMA_COLORS.buttonBg,
                  textTransform: "none",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: `1px solid ${
                    darkMode ? "#404040" : FIGMA_COLORS.inputBorder
                  }`,
                  borderRadius: "3px",
                  padding: "6px 12px",
                  backgroundColor: darkMode ? "#2a2a2a" : "transparent",
                  "&:hover": {
                    backgroundColor: darkMode ? "#333" : FIGMA_COLORS.labelBg,
                  },
                }}
              >
                {t("logout")}
              </Button>
            </Box>

            {/* 오른쪽: 언어 선택 + 다크모드 (항상 같은 위치) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                sx={{
                  color: darkMode ? "#b0b0b0" : "#333",
                  fontSize: "13px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#404040" : "#d0d0d0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#505050" : "#b0b0b0",
                  },
                  "& .MuiSvgIcon-root": {
                    color: darkMode ? "#b0b0b0" : "#333",
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
                  color: darkMode ? "#b0b0b0" : "#333",
                  "&:hover": {
                    backgroundColor: darkMode ? "#2a2a2a" : "#f5f5f5",
                  },
                }}
              >
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {user?.role === 'admin' && <AdminSidemenu darkMode={darkMode} t={t} />} {/* AdminSidemenu 조건부 렌더링 */}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8, // Fixed AppBar 높이 고려
            ml: user?.role === 'admin' ? 7 : 0, // AdminSidemenu 접힌 너비만큼 좌측 마진 (나중에 동적으로 조정)
            height: 'calc(100vh - 64px)', // AppBar 높이 제외
            overflow: 'auto', // 스크롤 가능
          }}
        >
          <Outlet /> {/* 자식 라우트 콘텐츠 렌더링 */}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
