import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getMcpDocsView } from '../server/mcp-docs';

import { useCopyLink } from '@/components/board/copy-link-button';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import { Prose } from '@/components/prose';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/mcp/docs')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getMcpDocsView(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: McpDocsPage,
});

/** A command, URL or config file to paste, with its own copy button. */
function CopyBlock({ value, label }: { value: string; label: string }) {
  const { copied, copyLink } = useCopyLink(value);
  return (
    <div className="not-typeset border-border bg-muted relative my-4 rounded-lg border">
      <pre className="overflow-x-auto p-4 pe-14 font-mono text-sm break-all whitespace-pre-wrap">
        <code>{value}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute end-2 top-2"
        aria-label={copied ? m.mcpDocs_copiedLabel() : label}
        onClick={() => void copyLink()}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}

function McpDocsPage() {
  const view = Route.useLoaderData();
  const { boardName } = view;
  const copyCode = m.mcpDocs_copyCodeLabel();

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl">
        <Prose as="article" dir={undefined}>
          <h1 dir="auto">{m.mcpDocs_title({ boardName })}</h1>
          <p>{m.mcpDocs_intro({ boardName })}</p>
          <CopyBlock value={view.mcpUrl} label={m.mcpDocs_copyUrlLabel()} />
          <p>{m.mcpDocs_access({ boardName })}</p>

          <h2>{m.mcpDocs_assistantsHeading()}</h2>
          <h3>{m.mcpDocs_claudeHeading()}</h3>
          <p>{m.mcpDocs_claudeSteps({ boardName })}</p>
          <h3>{m.mcpDocs_claudeCodeHeading()}</h3>
          <CopyBlock value={view.claudeCodeCommand} label={copyCode} />
          <h3>{m.mcpDocs_chatgptHeading()}</h3>
          <p>{m.mcpDocs_chatgptSteps()}</p>
          <h3>{m.mcpDocs_cursorHeading()}</h3>
          <p>{m.mcpDocs_addToFile({ file: '~/.cursor/mcp.json' })}</p>
          <CopyBlock value={view.cursorConfig} label={copyCode} />
          <h3>{m.mcpDocs_vscodeHeading()}</h3>
          <p>{m.mcpDocs_addToFile({ file: '.vscode/mcp.json' })}</p>
          <CopyBlock value={view.vscodeConfig} label={copyCode} />
          <h3>{m.mcpDocs_otherHeading()}</h3>
          <p>{m.mcpDocs_otherSteps()}</p>

          <h2>{m.mcpDocs_toolsHeading()}</h2>
          <p>
            {m.mcpDocs_tools({ boardName })}
            {view.salaryTools ? ` ${m.mcpDocs_toolsSalaries()}` : null}
          </p>

          <h2>{m.mcpDocs_limitsHeading()}</h2>
          <p>{m.mcpDocs_limits()}</p>
        </Prose>
      </div>
    </PageLayout>
  );
}
