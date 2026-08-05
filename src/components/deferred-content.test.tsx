// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DeferredContent } from './deferred-content';

afterEach(cleanup);

describe('DeferredContent', () => {
  it('keeps surrounding route content visible while its promise is pending', async () => {
    const pending = new Promise<string>(() => undefined);

    await act(async () => {
      render(
        <main>
          <h1>Company profile</h1>
          <DeferredContent promise={pending}>
            {(value) => <p>{value}</p>}
          </DeferredContent>
        </main>,
      );
    });

    expect(
      screen.getByRole('heading', { name: 'Company profile' }),
    ).toBeVisible();
    expect(screen.queryByText('Recommendations')).toBeNull();
  });
});
