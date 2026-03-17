import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionPolicyDetail } from '@/pages/scenario/components/DetectionPolicyDetail';
import type { DetectionPolicy, DetectionEvent } from '@/types';

const theme = createTheme();

const mockPolicy: DetectionPolicy = {
  id: 'p1',
  name: 'Suspicious Login Policy',
  description: 'Detects suspicious login attempts',
  target_index: 'logs-sentinel_one.edr',
  condition_config: { query: { match_all: {} } },
  trigger_condition: 'total > 0',
  message_template: '[{{severity}}] {{name}}: {{total}}건 탐지',
  severity: 'high',
  interval_min: 5,
  linked_rule_ids: [],
  mitre_technique_ids: ['T1059'],
  mitre_tactic_ids: ['execution'],
  is_active: true,
  last_run_at: '2026-03-17T10:00:00Z',
  last_triggered_at: '2026-03-17T09:30:00Z',
  total_events_count: 3,
  created_by: 'admin',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-17T10:00:00Z',
};

const mockEvents: DetectionEvent[] = [
  {
    id: 'e1',
    policy_id: 'p1',
    policy_name: 'Suspicious Login Policy',
    severity: 'high',
    target_index: 'logs-sentinel_one.edr',
    matched_count: 5,
    sample_events: [],
    mitre_technique_ids: ['T1059'],
    mitre_tactic_ids: ['execution'],
    trigger_value: 'total=5',
    message: '5건 탐지됨',
    status: 'new',
    created_at: '2026-03-17T09:30:00Z',
  },
];

function renderDetail(props: Partial<React.ComponentProps<typeof DetectionPolicyDetail>> = {}) {
  const defaultProps = {
    policy: mockPolicy,
    events: mockEvents,
    t: (k: string) => k,
    ...props,
  };
  return render(
    <ThemeProvider theme={theme}>
      <DetectionPolicyDetail {...defaultProps} />
    </ThemeProvider>
  );
}

describe('DetectionPolicyDetail', () => {
  it('정책 이름을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('Suspicious Login Policy')).toBeInTheDocument();
  });

  it('심각도 칩을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('대상 인덱스를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('logs-sentinel_one.edr')).toBeInTheDocument();
  });

  it('MITRE 기법을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('T1059')).toBeInTheDocument();
  });

  it('MITRE 전술을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('execution')).toBeInTheDocument();
  });

  it('활성 상태를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('dpActive')).toBeInTheDocument();
  });

  it('이벤트 목록을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('5건 탐지됨')).toBeInTheDocument();
  });

  it('이벤트가 없으면 빈 메시지를 표시한다', () => {
    renderDetail({ events: [] });
    expect(screen.getByText('dpNoEvents')).toBeInTheDocument();
  });

  it('정책이 없으면 안내 메시지를 표시한다', () => {
    renderDetail({ policy: null });
    expect(screen.getByText('dpSelectPolicyPrompt')).toBeInTheDocument();
  });

  it('편집 버튼이 표시된다', () => {
    const onEdit = vi.fn();
    renderDetail({ onEdit });
    const editButton = screen.getByTestId('EditIcon').closest('button');
    expect(editButton).toBeInTheDocument();
  });

  it('삭제 버튼이 표시된다', () => {
    const onDelete = vi.fn();
    renderDetail({ onDelete });
    const deleteButton = screen.getByTestId('DeleteIcon').closest('button');
    expect(deleteButton).toBeInTheDocument();
  });

  it('누적 이벤트 수를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
