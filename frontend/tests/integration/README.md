# 통합 테스트

여러 컴포넌트 또는 서비스가 함께 동작하는 시나리오를 검증합니다.

## 파일 명명 규칙

```
tests/integration/{feature}.integration.test.tsx
```

## MSW를 활용한 API 모킹 패턴

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/v1/advanced-settings', () => {
    return HttpResponse.json({ tab_count: 10, pixel_mode: false });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```
