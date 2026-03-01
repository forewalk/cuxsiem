import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// useAuth 모킹 — 역할에 따라 user 반환을 제어
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// advancedSettingsService 모킹
vi.mock('@/services/advancedSettingsService', () => ({
  advancedSettingsService: {
    getSettings: vi.fn().mockResolvedValue({
      user_register: false,
      allow_multiple_sessions: false,
      tab_count: 10,
      pixel_mode: false,
      otp_required: false,
    }),
    updateSettings: vi.fn(),
  },
}));

// codeService 모킹
vi.mock('@/services/codeService', () => ({
  codeService: {
    getRoleCodes: vi.fn().mockResolvedValue([]),
  },
}));

// useSettingsStore 모킹
vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: null,
    fetchSettings: vi.fn(),
    updateSettings: vi.fn(),
  })),
}));

// useTabStore 모킹
vi.mock('@/stores/tabStore', () => ({
  default: vi.fn(() => ({
    setMaxTabs: vi.fn(),
  })),
}));

import { useAuth } from '@/hooks/useAuth';
import AdvancedSettingsTab from '@/pages/admin/tabs/AdvancedSettingsTab';

const mockedUseAuth = vi.mocked(useAuth);

const adminUser = {
  id: 'a1', username: 'admin', email: 'admin@test.com',
  name: 'Admin', role: 'admin', is_active: true,
  created_at: '', last_login_at: null,
};

const normalUser = {
  id: 'u1', username: 'testuser', email: 'test@test.com',
  name: 'Test', role: 'user', is_active: true,
  created_at: '', last_login_at: null,
};

const monitorUser = {
  id: 'm1', username: 'monitor', email: 'mon@test.com',
  name: 'Monitor', role: 'monitoring', is_active: true,
  created_at: '', last_login_at: null,
};

/**
 * admin 이 아닌 역할의 사용자가 admin 탭을 열면 권한 없음 메시지를 표시해야 한다
 */
describe('Admin 탭 권한 체크', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AdvancedSettingsTab: 일반 사용자(role=user)는 권한 없음 메시지를 본다', () => {
    // 비관리자 사용자의 경우 데이터 로딩 없이 권한 없음 화면이 표시되어야 한다
    mockedUseAuth.mockReturnValue({
      user: normalUser,
      login: vi.fn(), logout: vi.fn(),
      isLoading: false, isAuthenticated: true,
    } as any);

    render(<AdvancedSettingsTab />);

    // noPermission i18n 키 fallback 또는 실제 번역 텍스트
    expect(screen.getByText(/noPermission|접근 권한이 없습니다/i)).toBeInTheDocument();
  });

  it('AdvancedSettingsTab: monitoring 역할 사용자도 권한 없음 메시지를 본다', () => {
    // monitoring 역할은 admin이 아니므로 권한 없음 화면이 표시되어야 한다
    mockedUseAuth.mockReturnValue({
      user: monitorUser,
      login: vi.fn(), logout: vi.fn(),
      isLoading: false, isAuthenticated: true,
    } as any);

    render(<AdvancedSettingsTab />);

    expect(screen.getByText(/noPermission|접근 권한이 없습니다/i)).toBeInTheDocument();
  });

  it('AdvancedSettingsTab: 관리자(role=admin)는 권한 없음 메시지를 보지 않는다', () => {
    // 관리자 사용자는 권한 없음 화면 없이 정상적으로 탭 컨텐츠를 볼 수 있어야 한다
    mockedUseAuth.mockReturnValue({
      user: adminUser,
      login: vi.fn(), logout: vi.fn(),
      isLoading: false, isAuthenticated: true,
    } as any);

    render(<AdvancedSettingsTab />);

    // 권한 없음 텍스트가 없어야 한다 (로딩 스피너나 설정 내용이 보임)
    expect(screen.queryByText(/noPermission|접근 권한이 없습니다/i)).not.toBeInTheDocument();
  });
});
