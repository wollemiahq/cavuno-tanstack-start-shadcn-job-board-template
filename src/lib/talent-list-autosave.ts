import type { TalentListFilters } from './talent-search';

type FilterEdit = { slug: string; listId: string; filters: TalentListFilters };

/** Serialize writes, retaining the latest deliberate edit for each list. */
export function createTalentListAutosave(
  save: (edit: FilterEdit) => Promise<void>,
  onError: () => void,
) {
  const pending = new Map<string, FilterEdit>();
  let saving = false;
  const drain = async () => {
    if (saving) return;
    saving = true;
    try {
      while (pending.size) {
        const next = pending.entries().next().value;
        if (!next) break;
        const [key, edit] = next;
        pending.delete(key);
        try {
          await save(edit);
        } catch {
          onError();
        }
      }
    } finally {
      saving = false;
    }
  };
  return {
    enqueue(edit: FilterEdit) {
      pending.set(JSON.stringify([edit.slug, edit.listId]), edit);
      void drain();
    },
  };
}
