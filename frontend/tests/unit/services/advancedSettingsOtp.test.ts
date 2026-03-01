import { describe, it, expect, vi, beforeEach } from 'vitest';
import { advancedSettingsService } from '@/services/advancedSettingsService';

// axios 인스턴스 모킹
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from '@/services/api';
const mockedApi = vi.mocked(api);

describe('advancedSettingsService - OTP 필수 설정', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSettings: otp_required=true 값을 포함한 설정을 정상 반환한다', async () => {
    // otp_required 필드가 true일 때 서비스가 해당 값을 그대로 반환해야 한다
    const mockSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      otp_required: true,
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

    const result = await advancedSettingsService.getSettings();

    expect(result.otp_required).toBe(true);
  });

  it('getSettings: otp_required=false (기본값) 설정을 정상 반환한다', async () => {
    // otp_required 필드가 false일 때 서비스가 해당 값을 그대로 반환해야 한다
    const mockSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      otp_required: false,
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

    const result = await advancedSettingsService.getSettings();

    expect(result.otp_required).toBe(false);
  });

  it('updateSettings: otp_required=true 값을 포함하여 PUT 요청을 전송한다', async () => {
    // otp_required 값을 변경할 때 PUT 요청 body에 해당 값이 포함되어야 한다
    const updatedSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      otp_required: true,
    };
    mockedApi.put = vi.fn().mockResolvedValue({ data: updatedSettings });

    const result = await advancedSettingsService.updateSettings(updatedSettings);

    expect(result.otp_required).toBe(true);
    expect(mockedApi.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ otp_required: true })
    );
  });

  it('getSettings: otp_required 필드가 없는 경우(undefined) 정상 처리된다', async () => {
    // 구버전 데이터에 otp_required 필드가 없어도 서비스가 정상 동작해야 한다
    const mockSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

    const result = await advancedSettingsService.getSettings();

    expect(result.otp_required).toBeUndefined();
  });
});
