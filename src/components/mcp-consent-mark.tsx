/**
 * The row above the MCP consent page's heading: who is asking (the
 * assistant's logo, or its initial) and whose account (the board's logo),
 * as on Cavuno's own consent page. Decorative: the heading names both.
 *
 * The logos are files in public/images/assistants/, so they stay out of
 * the page's script.
 */
import { MoreHorizontal } from 'lucide-react';

import { hideBrokenImage } from '@/lib/hide-broken-image';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

/**
 * Logos for the assistants the Board API recognises (`knownAssistant`).
 * `mono` marks are drawn in one dark colour, so dark themes invert them.
 */
const ASSISTANT_LOGOS = {
  Claude: { file: 'claude', mono: false },
  ChatGPT: { file: 'chatgpt', mono: true },
  Grok: { file: 'grok', mono: true },
  Cursor: { file: 'cursor', mono: true },
  'VS Code': { file: 'vscode', mono: false },
  Perplexity: { file: 'perplexity', mono: false },
} satisfies Record<string, { file: string; mono: boolean }>;

/** The logo for a well-known assistant's name, if this site has it. */
function assistantLogo(name: string | null) {
  if (!name || !Object.hasOwn(ASSISTANT_LOGOS, name)) return undefined;
  // SAFETY: `Object.hasOwn` just checked that `name` is one of the keys.
  return ASSISTANT_LOGOS[name as keyof typeof ASSISTANT_LOGOS];
}

const TILE =
  'bg-muted text-foreground border-border flex size-12 items-center justify-center overflow-hidden rounded-2xl border text-lg font-semibold shadow-sm';

export function McpConsentMark({
  clientName,
  knownAssistant,
  boardName,
  boardLogoUrl,
}: {
  clientName: string;
  knownAssistant: string | null;
  boardName: string;
  boardLogoUrl: string | null;
}) {
  const logo = assistantLogo(knownAssistant);
  return (
    <div
      aria-hidden
      data-test="mcp-consent-mark"
      className="flex items-center gap-3"
    >
      <div className={TILE}>
        {logo ? (
          <img
            src={`/images/assistants/${logo.file}.svg`}
            alt=""
            width={24}
            height={24}
            className={cn('size-6', logo.mono && 'dark:invert')}
          />
        ) : (
          (initialsOf(clientName)?.slice(0, 1) ?? null)
        )}
      </div>
      <MoreHorizontal className="text-muted-foreground size-5" />
      <div className={TILE}>
        {boardLogoUrl ? (
          <img
            src={boardLogoUrl}
            alt=""
            width={48}
            height={48}
            className="size-full object-cover"
            onError={hideBrokenImage}
          />
        ) : (
          (initialsOf(boardName)?.slice(0, 1) ?? null)
        )}
      </div>
    </div>
  );
}
