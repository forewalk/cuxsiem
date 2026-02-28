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
});
