/**
 * The coming-soon page visitors see while the board is password protected
 * before launch. Cavuno captures this route as static HTML when the board
 * is published and serves that capture in place of the platform's stock
 * password page, so it can be redesigned like any other page.
 *
 * Static by contract: no JavaScript runs on the captured page (scripts are
 * stripped), though CSS animation works. Keep the
 * `data-cavuno-slot="password"` element — the platform puts the password
 * entry there. Anything marked `data-cavuno-placeholder` is a preview-only
 * stand-in and is dropped from the capture.
 *
 * The root layout renders this route without site chrome.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { Lock } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase } from '../server/queries';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/coming-soon-gate')({
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: m.comingSoonGate_heading({
          board: loaderData?.boardName ?? '',
        }),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ComingSoonGatePage,
});

function ComingSoonGatePage() {
  const { board } = rootApi.useLoaderData();

  return (
    <div className="bg-background text-foreground grid min-h-dvh grid-rows-[auto_1fr_auto] px-4 py-6 sm:px-[7vw] sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="font-heading flex min-w-0 items-center gap-3 text-xl font-semibold tracking-tight">
          {board.logoUrl ? (
            <img
              src={board.logoUrl}
              alt=""
              className="h-8 w-auto max-w-40 object-contain"
            />
          ) : null}
          <span className="truncate">{board.name}</span>
        </div>
        <div
          data-cavuno-slot="password"
          className="text-muted-foreground text-[15px]"
        >
          <span
            data-cavuno-placeholder
            className="inline-flex items-center gap-2"
          >
            <Lock aria-hidden className="size-4" />
            {m.comingSoonGate_enterPassword()}
          </span>
        </div>
      </header>

      <main className="max-w-xl self-center py-12">
        <h1 className="font-heading mb-5 text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
          {m.comingSoonGate_heading({ board: board.name })}
        </h1>
        <p className="text-muted-foreground max-w-md text-lg text-pretty">
          {m.comingSoonGate_lede()}
        </p>
      </main>

      <footer className="text-muted-foreground text-sm">
        {board.showCavunoBranding ? (
          <a
            href="https://cavuno.com"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {m.embedJobs_poweredByCavunoLabel()}
          </a>
        ) : null}
      </footer>
    </div>
  );
}
