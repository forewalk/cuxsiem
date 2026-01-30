import React, { useState, useCallback } from "react";
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
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../hooks/useAuth";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // 이메일 검증
    if (!email) {
      errors.email = "이메일은 필수입니다";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "유효한 이메일을 입력하세요";
    }

    // 비밀번호 검증
    if (!password) {
      errors.password = "비밀번호는 필수입니다";
    } else if (password.length < 8) {
      errors.password = "비밀번호는 최소 8자 이상이어야 합니다";
    } else if (!/[a-zA-Z]/.test(password)) {
      errors.password = "비밀번호에는 영문자가 포함되어야 합니다";
    } else if (!/\d/.test(password)) {
      errors.password = "비밀번호에는 숫자가 포함되어야 합니다";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

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
      }
    },
    [email, password, rememberMe, validateForm, login, navigate]
  );

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
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
              로그인
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="이메일"
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
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setValidationErrors((prev) => ({ ...prev, password: "" }));
              }}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              margin="normal"
              placeholder="최소 8자, 영문+숫자"
              disabled={isLoading}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
              }
              label="로그인 유지"
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
                "로그인"
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
            © 2026 CruxSIEM. All rights reserved.
          </Typography>
        </Card>
      </Box>
    </Container>
  );
};
