/**
 * Jobs RSS — hosted-parity feed at /jobs/rss.xml. Mirrors the hosted
 * `buildJobRssFeed`: the latest 50 published jobs (publishedAt desc), each item
 * carrying a CDATA description (Company / Type / the job's HTML), category tags,
 * and the canonical `/companies/:co/jobs/:slug` link. Descriptions come from the
 * API via the Medusa-style `?fields=+description` sparse-fieldset opt-in — the
 * slim card omits them by default.
 */
import { createFileRoute } from '@tanstack/react-router';

import { createJobsRssHandler } from './-jobs-rss-handler';

export const Route = createFileRoute('/jobs/rss.xml')({
  server: {
    handlers: {
      GET: createJobsRssHandler(),
    },
  },
});
