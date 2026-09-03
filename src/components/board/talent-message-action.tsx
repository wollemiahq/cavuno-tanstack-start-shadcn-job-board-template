'use client';

import { useState } from 'react';

import { Link } from '@tanstack/react-router';

import type {
  TalentDetailCtaComposer,
  TalentDetailCtaLink,
} from '@/board/talent-view-model';
import { Composer } from '@/components/messages/composer';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { m } from '@/paraglide/messages';

export type StartTalentConversation = (input: {
  candidateHandle: string;
  body: string;
  job?: string;
}) => Promise<
  | { ok: true; data: { conversationId: string } }
  | { ok: false; code: string; message: string }
>;

export function TalentMessageAction({
  action,
  candidateName,
  onStartConversation,
  onConversationStarted,
}: {
  action: TalentDetailCtaLink | TalentDetailCtaComposer;
  candidateName: string;
  onStartConversation?: StartTalentConversation;
  onConversationStarted?: (conversationId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (action.kind === 'link') {
    return (
      <Link to={action.href} className={buttonVariants()}>
        {action.label}
      </Link>
    );
  }

  if (!onStartConversation || !onConversationStarted) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>
        {action.label}
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>
            {m.talentMessage_title({ name: candidateName })}
          </DialogTitle>
          <DialogDescription>{m.talentMessage_description()}</DialogDescription>
        </DialogHeader>
        <Composer
          disabled={false}
          hint={null}
          onSend={async (body) => {
            const result = await onStartConversation({
              candidateHandle: action.candidateHandle,
              body,
            });
            if (!result.ok) throw result;
            return result.data.conversationId;
          }}
          onSent={(conversationId) => {
            setOpen(false);
            onConversationStarted(conversationId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
