import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { NotificationRuleReadonly } from '@/pages/admin/alerts/components/NotificationRuleReadonly';
import type { NotificationRule } from '@/types';

const theme = createTheme();

const mockRule: NotificationRule = {
  id: 'rule-1',
  name: '테스트 알림 규칙',
  description: '파일 수정 이벤트 탐지',
  target_index: 'logs-sentinel_one.edr',
  condition_config: { query: { bool: { filter: [] } } },
  message_template: '{{aggregations.agentOS.buckets}}',
  severity: 'high',
  interval_min: 5,
  trigger_condition: 'hits.total.value > 0',
  receiver: {
    type: 'role',
    values: ['role-1', 'role-2'],
    webhook_url: 'https://example.com/webhook',
    webhook_headers: { 'Content-Type': 'application/json' },
    webhook_body: '{"msg": "alert"}',
  },
  is_active: true,
  total_alerts_count: 10,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-10T00:00:00Z',
  change_history: [
    { user_id: 'admin01', changed_at: '2026-03-10T09:00:00Z', changed_fields: ['name', 'severity'] },
  ],
};

function renderReadonly(props: Partial<React.ComponentProps<typeof NotificationRuleReadonly>> = {}) {
  const defaultProps = {
    rule: mockRule,
    onEdit: vi.fn(),
    t: (k: string) => k,
    ...props,
  };
  return render(
    <ThemeProvider theme={theme}>
      <NotificationRuleReadonly {...defaultProps} />
    </ThemeProvider>
  );
}

describe('NotificationRuleReadonly', () => {
  it('규칙 이름을 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('테스트 알림 규칙')).toBeInTheDocument();
  });

  it('기본 정보 섹션 헤더를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('basicInfo')).toBeInTheDocument();
  });

  it('탐지 조건 섹션 헤더를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('detectionCondition')).toBeInTheDocument();
  });

  it('알림 메시지 템플릿 섹션 헤더를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('notificationMessageTemplate')).toBeInTheDocument();
  });

  it('수신 대상 역할 섹션 헤더를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('notificationReceiverRoles')).toBeInTheDocument();
  });

  it('대상 인덱스를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('logs-sentinel_one.edr')).toBeInTheDocument();
  });

  it('실행 주기를 표시한다', () => {
    renderReadonly();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('트리거 조건을 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('hits.total.value > 0')).toBeInTheDocument();
  });

  it('웹훅 URL을 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
  });

  it('변경 이력을 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('changeHistory')).toBeInTheDocument();
    expect(screen.getByText('admin01')).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 onEdit이 호출된다', async () => {
    const onEdit = vi.fn();
    renderReadonly({ onEdit });
    const user = userEvent.setup();
    await user.click(screen.getByText('editRuleBtn'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('활성 상태를 Chip으로 표시한다', () => {
    renderReadonly();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('비활성 상태를 표시한다', () => {
    renderReadonly({ rule: { ...mockRule, is_active: false } });
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('설명이 없으면 대시를 표시한다', () => {
    renderReadonly({ rule: { ...mockRule, description: '' } });
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('웹훅이 없으면 웹훅 섹션을 숨긴다', () => {
    const ruleWithoutWebhook = { ...mockRule, receiver: { ...mockRule.receiver, webhook_url: '' } };
    renderReadonly({ rule: ruleWithoutWebhook });
    expect(screen.queryByText('https://example.com/webhook')).not.toBeInTheDocument();
  });

  it('변경 이력이 없으면 이력 섹션을 숨긴다', () => {
    renderReadonly({ rule: { ...mockRule, change_history: [] } });
    expect(screen.queryByText('changeHistory')).not.toBeInTheDocument();
  });
});
