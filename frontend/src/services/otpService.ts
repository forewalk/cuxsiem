/**
 * OTP 2단계 인증 API 서비스
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';

interface OTPEnrollResponse {
  qr_code_image: string;
  manual_key: string;
  enrollment_uri: string;
  expires_in: number;
}

interface OTPVerifyEnrollResponse {
  backup_codes: string[];
  enrolled_at: string;
}

interface OTPLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface OTPStatusResponse {
  enabled: boolean;
  enrolled_at?: string;
  backup_codes_count: number;
  is_pending: boolean;
}

export class OTPService {
  private api: AxiosInstance;
  private readonly API_BASE = '/api/v1/auth';

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * OTP 등록 시작 (QR코드 발급)
   * @returns QR코드, manual_key, enrollment_uri
   */
  async enrollOTP(): Promise<OTPEnrollResponse> {
    try {
      const response = await this.api.post<OTPEnrollResponse>(`${this.API_BASE}/otp/enroll`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'OTP 등록 실패');
    }
  }

  /**
   * OTP 활성화 확인
   * @param code - 사용자가 입력한 6자리 OTP 코드
   * @returns 백업 코드 목록 및 등록 시간
   */
  async verifyEnrollment(code: string): Promise<OTPVerifyEnrollResponse> {
    if (!code || code.length !== 6) {
      throw new Error('6자리 코드를 입력하세요');
    }

    try {
      const response = await this.api.post<OTPVerifyEnrollResponse>(
        `${this.API_BASE}/otp/verify-enroll`,
        { code }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'OTP 검증 실패');
    }
  }

  /**
   * OTP 코드로 로그인 (2단계)
   * @param code - 6자리 OTP 코드
   * @returns 정식 액세스 토큰
   */
  async loginWithOTP(code: string): Promise<OTPLoginResponse> {
    if (!code || code.length !== 6) {
      throw new Error('6자리 코드를 입력하세요');
    }

    try {
      const response = await this.api.post<OTPLoginResponse>(
        `${this.API_BASE}/otp/login`,
        { code }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'OTP 인증 실패');
    }
  }

  /**
   * 백업 코드로 로그인 (2단계 대체)
   * @param backupCode - 8자리 백업 코드
   * @returns 정식 액세스 토큰
   */
  async loginWithBackupCode(backupCode: string): Promise<OTPLoginResponse> {
    if (!backupCode || backupCode.length !== 8) {
      throw new Error('8자리 백업 코드를 입력하세요');
    }

    try {
      const response = await this.api.post<OTPLoginResponse>(
        `${this.API_BASE}/otp/login/backup`,
        { backup_code: backupCode.toUpperCase() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, '백업 코드 인증 실패');
    }
  }

  /**
   * OTP 비활성화
   * @param code - OTP 코드 또는 백업 코드
   * @param useBackupCode - 백업 코드 사용 여부
   */
  async disableOTP(code: string, useBackupCode: boolean = false): Promise<void> {
    if (!code) {
      throw new Error('코드를 입력하세요');
    }

    try {
      const payload = useBackupCode
        ? { backup_code: code.toUpperCase() }
        : { code };

      await this.api.delete(`${this.API_BASE}/otp`, { data: payload });
    } catch (error) {
      throw this.handleError(error, 'OTP 비활성화 실패');
    }
  }

  /**
   * 사용자 OTP 상태 조회
   * @param userId - 사용자 ID
   * @returns OTP 상태 정보
   */
  async getOTPStatus(userId?: string): Promise<OTPStatusResponse | null> {
    // NOTE: 별도의 상태 조회 엔드포인트는 정의되지 않음
    // 로그인 후 사용자 정보에서 OTP 상태를 확인
    return null;
  }

  /**
   * 관리자 - 사용자 OTP 강제 해제
   * @param userId - 대상 사용자 ID
   */
  async adminDisableOTP(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다');
    }

    try {
      await this.api.delete(`${this.API_BASE}/admin/users/${userId}/otp`);
    } catch (error) {
      throw this.handleError(error, 'OTP 강제 해제 실패');
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || defaultMessage;
      return new Error(message);
    }
    return new Error(defaultMessage);
  }
}

/**
 * OTP 서비스 싱글톤 인스턴스
 */
let otpServiceInstance: OTPService | null = null;

export function getOTPService(apiClient: AxiosInstance): OTPService {
  if (!otpServiceInstance) {
    otpServiceInstance = new OTPService(apiClient);
  }
  return otpServiceInstance;
}

export default OTPService;
