'use client';

import { useState } from 'react';

import { formatDate } from '@cavuno/board/format';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  disconnectAssistant,
  getConnectedAssistants,
  type ConnectedAssistant,
} from '../server/settings';

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

function day(iso: string): string {
  return formatDate(getLocale(), iso) ?? iso.slice(0, 10);
}

/**
 * The AI assistants the person connected to the board's MCP server, each
 * with a Disconnect button. Nothing renders without one, so a board whose
 * MCP server is off (the list is then empty) never shows the card.
 */
export function SettingsAssistantsCard({
  assistants: initialAssistants,
  board,
  disconnect = disconnectAssistant,
  listAssistants = getConnectedAssistants,
}: {
  assistants: ConnectedAssistant[];
  board: string;
  disconnect?: (options: {
    data: { assistantId: string };
  }) => ReturnType<typeof disconnectAssistant>;
  listAssistants?: () => ReturnType<typeof getConnectedAssistants>;
}) {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (assistants.length === 0) return null;

  const remove = (id: string) =>
    setAssistants((current) =>
      current.filter((assistant) => assistant.id !== id),
    );

  const onDisconnect = async (assistant: ConnectedAssistant) => {
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
      if (!result.ok) {
        // Already gone (disconnected elsewhere): read the list again. The
        // row is dropped either way, so a failed read changes nothing.
        listAssistants().then(setAssistants, () => undefined);
      }
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
