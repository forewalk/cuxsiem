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

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#1976d2",
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
      copyright: "© 2026 CruxSIEM. All rights reserved.",
      emailInvalid: "유효한 이메일을 입력하세요",
      emailRequired: "이메일은 필수입니다",
      passwordRequired: "비밀번호는 필수입니다",
      passwordMin: "비밀번호는 최소 8자 이상이어야 합니다",
      passwordChar: "비밀번호에는 영문자가 포함되어야 합니다",
      passwordDigit: "비밀번호에는 숫자가 포함되어야 합니다",
      passwordPlaceholder: "최소 8자, 영문+숫자",
    },
    en: {
      loginTitle: "Sign In",
      email: "Email",
      password: "Password",
      rememberMe: "Remember me",
      loginBtn: "Sign In",
      copyright: "© 2026 CruxSIEM. All rights reserved.",
      emailInvalid: "Enter a valid email",
      emailRequired: "Email is required",
      passwordRequired: "Password is required",
      passwordMin: "Password must be at least 8 characters",
      passwordChar: "Password must contain letters",
      passwordDigit: "Password must contain numbers",
      passwordPlaceholder: "Min 8 chars, letters + numbers",
    },
    ja: {
      loginTitle: "ログイン",
      email: "メール",
      password: "パスワード",
      rememberMe: "ログイン状態を保持",
      loginBtn: "ログイン",
      copyright: "© 2026 CruxSIEM. All rights reserved.",
      emailInvalid: "有効なメールアドレスを入力してください",
      emailRequired: "メールは必須です",
      passwordRequired: "パスワードは必須です",
      passwordMin: "パスワードは8文字以上である必要があります",
      passwordChar: "パスワードには文字が含まれている必要があります",
      passwordDigit: "パスワードには数字が含まれている必要があります",
      passwordPlaceholder: "最小8文字、文字+数字",
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            CruxSIEM
          </Typography>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            sx={{ mr: 2, color: "white" }}
            size="small"
          >
            <MenuItem value="ko">한국어</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ja">日本語</MenuItem>
          </Select>
          <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
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
            padding: 4,
            boxShadow: 3,
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            mb={3}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ color: "white", fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight="bold">
              CruxSIEM
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={1}>
              {t("loginTitle")}
            </Typography>
          </Box>

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
              sx={{ mt: 3, mb: 2, height: 44 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t("loginBtn")
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            display="block"
            textAlign="center"
            color="textSecondary"
            mt={3}
          >
            {t("copyright")}
          </Typography>
        </Card>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
    </ThemeProvider>
  );
};
