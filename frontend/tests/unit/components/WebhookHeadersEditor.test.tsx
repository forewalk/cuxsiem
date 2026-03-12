import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { WebhookHeadersEditor, type HeaderEntry } from '@/pages/admin/alerts/components/WebhookHeadersEditor';

const theme = createTheme();

function renderEditor(props: Partial<React.ComponentProps<typeof WebhookHeadersEditor>> = {}) {
  const defaultProps = {
    headers: [{ key: '', value: '' }],
    onChange: vi.fn(),
    t: (k: string) => k,
    ...props,
  };
  return {
    ...render(
      <ThemeProvider theme={theme}>
        <WebhookHeadersEditor {...defaultProps} />
      </ThemeProvider>
    ),
    onChange: defaultProps.onChange,
  };
}

function StatefulEditor({ initial, spy }: { initial: HeaderEntry[]; spy: ReturnType<typeof vi.fn> }) {
  const [headers, setHeaders] = useState(initial);
  const handleChange = (h: HeaderEntry[]) => {
    setHeaders(h);
    spy(h);
  };
  return (
    <ThemeProvider theme={createTheme()}>
      <WebhookHeadersEditor headers={headers} onChange={handleChange} t={(k) => k} />
    </ThemeProvider>
  );
}

describe('WebhookHeadersEditor', () => {
  it('빈 헤더 1행을 렌더링한다', () => {
    renderEditor();
    const keyInputs = screen.getAllByPlaceholderText('webhookHeaderKey');
    const valueInputs = screen.getAllByPlaceholderText('webhookHeaderValue');
    expect(keyInputs).toHaveLength(1);
    expect(valueInputs).toHaveLength(1);
  });

  it('기존 헤더 데이터를 올바르게 표시한다', () => {
    renderEditor({
      headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer token123' },
      ],
    });
    const keyInputs = screen.getAllByPlaceholderText('webhookHeaderKey');
    expect(keyInputs).toHaveLength(2);
    expect(keyInputs[0]).toHaveValue('Content-Type');
    expect(keyInputs[1]).toHaveValue('Authorization');
  });

  it('+ 버튼 클릭 시 빈 행이 추가된다', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({
      headers: [{ key: 'X-Custom', value: 'val' }],
    });

    const addButton = screen.getByTestId('add-header-btn');
    await user.click(addButton);

    expect(onChange).toHaveBeenCalledWith([
      { key: 'X-Custom', value: 'val' },
      { key: '', value: '' },
    ]);
  });

  it('삭제 버튼 클릭 시 해당 행이 제거된다', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({
      headers: [
        { key: 'Header1', value: 'val1' },
        { key: 'Header2', value: 'val2' },
      ],
    });

    const deleteButtons = screen.getAllByTestId('delete-header-btn');
    await user.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([{ key: 'Header2', value: 'val2' }]);
  });

  it('마지막 남은 행은 삭제 시 빈 행으로 초기화된다', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({
      headers: [{ key: 'Solo', value: 'val' }],
    });

    const deleteButtons = screen.getAllByTestId('delete-header-btn');
    await user.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([{ key: '', value: '' }]);
  });

  it('key 입력 시 onChange가 호출된다', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<StatefulEditor initial={[{ key: '', value: '' }]} spy={spy} />);

    const keyInput = screen.getByPlaceholderText('webhookHeaderKey');
    await user.type(keyInput, 'X-Api-Key');

    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall[0].key).toBe('X-Api-Key');
  });

  it('value 입력 시 onChange가 호출된다', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<StatefulEditor initial={[{ key: 'Token', value: '' }]} spy={spy} />);

    const valueInput = screen.getByPlaceholderText('webhookHeaderValue');
    await user.type(valueInput, 'secret');

    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall[0].value).toBe('secret');
  });
});
