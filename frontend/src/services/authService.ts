import api from "./api";
import type { LoginRequest, LoginResponse, User } from "../types";

const AUTH_TOKEN_KEY = "access_token";
const AUTH_USER_KEY = "user";

export const authService = {
  /**
   * 로그인
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/api/v1/auth/login", {
      username: loginData.username,
      password: loginData.password,
      remember_me: loginData.remember_me || false,
    });

    // 토큰과 사용자 정보 저장
    const token = response.data.access_token;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.data.user));

    // API 요청에 토큰 추가
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    return response.data;
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      // 로컬 스토리지에서 토큰과 사용자 정보 제거
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);

      // API 요청에서 토큰 제거
      delete api.defaults.headers.common["Authorization"];
    }
  },

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/api/v1/auth/me");
    return response.data;
  },

  /**
   * 비밀번호 초기화 (임시 비밀번호 발급)
   */
  async resetPassword(username: string): Promise<string> {
    const response = await api.post<{ password: string }>("/api/v1/auth/reset-password", {
      username,
    });
    return response.data.password;
  },

  /**
   * 저장된 토큰 가져오기
   */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * 저장된 사용자 정보 가져오기
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * 토큰 설정 (앱 시작 시)
   */
  initializeAuth(): void {
    const token = this.getToken();
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },

  /**
   * 인증되었는지 확인
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
