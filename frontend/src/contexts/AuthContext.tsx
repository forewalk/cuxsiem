import React, { createContext, useEffect, useState, useCallback } from "react";
import type { AuthContextType, User } from "../types";
import { authService } from "../services/authService";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 앱 시작 시 저장된 인증 정보 복구
  useEffect(() => {
    const initAuth = async () => {
      try {
        authService.initializeAuth();

        const storedUser = authService.getStoredUser();
        if (storedUser && authService.getToken()) {
          setUser(storedUser);
          setIsAuthenticated(true);

          // 백엔드에서 최신 사용자 정보 확인 (선택사항)
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
          } catch (error) {
            // 토큰이 만료되었거나 유효하지 않음
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      setIsLoading(true);
      try {
        const response = await authService.login({
          email,
          password,
          remember_me: rememberMe,
        });

        setUser(response.user);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // 토큰이 만료되었거나 유효하지 않음
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
