/**
 * The Markdown twins of the legal pages: privacy policy, terms of service,
 * cookie policy and impressum.
 *
 * Each builder calls the server function the page's loader calls, with the
 * same page type, so a page with no content (an impressum the operator has
 * not written) 404s here as it does there, and board access and the
 * password wall are unchanged. The body is the page's own sanitized HTML,
 * with the board name already filled in.
 */
import { isNotFound as isBoardNotFound } from '@cavuno/board';
import { isNotFound } from '@tanstack/react-router';

import { getLegalPageView } from '../legal-pages';
import { escapeInline, htmlToMarkdown, markdownDocument } from './format';
import { canonicalOf } from './job-listing';

import type { LegalPageType } from '../../lib/legal';
import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';

export type LegalTwinDependencies = {
  getLegalPageView: (input: {
    data: { type: LegalPageType };
  }) => Promise<Awaited<ReturnType<typeof getLegalPageView>>>;
};

const defaultDependencies: LegalTwinDependencies = { getLegalPageView };

/** The legal pages with a twin. */
export type LegalTwinPage = Exclude<LegalPageType, 'about'>;

export async function buildLegalTwin(
  type: LegalTwinPage,
  twin: MarkdownTwin,
  dependencies: LegalTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  let view;
  try {
    view = await dependencies.getLegalPageView({ data: { type } });
  } catch (error) {
    if (isNotFound(error) || isBoardNotFound(error))
      return { type: 'notFound' };
    throw error;
  }
  const { page } = view;
  const entity = page.legalEntity;
  const entityLines = [entity?.legalName, entity?.address].flatMap((line) =>
    line?.trim()
      ? [
          line
            .trim()
            .split(/\r?\n/)
            .map((part) => escapeInline(part))
            .filter(Boolean)
            .join('  \n'),
        ]
      : [],
  );
  const body = markdownDocument([
    `# ${escapeInline(page.title)}`,
    entityLines.length > 0 ? entityLines.join('\n\n') : null,
    htmlToMarkdown(page.html),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(view, twin) };
}
