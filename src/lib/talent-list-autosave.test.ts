import { expect, it, vi } from 'vitest';

import { createTalentListAutosave } from './talent-list-autosave';

it('performs no write until a deliberate edit is enqueued', () => {
  const save = vi.fn().mockResolvedValue(undefined);
  createTalentListAutosave(save, vi.fn());
  expect(save).not.toHaveBeenCalled();
});

it('serializes saves and persists a revert made while an earlier save is pending', async () => {
  let finishFirst = () => {};
  const first = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  const save = vi
    .fn()
    .mockImplementationOnce(() => first)
    .mockResolvedValue(undefined);
  const queue = createTalentListAutosave(save, vi.fn());
  queue.enqueue({
    slug: 'acme',
    listId: 'list-one',
    filters: { q: 'changed' },
  });
  queue.enqueue({
    slug: 'acme',
    listId: 'list-one',
    filters: { q: 'intermediate' },
  });
  queue.enqueue({
    slug: 'acme',
    listId: 'list-one',
    filters: { q: 'original' },
  });
  expect(save).toHaveBeenCalledTimes(1);
  finishFirst();
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save).toHaveBeenLastCalledWith({
    slug: 'acme',
    listId: 'list-one',
    filters: { q: 'original' },
  });
});
