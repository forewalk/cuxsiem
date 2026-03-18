import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionPolicyDetail } from '@/pages/scenario/components/DetectionPolicyDetail';
import type { Detector, Finding } from '@/types';

const theme = createTheme();

const mockDetector: Detector = {
  id: 'd1',
  name: 'Suspicious Login Detector',
  description: 'Detects suspicious login attempts',
  detector_type: 'windows',
  target_indices: ['logs-sentinel_one.edr'],
  linked_rule_ids: ['rule-1'],
  field_mappings: [{ rule_field: 'CommandLine', log_field: 'process.command_line' }],
  schedule_interval_min: 5,
  trigger_condition: 'total > 0',
  message_template: '[{{severity}}] {{name}}: {{total}}건 탐지',
  severity: 'high',
  is_active: true,
  last_run_at: '2026-03-17T10:00:00Z',
  last_triggered_at: '2026-03-17T09:30:00Z',
  total_findings_count: 3,
  created_by: 'admin',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-17T10:00:00Z',
};

const mockFindings: Finding[] = [
  {
    id: 'f1',
    detector_id: 'd1',
    detector_name: 'Suspicious Login Detector',
    rule_id: 'rule-1',
    rule_name: 'Test Rule',
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
    detector: mockDetector,
    findings: mockFindings,
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
  it('Detector 이름을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('Suspicious Login Detector')).toBeInTheDocument();
  });

  it('심각도 칩을 표시한다', () => {
    renderDetail();
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);
  });

  it('대상 인덱스를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('logs-sentinel_one.edr')).toBeInTheDocument();
  });

  it('Detector 유형을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('windows')).toBeInTheDocument();
  });

  it('활성 상태를 표시한다', () => {
    renderDetail();
    expect(screen.getAllByText('dpActive').length).toBeGreaterThanOrEqual(1);
  });

  it('Finding 목록을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('5건 탐지됨')).toBeInTheDocument();
  });

  it('Finding이 없으면 빈 메시지를 표시한다', () => {
    renderDetail({ findings: [] });
    expect(screen.getByText('dpNoFindings')).toBeInTheDocument();
  });

  it('Detector가 없으면 안내 메시지를 표시한다', () => {
    renderDetail({ detector: null });
    expect(screen.getByText('dpSelectDetectorPrompt')).toBeInTheDocument();
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

  it('누적 탐지 수를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('필드 매핑 테이블을 표시한다', () => {
    renderDetail();
    expect(screen.getByText('CommandLine')).toBeInTheDocument();
    expect(screen.getByText('process.command_line')).toBeInTheDocument();
  });

  it('연결된 규칙 ID를 표시한다', () => {
    renderDetail();
    expect(screen.getByText('rule-1')).toBeInTheDocument();
  });
});
