/**
 * The job detail page's Markdown twin.
 *
 * Reads through the same server functions the job detail route loader
 * calls, with the same input, so board access, the password wall and Board
 * API shedding behave as they do for the page, and no read is added. The
 * session-only extras (saved and application state) and the company intro
 * are left out.
 *
 * Like the page: a job under the wrong company slug moves to the right
 * one, and a missing or closed job follows the board's configured redirect
 * for the URL, else 404s.
 */
import {
  isNotFound,
  type PublicBoard,
  type PublicJob,
  type PublicJobCard,
} from '@cavuno/board';
import { jobDetailPath } from '@cavuno/board/paths';

import {
  toJobDetailVM,
  type JobDetailVM,
} from '../../board/job-detail-view-model';
import { readBoardContext } from '../../lib/board-context-cache';
import { jobTitleAtCompany } from '../../lib/page-title';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { getJobDetailPage } from '../job-detail-page';
import { getSimilarJobs, resolveRedirect } from '../queries';
import {
  bulletList,
  escapeInline,
  htmlToMarkdown,
  link,
  markdownDocument,
  section,
} from './format';
import {
  managedRedirectTwin,
  twinRedirect,
  type ResolveRedirect,
} from './managed-redirect';

import type { JobFormLayoutSource } from '../../board/form-layout';
import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';

type JobSlugInput = { data: { jobSlug: string } };

/** The parts of the job detail server functions' answers the twin reads. */
export type JobTwinDependencies = {
  getJobDetailPage: (input: JobSlugInput) => Promise<{
    job: PublicJob;
    seo: { origin: string };
    head: { links: ReadonlyArray<{ rel: string; href: string }> };
  }>;
  getSimilarJobs: (input: JobSlugInput) => Promise<{ data: PublicJobCard[] }>;
  resolveRedirect: ResolveRedirect;
  readBoardContext: () => Promise<
    Pick<PublicBoard, 'language' | 'customFields'> & JobFormLayoutSource
  >;
};

const defaultDependencies: JobTwinDependencies = {
  getJobDetailPage,
  getSimilarJobs,
  resolveRedirect,
  readBoardContext,
};

type JobDetailFacts = Pick<
  JobDetailVM,
  'facts' | 'customFields' | 'categoryChips' | 'skillChips'
>;

/** One custom-field answer as inline Markdown; rich text is a block. */
function fieldValue(
  value: JobDetailVM['customFields'][number]['value'],
  origin: string,
): string {
  const absolute = (url: string) =>
    url.startsWith('/') ? `${origin}${url}` : url;
  switch (value.kind) {
    case 'text':
      return escapeInline(value.text);
    case 'html':
      return htmlToMarkdown(value.html);
    case 'chips':
      return value.items.map(escapeInline).join(', ');
    case 'link':
      return link(value.text, absolute(value.href));
    case 'images':
      return value.images
        .map((image) => link(image.name, absolute(image.url)))
        .join(', ');
    case 'files':
      return value.files
        .map((file) => link(file.name, absolute(file.url)))
        .join(', ');
    case 'collection':
      return value.entries.map((entry) => escapeInline(entry.title)).join(', ');
  }
}

function detailsSection(vm: JobDetailFacts, origin: string): string | null {
  const facts = vm.facts.map(
    (fact) => `**${escapeInline(fact.label)}:** ${escapeInline(fact.value)}`,
  );
  const inline = vm.customFields
    .filter((field) => field.value.kind !== 'html')
    .map(
      (field) =>
        `**${escapeInline(field.label)}:** ${fieldValue(field.value, origin)}`,
    );
  const blocks = vm.customFields
    .filter((field) => field.value.kind === 'html')
    .map(
      (field) =>
        `### ${escapeInline(field.label)}\n\n${fieldValue(field.value, origin)}`,
    );
  const list = bulletList([...facts, ...inline]);
  if (!list && blocks.length === 0) return null;
  return [list, ...blocks].filter(Boolean).join('\n\n');
}

function chipSection(
  heading: string,
  chips: JobDetailVM['categoryChips'],
  origin: string,
): string | null {
  return section(
    heading,
    bulletList(
      chips.map((chip) => link(chip.name, selfUrl(origin, chip.href))),
    ),
  );
}

function similarSection(
  vm: Pick<JobDetailVM, 'similar' | 'similarJobsHeading'>,
  origin: string,
): string | null {
  return section(
    vm.similarJobsHeading,
    bulletList(
      vm.similar.map((job) => {
        if (!job.companySlug || !job.jobSlug) return null;
        const url = selfUrl(
          origin,
          jobDetailPath(job.companySlug, job.jobSlug),
        );
        const meta = job.meta ? ` (${escapeInline(job.meta)})` : '';
        return `${link(job.title, url)}${meta}`;
      }),
    ),
  );
}

export async function buildJobTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: JobTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { companySlug = '', jobSlug = '' } = twin.params;
  const similar = dependencies
    .getSimilarJobs({ data: { jobSlug } })
    .then((result) => result.data)
    .catch((): PublicJobCard[] => []);
  let page: Awaited<ReturnType<JobTwinDependencies['getJobDetailPage']>>;
  try {
    page = await dependencies.getJobDetailPage({ data: { jobSlug } });
  } catch (error) {
    if (isNotFound(error)) {
      return managedRedirectTwin(twin, origin, dependencies.resolveRedirect);
    }
    throw error;
  }
  const { job } = page;
  const actualCompanySlug = job.company?.slug;
  if (actualCompanySlug && job.slug && actualCompanySlug !== companySlug) {
    return twinRedirect(jobDetailPath(actualCompanySlug, job.slug));
  }

  const board = await dependencies.readBoardContext();
  const vm = toJobDetailVM(
    job,
    board.customFields,
    await similar,
    null,
    board.language,
    getLocale(),
    board,
  );
  const pageUrl = `${page.seo.origin}${twin.htmlPath}`;
  const canonical =
    page.head.links.find((entry) => entry.rel === 'canonical')?.href ?? pageUrl;
  const siteOrigin = page.seo.origin;

  const body = markdownDocument([
    `# ${escapeInline(jobTitleAtCompany(board.language, vm.title, vm.companyName))}`,
    bulletList(
      [
        vm.locationLabel,
        vm.workplaceLabel,
        vm.employmentTypeLabel,
        vm.seniorityLabel,
        vm.salaryLabel,
        vm.publishedLabel,
      ].map((value) => (value ? escapeInline(value) : null)),
    ),
    vm.descriptionHtml
      ? htmlToMarkdown(vm.descriptionHtml)
      : escapeInline(vm.noDescriptionText),
    section(vm.additionalDetailsHeading, detailsSection(vm, siteOrigin)),
    chipSection(vm.categoriesHeading, vm.categoryChips, siteOrigin),
    chipSection(vm.skillsHeading, vm.skillChips, siteOrigin),
    vm.company
      ? link(vm.company.viewProfileLabel, selfUrl(siteOrigin, vm.company.href))
      : null,
    link(m.apply_applyButtonText(), pageUrl),
    similarSection(vm, siteOrigin),
  ]);
  return { type: 'markdown', body, canonical };
}
