import { describe, it, expect, vi, beforeEach } from 'vitest';
import { passwordPolicyService } from '@/services/passwordPolicyService';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import api from '@/services/api';
const mockedApi = vi.mocked(api);

describe('passwordPolicyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPolicy: 정책을 정상적으로 반환한다', async () => {
    const mockPolicy = {
      id: 'password',
      min_length: 8,
      require_uppercase: false,
      require_lowercase: false,
      require_numbers: false,
      require_special_chars: false,
      max_password_age_days: 90,
      password_history_count: 3,
      lockout_threshold: 5,
      lockout_duration_minutes: 30,
      created_at: '2026-02-28T00:00:00',
      updated_at: '2026-02-28T00:00:00',
    };
    mockedApi.get = vi.fn().mockResolvedValue({ data: mockPolicy });

    const result = await passwordPolicyService.getPolicy();

    expect(result.id).toBe('password');
    expect(result.min_length).toBe(8);
    expect(result.lockout_threshold).toBe(5);
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });

  it('updatePolicy: 수정된 정책을 저장하고 반환한다', async () => {
    const updated = {
      id: 'password',
      min_length: 12,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: false,
      max_password_age_days: 60,
      password_history_count: 5,
      lockout_threshold: 3,
      lockout_duration_minutes: 60,
      created_at: '2026-02-28T00:00:00',
      updated_at: '2026-02-28T00:00:00',
    };
    mockedApi.put = vi.fn().mockResolvedValue({ data: updated });

    const result = await passwordPolicyService.updatePolicy({ min_length: 12 });

    expect(result.min_length).toBe(12);
    expect(result.lockout_threshold).toBe(3);
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
  });
});
