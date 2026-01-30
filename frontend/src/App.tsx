import React, { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useAuth } from "./hooks/useAuth";
import { useNavigate } from "react-router-dom";
// i18n: JSON 파일에서 번역 로드
import koMessages from "./locales/ko.json";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";

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

  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[language]?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
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

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <Typography variant="h4">로그인이 필요합니다</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box>
        {/* 헤더 - 본문과 일체감 있는 디자인 */}
        <AppBar
          position="static"
          sx={{
            backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
            boxShadow: "none",
            borderBottom: `1px solid ${darkMode ? "#2a2a2a" : "#f0f0f0"}`,
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
                  color: darkMode ? "#b0b0b0" : "#666",
                }}
              >
                {user?.name} ({user?.role})
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

        {/* Main 콘텐츠 영역 */}
        <Container maxWidth="md">
          <Box sx={{ py: 6 }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 2,
                color: darkMode ? "#ffffff" : "#333",
              }}
            >
              {t("main")}
            </Typography>
            <Box
              sx={{
                backgroundColor: darkMode ? "#2a2a2a" : FIGMA_COLORS.labelBg,
                padding: "24px",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "#ffffff" : "#333",
                }}
              >
                {t("welcome")}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: darkMode ? "#b0b0b0" : "#666",
                }}
              >
                {t("loginSuccess", { name: user?.name || "" })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: darkMode ? "#909090" : "#999",
                }}
              >
                {t("implementationComplete")}
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 2 }}>
              <Box
                sx={{
                  border: `1px solid ${
                    darkMode ? "#404040" : FIGMA_COLORS.inputBorder
                  }`,
                  backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    color: darkMode ? "#ffffff" : "#333",
                  }}
                >
                  {t("userInfo")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: darkMode ? "#b0b0b0" : "#666",
                  }}
                >
                  {t("email")}: {user?.email}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: darkMode ? "#b0b0b0" : "#666",
                  }}
                >
                  {t("role")}: {user?.role}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
