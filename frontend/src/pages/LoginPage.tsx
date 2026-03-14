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
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { advancedSettingsService } from "../services/advancedSettingsService";
import AccountApplyModal from "../components/auth/AccountApplyModal";
import OTPLoginModal from "../components/auth/OTPLoginModal";
import OTPEnrollModal from "../components/auth/OTPEnrollModal";
import api from "../services/api";

import koMessages from "../locales/ko.json";
import enMessages from "../locales/en.json";
import jaMessages from "../locales/ja.json";
import cnMessages from "../locales/cn.json";

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
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [userRegisterEnabled, setUserRegisterEnabled] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpLoginModalOpen, setOtpLoginModalOpen] = useState(false);
  const [otpEnrollAfterSignupOpen, setOtpEnrollAfterSignupOpen] = useState(false);
  const [signupSuccessMsg, setSignupSuccessMsg] = useState('');

  useEffect(() => {
    // 고급 설정(사용자 가입 활성화 여부, OTP 필수 여부) 로드 - 공개 엔드포인트 사용
    const loadAdvancedSettings = async () => {
      try {
        const settings = await advancedSettingsService.getPublicSettings();
        setUserRegisterEnabled(settings.user_register);
        setOtpRequired(settings.otp_required ?? false);
      } catch (err) {
        console.error("Failed to load advanced settings:", err);
        // 기본값은 false로 유지
      }
    };
    loadAdvancedSettings();
  }, []);

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
    cn: cnMessages,
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

        // 로그인 성공 후 OTP 상태 확인
        try {
          const response = await api.get("/api/v1/auth/me");
          if (response.data?.otp_enabled === true) {
            // OTP가 활성화되어 있으면 2FA 모달
            setOtpLoginModalOpen(true);
            return;
          }
          // OTP 미등록 + otp_required ON + 관리자 제외 → 강제 등록
          if (!response.data?.otp_enabled && otpRequired && response.data?.role !== 'role-1') {
            setOtpEnrollAfterSignupOpen(true);
            return;
          }
        } catch (otpErr) {
          console.error("OTP 상태 확인 실패:", otpErr);
          // OTP 확인 실패해도 로그인 진행
        }

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
            case 409:
              // 다중 접속 감지
              if (err.response.data?.detail === "MULTIPLE_SESSION_DETECTED") {
                setConflictDialogOpen(true);
                return;
              }
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

  const handleForceLogin = async () => {
    setConflictDialogOpen(false);
    try {
      await login(username, password, false, true);
      // 강제 로그인 후에도 OTP 상태 확인
      try {
        const response = await api.get("/api/v1/auth/me");
        if (response.data?.otp_enabled === true) {
          setOtpLoginModalOpen(true);
          return;
        }
        if (!response.data?.otp_enabled && otpRequired && response.data?.role !== 'role-1') {
          setOtpEnrollAfterSignupOpen(true);
          return;
        }
      } catch (otpErr) {
        console.error("OTP 상태 확인 실패:", otpErr);
      }
      navigate("/main");
    } catch (err: any) {
      console.error("Force Login Error:", err);
      setError(t("loginFailed"));
      setOpenSnackbar(true);
    }
  };

  useEffect(() => {
    if (error) {
      setOpenSnackbar(true);
    }
  }, [error]);

  useEffect(() => {
    // 다중 접속 강제 로그아웃 감지
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "multiple_login") {
      setError(t("multipleSessionLogout", { fallback: "다른 기기에서 로그인하여 로그아웃되었습니다." }));
      // URL 파라미터 정리
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [language]);

  // 다중 접속 알림 다이얼로그 상태
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // 비밀번호 초기화 관련 상태
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetId, setResetId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [otpResetModalOpen, setOtpResetModalOpen] = useState(false);
  const [otpResetCode, setOtpResetCode] = useState("");

  const handleForgotPassword = () => {
    setResetId("");
    setTempPassword("");
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetId.trim()) {
      setError(t("enterUserId"));
      setOpenSnackbar(true);
      return;
    }

    setResetLoading(true);
    try {
      // 1차 시도 (OTP 없이)
      const pwd = await authService.resetPassword(resetId);
      setTempPassword(pwd);
      setResetId("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;

      // OTP 등록 필요
      if (detail === "OTP_ENROLLMENT_REQUIRED") {
        setError(t("otpEnrollmentRequired"));
        setOpenSnackbar(true);
        setResetDialogOpen(false);
        return;
      }

      // OTP 검증 필요
      if (detail === "OTP_VERIFICATION_REQUIRED") {
        setResetDialogOpen(false);
        setOtpResetModalOpen(true);
        return;
      }

      // 기타 에러
      setError(detail || t("resetFailed"));
      setOpenSnackbar(true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleOtpResetSubmit = async () => {
    if (!otpResetCode.trim() || otpResetCode.length !== 6) {
      setError(t("enterOtp6Digit"));
      setOpenSnackbar(true);
      return;
    }

    setResetLoading(true);
    try {
      const pwd = await authService.resetPassword(resetId, otpResetCode);
      setTempPassword(pwd);
      setOtpResetModalOpen(false);
      setOtpResetCode("");
      setResetDialogOpen(true);
    } catch (err: any) {
      setError(t("otpVerifyFailed"));
      setOpenSnackbar(true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleOTPSuccess = (_accessToken: string) => {
    setOtpLoginModalOpen(false);
    navigate("/main");
  };

  const handleApplySuccess = async (credentials: { username: string; password: string }) => {
    // 신청 완료 후 자동 로그인 시도, 성공 시 OTP 등록 모달 표시
    try {
      await login(credentials.username, credentials.password, false);
      // OTP 필수 여부와 관계없이 OTP 등록 권유
      setOtpEnrollAfterSignupOpen(true);
    } catch {
      // 자동 로그인 실패 (관리자 승인 필요 등) 시 일반 안내
      setSignupSuccessMsg(t('applySuccess'));
      setOpenSnackbar(true);
    }
  };

  const handleEnrollAfterSignupSuccess = () => {
    setOtpEnrollAfterSignupOpen(false);
    navigate("/main");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* OTP 로그인 모달 */}
      <OTPLoginModal
        open={otpLoginModalOpen}
        onClose={() => setOtpLoginModalOpen(false)}
        onSuccess={handleOTPSuccess}
        apiClient={api}
      />

      {/* 회원가입 후 OTP 등록 모달 */}
      <OTPEnrollModal
        open={otpEnrollAfterSignupOpen}
        onClose={() => { setOtpEnrollAfterSignupOpen(false); navigate("/main"); }}
        onSuccess={handleEnrollAfterSignupSuccess}
        apiClient={api}
      />
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
            <MenuItem value="cn">简体中文</MenuItem>
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
              background: darkMode ? "#2a2a2a" : "#ffffff",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              <img 
                src="/cruxsiem_vertical.svg" 
                alt="Logo" 
                style={{ width: "100%", height: "100%", objectFit: "contain" }} 
              />
            </Box>
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

              {/* 비밀번호 재설정 / 계정신청 버튼 영역 */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  mt: 3,
                  justifyContent: userRegisterEnabled ? "stretch" : "center",
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
                    flex: userRegisterEnabled ? 1 : "none",
                    padding: "10px 16px",
                    minWidth: userRegisterEnabled ? "auto" : "200px",
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
                
                {userRegisterEnabled && (
                  <Link
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setApplyModalOpen(true);
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
                )}
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
              <Typography
                variant="caption"
                display="block"
                textAlign="center"
                sx={{ color: darkMode ? "#555555" : "#cccccc", mt: 0.5 }}
              >
                version: {import.meta.env.VITE_APP_VERSION || 'dev'}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => { setOpenSnackbar(false); setSignupSuccessMsg(''); }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => { setOpenSnackbar(false); setSignupSuccessMsg(''); }}
          severity={signupSuccessMsg ? "success" : "error"}
          sx={{
            width: "100%",
            fontSize: "14px",
            fontWeight: 500,
            ...(signupSuccessMsg ? {} : {
              backgroundColor: "#d32f2f",
              color: "white",
              "& .MuiAlert-icon": { color: "white" },
            }),
          }}
        >
          {signupSuccessMsg || error}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resetId && !resetLoading) {
                    e.preventDefault();
                    handleResetPassword();
                  }
                }}
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

      {/* 다중 접속 확인 다이얼로그 */}
      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)}>
        <DialogTitle>{t("multipleSessionDetected", { fallback: "다중 접속 감지" })}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("multipleSessionMsg", { fallback: "해당 계정은 이미 다른 기기에서 로그인되어 이용 중입니다. 기존 접속을 끊고 로그인하시겠습니까?" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialogOpen(false)}>
            {t("multipleSessionCancel", { fallback: "아니오" })}
          </Button>
          <Button onClick={handleForceLogin} variant="contained" color="primary">
            {t("multipleSessionConfirm", { fallback: "예" })}
          </Button>
        </DialogActions>
      </Dialog>

      <AccountApplyModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onSuccess={handleApplySuccess}
      />

      {/* OTP 검증 모달 (비밀번호 초기화용) */}
      <Dialog
        open={otpResetModalOpen}
        onClose={() => {
          setOtpResetModalOpen(false);
          setOtpResetCode("");
        }}
      >
        <DialogTitle>{t("otpVerificationRequired")}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t("enterOtp6Digit")}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t("otpCode")}
            type="text"
            fullWidth
            variant="outlined"
            value={otpResetCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtpResetCode(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otpResetCode.length === 6 && !resetLoading) {
                e.preventDefault();
                handleOtpResetSubmit();
              }
            }}
            inputProps={{ maxLength: 6, inputMode: "numeric", pattern: "[0-9]*" }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOtpResetModalOpen(false);
              setOtpResetCode("");
              setResetDialogOpen(true);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleOtpResetSubmit}
            disabled={resetLoading || otpResetCode.length !== 6}
            variant="contained"
            color="primary"
          >
            {resetLoading ? <CircularProgress size={20} color="inherit" /> : t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </ThemeProvider>
  );
};