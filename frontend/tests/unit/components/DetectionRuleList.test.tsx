import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionRuleList, type DetectionRuleListItem } from '@/pages/scenario/components/DetectionRuleList';

const theme = createTheme();

const mockRules: DetectionRuleListItem[] = [
  { id: '1', name: 'Linux Reverse Shell 탐지', severity: 'critical', logType: 'Linux System Logs', tags: ['attack.execution', 'attack.t1059.004'], enabled: true },
  { id: '2', name: 'PowerShell 인코딩 명령 실행', severity: 'high', logType: 'Windows Process Events', tags: ['attack.execution', 'attack.t1059.001'], enabled: true },
  { id: '3', name: 'DNS over HTTPS 우회 통신 탐지', severity: 'medium', logType: 'Network Firewall Logs', tags: ['attack.command_and_control', 'attack.t1071.001'], enabled: false },
];

function renderList(props: Partial<React.ComponentProps<typeof DetectionRuleList>> = {}) {
  const defaultProps = {
    rules: mockRules,
    selectedRuleId: null as string | null,
    onSelect: vi.fn(),
    onToggleEnabled: vi.fn(),
    loading: false,
    t: (k: string) => k,
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
  it('룰 이름을 렌더링한다', () => {
    renderList();
    expect(screen.getByText('Linux Reverse Shell 탐지')).toBeInTheDocument();
    expect(screen.getByText('PowerShell 인코딩 명령 실행')).toBeInTheDocument();
  });

  it('플랫폼 칩이 표시된다', () => {
    renderList();
    expect(screen.getAllByText('Linux')).toHaveLength(1);
    expect(screen.getAllByText('Windows')).toHaveLength(1);
    expect(screen.getAllByText('Network')).toHaveLength(1);
  });

  it('심각도 칩이 표시된다', () => {
    renderList();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('MITRE technique이 표시된다', () => {
    renderList();
    expect(screen.getByText('MITRE: T1059.004')).toBeInTheDocument();
    expect(screen.getByText('MITRE: T1059.001')).toBeInTheDocument();
  });

  it('활성화 토글 스위치가 표시된다', () => {
    renderList();
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
    expect(switches[0]).toBeChecked();
    expect(switches[1]).toBeChecked();
    expect(switches[2]).not.toBeChecked();
  });

  it('토글 클릭 시 onToggleEnabled가 호출된다', async () => {
    const user = userEvent.setup();
    const { onToggleEnabled } = renderList();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);
    expect(onToggleEnabled).toHaveBeenCalledWith('1');
  });

  it('토글 클릭이 행 선택을 트리거하지 않는다', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('룰 클릭 시 onSelect가 호출된다', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await user.click(screen.getByText('Linux Reverse Shell 탐지'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('선택된 룰이 하이라이트된다', () => {
    renderList({ selectedRuleId: '1' });
    const listItem = screen.getByText('Linux Reverse Shell 탐지').closest('[role="button"]');
    expect(listItem).toHaveClass('Mui-selected');
  });

  it('헤더에 Rule Library와 카운트가 표시된다', () => {
    renderList();
    expect(screen.getByText('drRuleLibrary (3)')).toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다', () => {
    renderList({ rules: [] });
    expect(screen.getByText('drNoRules')).toBeInTheDocument();
  });

  it('로딩 중 프로그레스바가 표시된다', () => {
    renderList({ loading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
