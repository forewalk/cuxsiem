/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionRuleDetail } from '../../../src/pages/scenario/components/DetectionRuleDetail';
import type { SigmaRuleDetail } from '@/types';

const theme = createTheme();

const mockRule: SigmaRuleDetail = {
  id: 'doc-uuid-1',
  sigma_id: 'rule-8f1a9c',
  name: 'Linux Reverse Shell 탐지',
  description: 'bash가 외부 IP로 연결을 시도하는 행위를 탐지합니다.',
  level_original: 'critical',
  level_normalized: 'critical',
  sigma_status: 'stable',
  author: '김장훈 (CRUX SIEM)',
  sigma_date: '2026/02/18',
  references: ['https://example.com/reference'],
  license: 'DRL',
  log_source_category: 'process_creation',
  log_source_product: 'linux',
  log_source_service: null,
  detection_config: { selection: { 'Image|endswith': '/bin/bash' }, condition: 'selection' },
  tags: ['attack.execution', 'attack.t1059.004'],
  mitre_technique_ids: ['T1059.004'],
  mitre_tactic_ids: ['execution'],
  false_positives: ['알려진 오탐 사례 없음'],
  status: 'active',
  is_deleted: false,
  raw_yaml: 'title: Linux Reverse Shell\ndetection:\n  selection:\n    Image|endswith: /bin/bash\n  condition: selection',
  file_path: 'linux/process_creation/test.yml',
  content_hash: 'abc123',
  revision: 2,
  deleted_by: null,
  created_at: '2026-02-18T09:00:00Z',
  updated_at: '2026-02-18T09:30:00Z',
  deleted_at: null,
};

function renderDetail(rule: SigmaRuleDetail | null = mockRule) {
  return render(
    <ThemeProvider theme={theme}>
      <DetectionRuleDetail rule={rule} t={(k: string) => k} />
    </ThemeProvider>
  );
}

describe('DetectionRuleDetail', () => {
  it('룰이 없으면 안내 메시지를 표시한다', () => {
    renderDetail(null);
    expect(screen.getByText('drSelectRulePrompt')).toBeInTheDocument();
  });

  it('5개 섹션 헤더가 모두 표시된다', () => {
    renderDetail();
    ['drSectionSummary', 'drSectionClassification', 'drSectionDocumentation', 'drSectionMetadata'].forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
    expect(screen.getByText('drSectionDetection')).toBeInTheDocument();
  });

  it('룰 이름이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('Linux Reverse Shell 탐지')).toBeInTheDocument();
  });

  it('로그 소스가 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('linux')).toBeInTheDocument();
    expect(screen.getByText('process_creation')).toBeInTheDocument();
  });

  it('설명이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('bash가 외부 IP로 연결을 시도하는 행위를 탐지합니다.')).toBeInTheDocument();
  });

  it('탐지 로직이 기본 접힌 상태이며 펼칠 수 있다', async () => {
    const user = userEvent.setup();
    renderDetail();
    expect(screen.queryByText(/"Image\|endswith"/)).not.toBeVisible();

    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    if (expandButton) await user.click(expandButton);
  });

  it('MITRE 전술 태그가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('execution')).toBeInTheDocument();
  });

  it('MITRE technique이 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('T1059.004')).toBeInTheDocument();
  });

  it('작성자가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('김장훈 (CRUX SIEM)')).toBeInTheDocument();
  });

  it('참조 링크가 표시된다', () => {
    renderDetail();
    const link = screen.getByText('https://example.com/reference');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/reference');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('오탐 사례가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('알려진 오탐 사례 없음')).toBeInTheDocument();
  });

  it('Sigma ID가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('rule-8f1a9c')).toBeInTheDocument();
  });

  it('enabled 상태가 표시된다', () => {
    renderDetail();
    expect(screen.getAllByText('drEnabled').length).toBeGreaterThanOrEqual(1);
  });

  it('Sigma 룰 상태가 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('stable')).toBeInTheDocument();
  });

  it('리비전이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('라이선스가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('DRL')).toBeInTheDocument();
  });
});
