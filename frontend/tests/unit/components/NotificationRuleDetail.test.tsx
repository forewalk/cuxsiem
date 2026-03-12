import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { NotificationRuleDetail } from '@/pages/admin/alerts/components/NotificationRuleDetail';

vi.mock('@monaco-editor/react', () => ({
  default: (props: any) => <textarea data-testid="monaco-editor" value={props.value} onChange={(e: any) => props.onChange?.(e.target.value)} />,
}));

const theme = createTheme();

function renderDetail(props: Partial<React.ComponentProps<typeof NotificationRuleDetail>> = {}) {
  const defaultProps = {
    showForm: false,
    isEditing: false,
    formData: { name: '', description: '', target_index: '', condition_config: {}, message_template: '', severity: 'info', interval_min: 1, trigger_condition: '', receiver: { type: 'role', values: [], webhook_url: '', webhook_headers: {}, webhook_body: '' }, is_active: true },
    onFormDataChange: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    t: (k: string) => k,
    ...props,
  };
  return render(
    <ThemeProvider theme={theme}>
      <NotificationRuleDetail {...defaultProps} />
    </ThemeProvider>
  );
}

describe('NotificationRuleDetail', () => {
  it('폼이 비활성일 때 빈 상태 안내를 표시한다', () => {
    renderDetail({ showForm: false });
    expect(screen.getByText('selectRulePrompt')).toBeInTheDocument();
  });

  it('폼이 활성일 때 기본 정보 섹션을 렌더링한다', () => {
    renderDetail({ showForm: true });
    expect(screen.getByText(/basicInfo/)).toBeInTheDocument();
  });

  it('편집/생성 모드 모두 삭제 버튼이 없다', () => {
    renderDetail({ showForm: true, isEditing: true });
    expect(screen.queryByTestId('delete-rule-btn')).not.toBeInTheDocument();
  });

  it('편집 모드에서 변경 이력을 표시한다', () => {
    renderDetail({
      showForm: true,
      isEditing: true,
      changeHistory: [
        { user_id: 'admin01', changed_at: '2026-03-12T10:00:00Z' },
        { user_id: 'admin01', changed_at: '2026-03-12T14:00:00Z' },
      ],
    });
    expect(screen.getByText(/changeHistory/)).toBeInTheDocument();
    expect(screen.getAllByText('admin01')).toHaveLength(2);
  });

  it('생성 모드에서는 변경 이력을 표시하지 않는다', () => {
    renderDetail({ showForm: true, isEditing: false });
    expect(screen.queryByText('changeHistory')).not.toBeInTheDocument();
  });
});
