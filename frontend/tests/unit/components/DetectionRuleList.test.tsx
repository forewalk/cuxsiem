import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionRuleList } from '@/pages/scenario/components/DetectionRuleList';
import type { SigmaRuleListItem } from '@/types';

const theme = createTheme();

const mockRules: SigmaRuleListItem[] = [
  {
    id: '1', sigma_id: 'sig-1', name: 'Linux Reverse Shell 탐지',
    level_normalized: 'critical', status: 'active',
    log_source_category: 'process_creation', log_source_product: 'linux',
    tags: ['attack.execution', 'attack.t1059.004'],
    mitre_technique_ids: ['T1059.004'], mitre_tactic_ids: ['execution'],
    revision: 1, updated_at: '2026-03-17T10:00:00Z',
  },
  {
    id: '2', sigma_id: 'sig-2', name: 'PowerShell 인코딩 명령 실행',
    level_normalized: 'high', status: 'active',
    log_source_category: 'process_creation', log_source_product: 'windows',
    tags: ['attack.execution', 'attack.t1059.001'],
    mitre_technique_ids: ['T1059.001'], mitre_tactic_ids: ['execution'],
    revision: 1, updated_at: '2026-03-17T09:00:00Z',
  },
  {
    id: '3', sigma_id: 'sig-3', name: 'DNS over HTTPS 우회 통신 탐지',
    level_normalized: 'medium', status: 'inactive',
    log_source_category: 'firewall', log_source_product: 'network',
    tags: ['attack.command_and_control', 'attack.t1071.001'],
    mitre_technique_ids: ['T1071.001'], mitre_tactic_ids: ['command_and_control'],
    revision: 1, updated_at: '2026-03-17T08:00:00Z',
  },
];

function renderList(props: Partial<React.ComponentProps<typeof DetectionRuleList>> = {}) {
  const defaultProps = {
    rules: mockRules,
    policies: [],
    selectedRuleId: null as string | null,
    selectedPolicyId: null as string | null,
    onSelect: vi.fn(),
    onSelectPolicy: vi.fn(),
    onToggleEnabled: vi.fn(),
    loading: false,
    t: (k: string) => k,
    activeTab: 0,
    onTabChange: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <DetectionRuleList {...defaultProps} />
      </ThemeProvider>
    ),
    onSelect: defaultProps.onSelect,
    onToggleEnabled: defaultProps.onToggleEnabled,
  };
}

describe('DetectionRuleList', () => {
  it('탭 헤더에 탐지 규칙과 카운트가 표시된다', () => {
    renderList();
    expect(screen.getByText('drTabRule (3)')).toBeInTheDocument();
    expect(screen.getByText('drTabDetector')).toBeInTheDocument();
  });

  it('룰 이름을 렌더링한다', () => {
    renderList({ activeTab: 1 });
    expect(screen.getByText('Linux Reverse Shell 탐지')).toBeInTheDocument();
    expect(screen.getByText('PowerShell 인코딩 명령 실행')).toBeInTheDocument();
  });

  it('플랫폼 칩이 표시된다', () => {
    renderList({ activeTab: 1 });
    expect(screen.getAllByText('Linux')).toHaveLength(1);
    expect(screen.getAllByText('Windows')).toHaveLength(1);
    expect(screen.getAllByText('Network')).toHaveLength(1);
  });

  it('심각도 칩이 표시된다', () => {
    renderList({ activeTab: 1 });
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('MITRE technique이 표시된다', () => {
    renderList({ activeTab: 1 });
    expect(screen.getByText('MITRE: T1059.004')).toBeInTheDocument();
    expect(screen.getByText('MITRE: T1059.001')).toBeInTheDocument();
  });

  it('활성화 토글 스위치가 표시된다', () => {
    renderList({ activeTab: 1 });
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
    expect(switches[0]).toBeChecked();
    expect(switches[1]).toBeChecked();
    expect(switches[2]).not.toBeChecked();
  });

  it('토글 클릭 시 onToggleEnabled가 호출된다', async () => {
    const { onToggleEnabled } = renderList({ activeTab: 1 });
    const switches = screen.getAllByRole('switch');
    const user = userEvent.setup();
    await user.click(switches[0]);
    expect(onToggleEnabled).toHaveBeenCalledWith('1');
  });

  it('토글 클릭이 행 선택을 트리거하지 않는다', async () => {
    const { onSelect } = renderList({ activeTab: 1 });
    const switches = screen.getAllByRole('switch');
    const user = userEvent.setup();
    await user.click(switches[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('룰 클릭 시 onSelect가 호출된다', async () => {
    const { onSelect } = renderList({ activeTab: 1 });
    const user = userEvent.setup();
    await user.click(screen.getByText('Linux Reverse Shell 탐지'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('선택된 룰이 하이라이트된다', () => {
    renderList({ activeTab: 1, selectedRuleId: '1' });
    const listItem = screen.getByText('Linux Reverse Shell 탐지').closest('[role="button"]');
    expect(listItem).toHaveClass('Mui-selected');
  });

  it('빈 상태 메시지를 표시한다', () => {
    renderList({ activeTab: 1, rules: [] });
    expect(screen.getByText('drRuleEmpty')).toBeInTheDocument();
  });

  it('로딩 중 프로그레스바가 표시된다', () => {
    renderList({ loading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('탐지 정책 탭에서 빈 상태 메시지를 표시한다', () => {
    renderList({ activeTab: 0 });
    expect(screen.getByText('drDetectorEmpty')).toBeInTheDocument();
  });
});
