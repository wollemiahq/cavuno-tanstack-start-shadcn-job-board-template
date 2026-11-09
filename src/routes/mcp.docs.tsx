import { Fragment, type ReactNode } from 'react';

import { Link, createFileRoute } from '@tanstack/react-router';
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

/**
 * Names quoted verbatim from other products: the assistants' own menu labels
 * and their config file paths. They stay as those products show them, so
 * they are not catalog copy.
 */
const VERBATIM = {
  claudeConnectorsMenu: 'Customize → Connectors',
  claudeAddButton: '+ Add',
  claudeCustomConnector: 'Add custom connector',
  chatgptPluginsMenu: 'Plugins',
  chatgptPlusButton: '+',
  chatgptCustomServer: 'Add custom MCP server',
  cursorConfigFile: '~/.cursor/mcp.json',
  vscodeConfigFile: '.vscode/mcp.json',
} as const;

const MARKER = '\u0000';

/**
 * A message whose params are elements (a bold menu name, a file path in
 * code). Each param goes into the message as a marker, and the translated
 * text is split around the markers, so word order stays the locale's.
 */
function richMessage<Key extends string>(
  render: (params: Record<Key, string>) => string,
  nodes: Record<Key, ReactNode>,
): ReactNode[] {
  // SAFETY: `nodes` is typed Record<Key, ReactNode>, so its own keys are Key.
  const keys = Object.keys(nodes) as Key[];
  // SAFETY: built from `keys`, so it holds a marker for every Key.
  const params = Object.fromEntries(
    keys.map((key, index) => [key, `${MARKER}${index}${MARKER}`]),
  ) as Record<Key, string>;
  return render(params)
    .split(new RegExp(`${MARKER}(\\d+)${MARKER}`))
    .map((part, index) =>
      index % 2 === 1 ? (
        <Fragment key={index}>{nodes[keys[Number(part)]]}</Fragment>
      ) : (
        part
      ),
    );
}

/** Backticked spans in a tool description become inline code. */
function withInlineCode(text: string): ReactNode[] {
  return text
    .split(/`([^`]+)`/)
    .map((part, index) =>
      index % 2 === 1 ? <code key={index}>{part}</code> : part,
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
          <p>
            {richMessage(m.mcpDocs_intro, {
              boardName: <Link to="/">{boardName}</Link>,
            })}
          </p>
          <CopyBlock value={view.mcpUrl} label={m.mcpDocs_copyUrlLabel()} />
          <p>{m.mcpDocs_access({ boardName })}</p>

          <h2>{m.mcpDocs_assistantsHeading()}</h2>
          <h3>{m.mcpDocs_claudeHeading()}</h3>
          <p>
            {richMessage(m.mcpDocs_claudeSteps, {
              connectorsMenu: <strong>{VERBATIM.claudeConnectorsMenu}</strong>,
              addButton: <strong>{VERBATIM.claudeAddButton}</strong>,
              customConnector: (
                <strong>{VERBATIM.claudeCustomConnector}</strong>
              ),
              boardName: <strong>{boardName}</strong>,
            })}
          </p>
          <h3>{m.mcpDocs_claudeCodeHeading()}</h3>
          <CopyBlock value={view.claudeCodeCommand} label={copyCode} />
          <h3>{m.mcpDocs_chatgptHeading()}</h3>
          <p>
            {richMessage(m.mcpDocs_chatgptSteps, {
              pluginsMenu: <strong>{VERBATIM.chatgptPluginsMenu}</strong>,
              plusButton: <strong>{VERBATIM.chatgptPlusButton}</strong>,
              customServer: <strong>{VERBATIM.chatgptCustomServer}</strong>,
            })}
          </p>
          <h3>{m.mcpDocs_cursorHeading()}</h3>
          <p>
            {richMessage(m.mcpDocs_addToFile, {
              file: <code>{VERBATIM.cursorConfigFile}</code>,
            })}
          </p>
          <CopyBlock value={view.cursorConfig} label={copyCode} />
          <h3>{m.mcpDocs_vscodeHeading()}</h3>
          <p>
            {richMessage(m.mcpDocs_addToFile, {
              file: <code>{VERBATIM.vscodeConfigFile}</code>,
            })}
          </p>
          <CopyBlock value={view.vscodeConfig} label={copyCode} />
          <h3>{m.mcpDocs_otherHeading()}</h3>
          <p>{m.mcpDocs_otherSteps()}</p>

          <h2>{m.mcpDocs_toolsHeading()}</h2>
          <ul>
            {view.tools.map((tool) => (
              <li key={tool.name}>
                <code>{tool.name}</code>
                {tool.description ? (
                  <> — {withInlineCode(tool.description)}</>
                ) : null}
              </li>
            ))}
          </ul>

          <h2>{m.mcpDocs_limitsHeading()}</h2>
          <p>{m.mcpDocs_limits()}</p>
        </Prose>
      </div>
    </PageLayout>
  );
}
