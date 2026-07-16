'use client';

import { useState } from 'react';

import { MoreHorizontal } from 'lucide-react';

import { errorMessage } from '../../lib/message-error';
import { withinEditWindow } from '../../lib/message-format';
import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';
import { HydrationSafeDate } from './hydration-safe-date';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Message as BoardMessage } from '@cavuno/board';

type Reason = 'spam' | 'harassment' | 'misrepresentation' | 'other';

const REASONS: { value: Reason; label: () => string }[] = [
  { value: 'spam', label: m.messageBubble_reasonSpam },
  { value: 'harassment', label: m.messageBubble_reasonHarassment },
  {
    value: 'misrepresentation',
    label: m.messageBubble_reasonMisrepresentation,
  },
  { value: 'other', label: m.messageBubble_reasonOther },
];

export function MessageBubble({
  message,
  own,
  showSeen,
  onChanged,
  onReported,
  onEdit,
  onUnsend,
  onReport,
}: {
  message: BoardMessage;
  own: boolean;
  showSeen: boolean;
  onChanged: () => void;
  onReported: () => void;
  onEdit: (body: string) => Promise<unknown>;
  onUnsend: () => Promise<unknown>;
  onReport: (reason: Reason) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'report'>('view');
  const [draft, setDraft] = useState(message.body);
  const [reason, setReason] = useState<Reason>('spam');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleted = message.deletedAt !== null;
  const canEdit = own && !deleted && withinEditWindow(message.sentAt);
  const canReport = !own && !deleted;
  const alignment = own ? 'end' : 'start';

  const run = async (fn: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = () =>
    run(
      () => onEdit(draft.trim()),
      () => {
        setMode('view');
        onChanged();
      },
    );

  const unsend = () => run(onUnsend, () => onChanged());

  const submitReport = () =>
    run(
      () => onReport(reason),
      () => onReported(),
    );

  return (
    <Message
      align={alignment}
      data-message-id={message.id}
      data-own={own}
      data-deleted={deleted}
    >
      <MessageAvatar>
        <Avatar
          url={message.author.avatarUrl}
          name={message.author.displayName}
          className="size-8"
        />
      </MessageAvatar>
      <MessageContent>
        <MessageHeader className={own ? 'justify-end' : undefined}>
          {message.author.displayName}
          {message.author.companyName
            ? ` · ${message.author.companyName}`
            : null}
        </MessageHeader>

        <div className="group flex max-w-full items-start gap-1 group-data-[align=end]/message:flex-row-reverse">
          {mode === 'edit' ? (
            <Bubble
              align={alignment}
              variant="outline"
              className="w-72 max-w-full"
            >
              <BubbleContent className="w-full space-y-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  maxLength={8000}
                  className="max-h-40 overflow-y-auto"
                  aria-label={m.messageBubble_editLabel()}
                  data-test="edit-textarea"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveEdit}
                    disabled={busy || !draft.trim()}
                  >
                    {m.messageBubble_saveLabel()}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode('view');
                      setDraft(message.body);
                    }}
                  >
                    {m.messageBubble_cancelLabel()}
                  </Button>
                </div>
              </BubbleContent>
            </Bubble>
          ) : (
            <Bubble
              align={alignment}
              variant={deleted ? 'ghost' : own ? 'default' : 'muted'}
            >
              <BubbleContent
                className={deleted ? 'text-muted-foreground italic' : undefined}
              >
                <span className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                  {deleted
                    ? m.messageBubble_messageDeletedText()
                    : message.body}
                </span>
              </BubbleContent>
            </Bubble>
          )}

          {(canEdit || canReport) && mode === 'view' ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={m.messageBubble_messageActionsAriaLabel()}
                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    data-test="message-actions"
                  />
                }
              >
                <MoreHorizontal aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align={own ? 'end' : 'start'}>
                {canEdit ? (
                  <DropdownMenuItem onClick={() => setMode('edit')}>
                    {m.messageBubble_editLabel()}
                  </DropdownMenuItem>
                ) : null}
                {canEdit ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => void unsend()}
                  >
                    {m.messageBubble_unsendLabel()}
                  </DropdownMenuItem>
                ) : null}
                {canReport ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setMode('report')}
                  >
                    {m.messageBubble_reportLabel()}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {mode === 'report' ? (
          <Card size="sm" className="w-64 max-w-full gap-0 py-3">
            <CardHeader className="px-3 pb-2">
              <CardTitle>{m.messageBubble_reportTitle()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3">
              <Select
                value={reason}
                onValueChange={(value) => setReason(value as Reason)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  aria-label={m.messageBubble_reportTitle()}
                  data-test="report-reason"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {m.messageBubble_reportBlocksText()}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={submitReport} disabled={busy}>
                  {m.messageBubble_submitReportLabel()}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('view')}
                >
                  {m.messageBubble_cancelLabel()}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <MessageFooter>
          <time dateTime={message.sentAt}>
            <HydrationSafeDate iso={message.sentAt} presentation="clock" />
          </time>
          {message.editedAt && !deleted ? (
            <span className="ml-1">{m.messageBubble_editedText()}</span>
          ) : null}
          {showSeen && message.readAt ? (
            <span className="ml-1" data-slot="message-footer" data-test="seen">
              <HydrationSafeDate iso={message.readAt} presentation="clock">
                {(time) => m.messageBubble_seenText({ time })}
              </HydrationSafeDate>
            </span>
          ) : null}
        </MessageFooter>

        {error ? (
          <Alert variant="destructive" className="px-3 py-2 text-xs">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : null}
      </MessageContent>
    </Message>
  );
}
