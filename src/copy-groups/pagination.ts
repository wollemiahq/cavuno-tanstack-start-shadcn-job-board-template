import { m } from '../paraglide/messages';

export function paginationCopy() {
  return {
    ariaLabel: m.pagination_ariaLabel(),
    nextLabel: m.pagination_nextLabel(),
    nextPageLabel: m.pagination_nextPageLabel(),
    previousLabel: m.pagination_previousLabel(),
    previousPageLabel: m.pagination_previousPageLabel(),
  };
}
