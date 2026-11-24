'use client';

import { useState } from 'react';

import { formatDate } from '@cavuno/board/format';

import { scopeLabel } from '../board/mcp-scope-copy';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { disconnectAssistant } from '../server/settings';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';
import type { Assistant } from '@cavuno/board';

function day(iso: string): string {
  return formatDate(getLocale(), iso) ?? iso.slice(0, 10);
}

/**
 * The AI assistants the person connected to the board's MCP server, each
 * with its website, what it was allowed to do and a Disconnect button. Nothing renders without one, so a board whose
 * MCP server is off (the list is then empty) never shows the card.
 */
export function SettingsAssistantsCard({
  assistants: initialAssistants,
  board,
  disconnect = disconnectAssistant,
}: {
  assistants: Assistant[];
  board: string;
  disconnect?: (options: {
    data: { assistantId: string };
  }) => ReturnType<typeof disconnectAssistant>;
}) {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (assistants.length === 0) return null;

  const remove = (id: string) =>
    setAssistants((current) =>
      current.filter((assistant) => assistant.id !== id),
    );

  const onDisconnect = async (assistant: Assistant) => {
    setPendingId(assistant.id);
    try {
      const result = await disconnect({ data: { assistantId: assistant.id } });
      if (!result.ok && result.code !== 'assistant_not_found') {
        void toastActionError(boardErrorMessage(result));
        return;
      }
      remove(assistant.id);
      void toastActionSuccess(
        m.settingsAssistants_disconnectedText({ name: assistant.name }),
      );
    } catch {
      void toastActionError();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card data-test="settings-assistants-card">
      <CardHeader>
        <CardTitle>
          <h2>{m.settingsAssistants_title()}</h2>
        </CardTitle>
        <CardDescription>
          {m.settingsAssistants_description({ board })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {assistants.map((assistant) => (
            <li key={assistant.id}>
              <Item variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{assistant.name}</ItemTitle>
                  {assistant.host ? (
                    <ItemDescription>{assistant.host}</ItemDescription>
                  ) : null}
                  {assistant.scopes.length > 0 ? (
                    <ul
                      aria-label={m.settingsAssistants_scopesLabel()}
                      className="flex flex-wrap gap-1.5"
                    >
                      {assistant.scopes.map((scope) => (
                        <li key={scope}>
                          <Badge variant="secondary">{scopeLabel(scope)}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {m.settingsAssistants_datesText({
                      connected: day(assistant.connectedAt),
                      lastUsed: day(assistant.lastUsedAt),
                    })}
                  </p>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={m.settingsAssistants_disconnectAriaLabel({
                      name: assistant.name,
                    })}
                    disabled={pendingId === assistant.id}
                    onClick={() => onDisconnect(assistant)}
                  >
                    {m.settingsAssistants_disconnectLabel()}
                  </Button>
                </ItemActions>
              </Item>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
