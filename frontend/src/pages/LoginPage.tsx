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
  FormControlLabel,
  Checkbox,
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
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useAuth } from "../hooks/useAuth";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("ko");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [notImplementedMessage, setNotImplementedMessage] = useState("");
  const [showNotImplemented, setShowNotImplemented] = useState(false);

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

  const translations: Record<string, Record<string, string>> = {
    ko: {
      loginTitle: "로그인",
      email: "이메일",
      password: "비밀번호",
      rememberMe: "로그인 유지",
      loginBtn: "로그인",
      forgotPassword: "비밀번호 재설정",
      signup: "계정신청",
      copyright: "© 2026 cruxSIEM. All rights reserved.",
      emailInvalid: "유효한 이메일을 입력하세요",
      emailRequired: "이메일은 필수입니다",
      passwordRequired: "비밀번호는 필수입니다",
      passwordMin: "비밀번호는 최소 8자 이상이어야 합니다",
      passwordChar: "비밀번호에는 영문자가 포함되어야 합니다",
      passwordDigit: "비밀번호에는 숫자가 포함되어야 합니다",
      passwordPlaceholder: "최소 8자, 영문+숫자",
      notImplemented: "현재 구현 중입니다. 곧 지원 예정입니다.",
    },
    en: {
      loginTitle: "Sign In",
      email: "Email",
      password: "Password",
      rememberMe: "Remember me",
      loginBtn: "Sign In",
      forgotPassword: "Forgot Password?",
      signup: "Sign Up",
      copyright: "© 2026 cruxSIEM. All rights reserved.",
      emailInvalid: "Enter a valid email",
      emailRequired: "Email is required",
      passwordRequired: "Password is required",
      passwordMin: "Password must be at least 8 characters",
      passwordChar: "Password must contain letters",
      passwordDigit: "Password must contain numbers",
      passwordPlaceholder: "Min 8 chars, letters + numbers",
      notImplemented: "Currently under development. Coming soon!",
    },
    ja: {
      loginTitle: "ログイン",
      email: "メール",
      password: "パスワード",
      rememberMe: "ログイン状態を保持",
      loginBtn: "ログイン",
      forgotPassword: "パスワードをお忘れの方",
      signup: "アカウント申請",
      copyright: "© 2026 cruxSIEM. All rights reserved.",
      emailInvalid: "有効なメールアドレスを入力してください",
      emailRequired: "メールは必須です",
      passwordRequired: "パスワードは必須です",
      passwordMin: "パスワードは8文字以上である必要があります",
      passwordChar: "パスワードには文字が含まれている必要があります",
      passwordDigit: "パスワードには数字が含まれている必要があります",
      passwordPlaceholder: "最小8文字、文字+数字",
      notImplemented: "現在実装中です。近日中にサポート予定です。",
    },
  };

  const t = (key: string) => translations[language]?.[key] || key;

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = t("emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t("emailInvalid");
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
  }, [email, password, language]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!validateForm()) {
        return;
      }

      try {
        await login(email, password, rememberMe);
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail ||
          err.message ||
          "로그인에 실패했습니다";
        setError(errorMessage);
        setOpenSnackbar(true);
      }
    },
    [email, password, rememberMe, validateForm, login, navigate, language]
  );

  useEffect(() => {
    if (error) {
      setOpenSnackbar(true);
    }
  }, [error]);

  const handleNotImplemented = (feature: string) => {
    setNotImplementedMessage(t("notImplemented"));
    setShowNotImplemented(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" sx={{ backgroundColor: "#ffffff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <Toolbar sx={{ justifyContent: "flex-end", gap: 1 }}>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            sx={{
              color: "#333",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#d0d0d0",
              },
            }}
            size="small"
          >
            <MenuItem value="ko">한국어</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ja">日本語</MenuItem>
          </Select>
          <IconButton onClick={() => setDarkMode(!darkMode)} sx={{ color: "#333" }}>
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
          }}
        >
          {/* Figma 스타일 헤더 */}
          <Box
            sx={{
              background: FIGMA_COLORS.labelBg,
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
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "18px" }}>
              cruxSIEM
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: FIGMA_COLORS.darkGray, fontSize: "14px" }}
            >
              {t("loginTitle")}
            </Typography>
          </Box>

          {/* 폼 영역 */}
          <Box sx={{ padding: "32px 24px" }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                label={t("email")}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, email: "" }));
                }}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                margin="normal"
                placeholder="admin@example.com"
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

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label={t("rememberMe")}
                sx={{ mt: 1 }}
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
                    handleNotImplemented("forgotPassword");
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
                    handleNotImplemented("signup");
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
                color="textSecondary"
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
    </Container>
    </ThemeProvider>
  );
};
