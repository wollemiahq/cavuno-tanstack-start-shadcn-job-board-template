import type { TalentSearch } from './talent-search';

const EVENT = 'cavuno:talent-search-edit';

declare global {
  interface WindowEventMap {
    'cavuno:talent-search-edit': CustomEvent<TalentSearch>;
  }
}

/** Only deliberate filter controls publish edits; URL arrivals never do. */
export function publishTalentSearchEdit(search: TalentSearch) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: search }));
}

export function subscribeTalentSearchEdits(
  listener: (search: TalentSearch) => void,
) {
  const receive = (event: CustomEvent<TalentSearch>) => listener(event.detail);
  window.addEventListener(EVENT, receive);
  return () => window.removeEventListener(EVENT, receive);
}
