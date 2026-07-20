// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { UnreadCountBadge, formatUnreadCount } from './unread-count-badge';

afterEach(cleanup);

describe('formatUnreadCount', () => {
  it('renders the exact count from one through nine', () => {
    expect(formatUnreadCount(1)).toBe('1');
    expect(formatUnreadCount(9)).toBe('9');
  });

  it('caps anything over nine at "9+"', () => {
    expect(formatUnreadCount(10)).toBe('9+');
    expect(formatUnreadCount(42)).toBe('9+');
  });
});

describe('UnreadCountBadge', () => {
  it('renders nothing at zero or below', () => {
    const { container } = render(<UnreadCountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the capped count for large values', () => {
    render(<UnreadCountBadge count={25} data-test="badge" />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});
