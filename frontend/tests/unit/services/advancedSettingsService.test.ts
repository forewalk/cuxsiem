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

describe('advancedSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSettings: 설정을 정상적으로 반환한다', async () => {
    const mockSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

    const result = await advancedSettingsService.getSettings();

    expect(result).toEqual(mockSettings);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('updateSettings: 변경된 설정을 저장하고 반환한다', async () => {
    const updatedSettings = {
      user_register: true,
      allow_multiple_sessions: true,
      tab_count: 5,
      pixel_mode: false,
    };
    mockedApi.put = vi.fn().mockResolvedValue({ data: updatedSettings });

    const result = await advancedSettingsService.updateSettings(updatedSettings);

    expect(result).toEqual(updatedSettings);
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
  });

  it('getSettings: 로그스트리밍 설정 필드(log_stream_size, log_stream_refresh)가 포함된 설정을 반환한다', async () => {
    // 고급 설정에 새로 추가된 로그스트리밍 관련 필드가 API 응답에 포함되고 올바르게 반환되어야 한다
    const mockSettings = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      log_stream_size: 5000,
      log_stream_refresh: 30,
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

    const result = await advancedSettingsService.getSettings();

    expect(result.log_stream_size).toBe(5000);
    expect(result.log_stream_refresh).toBe(30);
  });

  it('updateSettings: log_stream_size와 log_stream_refresh를 포함하여 저장한다', async () => {
    // 로그스트리밍 설정값을 PUT 요청에 포함하여 올바르게 전송해야 한다
    const settingsWithLogStream = {
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      log_stream_size: 2000,
      log_stream_refresh: 15,
    };
    mockedApi.put = vi.fn().mockResolvedValue({ data: settingsWithLogStream });

    const result = await advancedSettingsService.updateSettings(settingsWithLogStream);

    expect(result.log_stream_size).toBe(2000);
    expect(result.log_stream_refresh).toBe(15);
    expect(mockedApi.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        log_stream_size: 2000,
        log_stream_refresh: 15,
      })
    );
  });
});
