import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { NotificationRuleList } from '@/pages/admin/alerts/components/NotificationRuleList';
import type { NotificationRule } from '@/types';

const theme = createTheme();

const mockRules: NotificationRule[] = [
  { id: '1', name: 'EDR 탐지 규칙', severity: 'high', is_active: true, description: '', target_index: '', condition_config: {}, message_template: '', interval_min: 1, trigger_condition: '', receiver: { type: 'role', values: [] }, created_at: '', updated_at: '', last_triggered_at: null },
  { id: '2', name: '로그인 실패 알림', severity: 'medium', is_active: false, description: '', target_index: '', condition_config: {}, message_template: '', interval_min: 5, trigger_condition: '', receiver: { type: 'role', values: [] }, created_at: '', updated_at: '', last_triggered_at: null },
];

function renderList(props: Partial<React.ComponentProps<typeof NotificationRuleList>> = {}) {
  const defaultProps = {
    rules: mockRules,
    selectedRuleId: null as string | null,
    selectedRuleIds: new Set<string>(),
    onSelect: vi.fn(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onAdd: vi.fn(),
    onToggleActive: vi.fn(),
    loading: false,
    t: (k: string) => k,
    ...props,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <NotificationRuleList {...defaultProps} />
      </ThemeProvider>
    ),
    onSelect: defaultProps.onSelect,
    onToggleSelect: defaultProps.onToggleSelect,
    onSelectAll: defaultProps.onSelectAll,
    onAdd: defaultProps.onAdd,
    onToggleActive: defaultProps.onToggleActive,
  };
}

describe('NotificationRuleList', () => {
  it('규칙 목록을 렌더링한다', () => {
    renderList();
    expect(screen.getByText('EDR 탐지 규칙')).toBeInTheDocument();
    expect(screen.getByText('로그인 실패 알림')).toBeInTheDocument();
  });

  it('규칙 클릭 시 onSelect가 호출된다', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await user.click(screen.getByText('EDR 탐지 규칙'));
    expect(onSelect).toHaveBeenCalledWith(mockRules[0]);
  });

  it('추가 버튼 클릭 시 onAdd가 호출된다', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderList();

    await user.click(screen.getByTestId('add-rule-btn'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('활성 스위치 토글 시 onToggleActive가 호출된다', async () => {
    const user = userEvent.setup();
    const { onToggleActive } = renderList();

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);
    expect(onToggleActive).toHaveBeenCalledWith(mockRules[0]);
  });

  it('체크박스 클릭 시 onToggleSelect가 호출된다', async () => {
    const user = userEvent.setup();
    const { onToggleSelect } = renderList();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(onToggleSelect).toHaveBeenCalledWith('1');
  });

  it('선택된 규칙이 하이라이트된다', () => {
    renderList({ selectedRuleId: '1' });
    const listItem = screen.getByText('EDR 탐지 규칙').closest('[role="button"]');
    expect(listItem).toHaveClass('Mui-selected');
  });
});
