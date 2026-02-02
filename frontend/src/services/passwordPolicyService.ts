import api from "./api";

export interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_password_age_days: number;
  password_history_count: number;
  lockout_threshold: number;
  lockout_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export const passwordPolicyService = {
  /**
   * 패스워드 정책 조회
   */
  async getPolicy(): Promise<PasswordPolicy> {
    const response = await api.get<PasswordPolicy>("/api/v1/password-policy");
    return response.data;
  },

  /**
   * 패스워드 정책 업데이트
   */
  async updatePolicy(policy: Partial<PasswordPolicy>): Promise<PasswordPolicy> {
    const response = await api.put<PasswordPolicy>("/api/v1/password-policy", policy);
    return response.data;
  },
};
