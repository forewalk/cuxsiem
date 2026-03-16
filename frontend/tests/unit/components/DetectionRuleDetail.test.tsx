/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DetectionRuleDetail, type DetectionRuleData } from '../../../src/pages/scenario/components/DetectionRuleDetail';

const theme = createTheme();

const mockRule: DetectionRuleData = {
  id: 'rule-8f1a9c',
  name: 'Linux Reverse Shell Indicator',
  logType: 'Linux System Logs',
  description: 'Detects a bash connecting to a remote IP address',
  lastUpdated: '2021-10-15T15:00:00.000Z',
  author: 'Florian Roth (Nextron Systems)',
  source: 'Standard',
  license: 'Detection Rule License (DRL)',
  severity: 'critical',
  tags: ['attack.execution', 'attack.t1059.004'],
  references: ['https://example.com/reference'],
  falsePositives: ['Unknown'],
  ruleStatus: 'test',
  enabled: true,
  detection: `selection:\n  Image|endswith: /bin/bash\ncondition: selection`,
};

function renderDetail(rule: DetectionRuleData | null = mockRule) {
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
    ['drSectionSummary', 'drSectionDetection', 'drSectionClassification', 'drSectionDocumentation', 'drSectionMetadata'].forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  // Rule Summary 섹션
  it('룰 이름이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('Linux Reverse Shell Indicator')).toBeInTheDocument();
  });

  it('로그 소스가 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('Linux System Logs')).toBeInTheDocument();
  });

  it('설명이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('Detects a bash connecting to a remote IP address')).toBeInTheDocument();
  });

  // Detection Logic 섹션
  it('탐지 로직이 표시된다', () => {
    renderDetail();
    expect(screen.getByText(/selection:/)).toBeInTheDocument();
    expect(screen.getByText(/Image\|endswith: \/bin\/bash/)).toBeInTheDocument();
  });

  // Classification 섹션
  it('MITRE 전술 태그가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('attack.execution')).toBeInTheDocument();
  });

  it('MITRE technique이 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('T1059.004')).toBeInTheDocument();
  });

  // Documentation 섹션
  it('작성자가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('Florian Roth (Nextron Systems)')).toBeInTheDocument();
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
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  // Metadata 섹션
  it('Rule ID가 표시된다', () => {
    renderDetail();
    expect(screen.getByText('rule-8f1a9c')).toBeInTheDocument();
  });

  it('enabled 상태가 표시된다', () => {
    renderDetail();
    expect(screen.getAllByText('drEnabled').length).toBeGreaterThanOrEqual(1);
  });

  it('룰 상태가 칩으로 표시된다', () => {
    renderDetail();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('최종 수정일이 표시된다', () => {
    renderDetail();
    expect(screen.getByText('2021-10-15T15:00:00.000Z')).toBeInTheDocument();
  });
});
