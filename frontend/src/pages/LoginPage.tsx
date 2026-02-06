import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Select,
  MenuItem,
  Snackbar,
  AppBar,
  Toolbar,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

import koMessages from "../locales/ko.json";
import enMessages from "../locales/en.json";
import jaMessages from "../locales/ja.json";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // localStorage에서 저장된 다크모드 읽기, 없으면 false
    const saved = localStorage.getItem("appDarkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState<string>(() => {
    // localStorage에서 저장된 언어 읽기, 없으면 "ko"
    return localStorage.getItem("appLanguage") || "ko";
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [notImplementedMessage, setNotImplementedMessage] = useState("");
  const [showNotImplemented, setShowNotImplemented] = useState(false);

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

  // Figma 디자인 색상
  const FIGMA_COLORS = {
    buttonBg: "#4A5568",
    inputBorder: "#D1DBE8",
    labelBg: "#EFF2F6",
    passwordDots: "#8B95A5",
    darkGray: "#5B6B7F",
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

  const translations: Record<string, any> = {
    ko: koMessages,
    en: enMessages,
    ja: jaMessages,
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const currentTranslations = translations[language] || translations["ko"] || {};
    let text = currentTranslations[key] || (params?.fallback || key);
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  };

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!username) {
      errors.username = t("idRequired", { fallback: "아이디를 입력해주세요" });
    }

    if (!password) {
      errors.password = t("passwordRequired");
    } else if (password.length < 8) {
      errors.password = t("passwordMin");
    } else if (!/[a-zA-Z]/.test(password)) {
      errors.password = t("passwordChar");
    } else if (!/\d/.test(password)) {
      errors.password = t("passwordDigit");
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [username, password, language]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!validateForm()) {
        return;
      }

      try {
        await login(username, password, false);
        navigate("/main");
      } catch (err: any) {
        console.error("Login Error:", err);
        
        let errorMessage = t("loginFailed");

        if (err.response) {
          switch (err.response.status) {
            case 401:
              // 이메일 또는 비밀번호 불일치
              errorMessage = t("checkEmailPassword");
              break;
            case 403:
              // 계정 비활성화
              errorMessage = t("accountDisabled");
              break;
            case 429:
              // 시도 횟수 초과
              errorMessage = t("tooManyAttempts");
              break;
            default:
              // 기타 에러 (백엔드 메시지가 있다면 참고하되 기본은 loginFailed)
               if (err.response.data && err.response.data.detail && typeof err.response.data.detail === 'string') {
                 // 필요시 백엔드 메시지를 직접 보여줄 수 있음
                 // errorMessage = err.response.data.detail; 
               }
              break;
          }
        }
        
        setError(errorMessage);
        setOpenSnackbar(true);
      }
    },
    [username, password, validateForm, login, navigate, language]
  );

  useEffect(() => {
    if (error) {
      setOpenSnackbar(true);
    }
  }, [error]);

  const handleNotImplemented = () => {
    setNotImplementedMessage(t("notImplemented"));
    setShowNotImplemented(true);
  };

  // 비밀번호 초기화 관련 상태
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetId, setResetId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = () => {
    setResetId("");
    setTempPassword("");
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetId) return;
    setResetLoading(true);
    try {
      const pwd = await authService.resetPassword(resetId);
      setTempPassword(pwd);
    } catch (err: any) {
      console.error(err);
      setError(t("resetFailed", { fallback: "비밀번호 초기화에 실패했습니다. 아이디를 확인해주세요." })); 
      setOpenSnackbar(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "transparent",
          boxShadow: "none",
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "flex-end",
            gap: 1,
            px: 3,
            py: 1.5,
          }}
        >
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
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="calc(100vh - 64px)"
        >
        <Card
          sx={{
            width: "100%",
            padding: 0,
            borderRadius: "8px",
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)`,
            overflow: "hidden",
            backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
          }}
        >
          {/* Figma 스타일 헤더 */}
          <Box
            sx={{
              background: darkMode ? "#2a2a2a" : FIGMA_COLORS.labelBg,
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: FIGMA_COLORS.buttonBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlinedIcon sx={{ color: "white", fontSize: 32 }} />
            </Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ fontSize: "18px", color: darkMode ? "#ffffff" : "#333" }}
            >
              cruxSIEM
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "#b0b0b0" : FIGMA_COLORS.darkGray,
                fontSize: "14px",
              }}
            >
              {t("loginTitle")}
            </Typography>
          </Box>

          {/* 폼 영역 */}
          <Box
            sx={{
              padding: "32px 24px",
              backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
            }}
          >
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                label={t("id", { fallback: "아이디" })}
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, username: "" }));
                }}
                error={!!validationErrors.username}
                helperText={validationErrors.username}
                margin="normal"
                placeholder="admin"
                disabled={isLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "3px",
                    "& fieldset": {
                      borderColor: FIGMA_COLORS.inputBorder,
                    },
                    "&:hover fieldset": {
                      borderColor: FIGMA_COLORS.inputBorder,
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label={t("password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, password: "" }));
                }}
                error={!!validationErrors.password}
                helperText={validationErrors.password}
                margin="normal"
                placeholder={t("passwordPlaceholder")}
                disabled={isLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "3px",
                    "& fieldset": {
                      borderColor: FIGMA_COLORS.inputBorder,
                    },
                    "&:hover fieldset": {
                      borderColor: FIGMA_COLORS.inputBorder,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isLoading}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  height: 44,
                  backgroundColor: FIGMA_COLORS.buttonBg,
                  borderRadius: "3px",
                  textTransform: "none",
                  fontSize: "16px",
                  fontWeight: 500,
                  "&:hover": {
                    backgroundColor: "#3a4452",
                  },
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t("loginBtn")
                )}
              </Button>

              {/* 미구현 기능 박스 */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  mt: 3,
                }}
              >
                <Link
                  component="button"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleForgotPassword();
                  }}
                  sx={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: "12px",
                    color: FIGMA_COLORS.buttonBg,
                    textDecoration: "none",
                    cursor: "pointer",
                    border: `1px solid ${FIGMA_COLORS.inputBorder}`,
                    borderRadius: "3px",
                    backgroundColor: "#fafbfc",
                    transition: "all 0.2s",
                    textAlign: "center",
                    "&:hover": {
                      backgroundColor: FIGMA_COLORS.labelBg,
                      borderColor: FIGMA_COLORS.buttonBg,
                    },
                  }}
                >
                  {t("forgotPassword")}
                </Link>
                <Link
                  component="button"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNotImplemented();
                  }}
                  sx={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: "12px",
                    color: FIGMA_COLORS.buttonBg,
                    textDecoration: "none",
                    cursor: "pointer",
                    border: `1px solid ${FIGMA_COLORS.inputBorder}`,
                    borderRadius: "3px",
                    backgroundColor: "#fafbfc",
                    transition: "all 0.2s",
                    textAlign: "center",
                    "&:hover": {
                      backgroundColor: FIGMA_COLORS.labelBg,
                      borderColor: FIGMA_COLORS.buttonBg,
                    },
                  }}
                >
                  {t("signup")}
                </Link>
              </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography
                variant="caption"
                display="block"
                textAlign="center"
                sx={{ color: darkMode ? "#888888" : "#999999" }}
              >
                {t("copyright")}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="error"
          sx={{
            width: "100%",
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: "#d32f2f",
            color: "white",
            "& .MuiAlert-icon": {
              color: "white",
            },
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showNotImplemented}
        autoHideDuration={5000}
        onClose={() => setShowNotImplemented(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowNotImplemented(false)}
          severity="warning"
          sx={{
            width: "100%",
            backgroundColor: "#ff9800",
            color: "white",
            fontSize: "15px",
            fontWeight: 600,
            "& .MuiAlert-icon": {
              color: "white",
            },
          }}
        >
          {notImplementedMessage}
        </Alert>
      </Snackbar>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>{t("resetPassword", { fallback: "비밀번호 초기화" })}</DialogTitle>
        <DialogContent>
          {!tempPassword ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                {t("resetPasswordDesc", { fallback: "사용자 아이디를 입력하면 임시 비밀번호를 발급해 드립니다." })}
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label={t("id", { fallback: "아이디" })}
                type="text"
                fullWidth
                variant="outlined"
                value={resetId}
                onChange={(e) => setResetId(e.target.value)}
              />
            </>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                {t("tempPasswordIssued", { fallback: "임시 비밀번호가 발급되었습니다." })}
              </DialogContentText>
              <Box
                sx={{
                  p: 2,
                  bgcolor: darkMode ? "#333" : "#f5f5f5",
                  borderRadius: 1,
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  userSelect: "all",
                  border: "1px dashed #ccc"
                }}
              >
                {tempPassword}
              </Box>
              <DialogContentText sx={{ mt: 2, fontSize: "0.875rem" }}>
                {t("copyPasswordDesc", { fallback: "위 비밀번호를 복사하여 로그인하세요." })}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>{t("close", { fallback: "닫기" })}</Button>
          {!tempPassword && (
            <Button onClick={handleResetPassword} disabled={resetLoading || !resetId} variant="contained" color="primary">
              {resetLoading ? <CircularProgress size={20} color="inherit" /> : t("reset", { fallback: "초기화" })}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
    </ThemeProvider>
  );
};
