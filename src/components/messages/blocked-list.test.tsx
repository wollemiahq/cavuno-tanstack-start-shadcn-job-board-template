// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BlockedList } from './blocked-list';

import type { BlockedUser } from '@cavuno/board';

const user: BlockedUser = {
  id: 'block-1',
  object: 'blocked_user',
  boardUserId: 'user-1',
  displayName: 'Hue Le',
  avatarUrl: null,
  createdAt: '2026-07-14T00:00:00.000Z',
};

describe('BlockedList', () => {
  it('delegates unblocking without fetching from the presentational component', () => {
    const onUnblock = vi.fn();
    render(
      <BlockedList users={[user]} pendingUserId={null} onUnblock={onUnblock} />,
    );

    const button = screen.getByRole('button', { name: 'Unblock' });
    expect(button).toHaveAttribute('data-slot', 'button');
    fireEvent.click(button);
    expect(onUnblock).toHaveBeenCalledWith(user.boardUserId);
  });
});
