import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextType } from "../types";

/**
 * useAuth 훅 - 인증 컨텍스트 사용
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth는 AuthProvider 내에서만 사용할 수 있습니다");
  }

  return context;
};
