import { m } from '../paraglide/messages';

import type { DetailFieldFormat } from '@/board/detail-fields';

/** Copy for operator-defined detail fields on the job and company pages. */
export function detailFieldsCopy(locale: string) {
  const count = (value: number) => value.toLocaleString(locale);
  return {
    documentsHeading: m.detailFields_documentsHeading(),
    format: {
      locale,
      yesLabel: m.detailFields_booleanYes(),
      noLabel: m.detailFields_booleanNo(),
      galleryImageAlt: (label, index, total) =>
        m.detailFields_galleryImageAlt({
          label,
          index: count(index),
          count: count(total),
        }),
    } satisfies DetailFieldFormat,
  };
}
