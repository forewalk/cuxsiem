# 컴포넌트 단위 테스트

## 파일 명명 규칙

```
tests/unit/components/{ComponentName}.test.tsx
```

## 샘플 패턴

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  it('정상적으로 렌더링된다', () => {
    render(<ComponentName />);
    expect(screen.getByText('기대 텍스트')).toBeInTheDocument();
  });

  it('버튼 클릭 시 핸들러가 호출된다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```
