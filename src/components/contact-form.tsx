'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CircleCheck } from 'lucide-react';

import { m } from '../paraglide/messages';
import { submitContact } from '../server/contact';
import { useRootSession } from './root-session';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function requestId() {
  return crypto.randomUUID();
}

export function ContactForm({ onSent }: { onSent?: () => void }) {
  const { user, ready } = useRootSession();
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(requestId());
  const nameTouched = useRef(false);
  const emailTouched = useRef(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!ready || !user) return;
    if (!nameTouched.current) setName(user.displayName ?? '');
    if (!emailTouched.current) setEmail(user.email ?? '');
  }, [ready, user]);

  useEffect(() => {
    if (sentEmail) successHeadingRef.current?.focus();
  }, [sentEmail]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const website = form.get('website');
    try {
      const result = await submitContact({
        data: {
          name,
          email,
          body,
          requestId: requestIdRef.current,
          // FormData may return File for malformed programmatic submissions.
          // oxlint-disable-next-line anti-slop/no-runtime-typeof
          website: typeof website === 'string' ? website : '',
        },
      });
      if (!result.ok) {
        setError(result.message || m.contact_error());
        return;
      }
      setSentEmail(email.trim());
      onSent?.();
      requestIdRef.current = requestId();
    } catch {
      setError(m.contact_error());
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (sentEmail) {
    return (
      <div
        role="status"
        className="border-border bg-card motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 flex min-h-72 flex-col justify-center rounded-3xl border p-8 duration-300 md:p-10"
      >
        <div className="bg-primary/10 text-primary mb-6 flex size-12 items-center justify-center rounded-full">
          <CircleCheck aria-hidden="true" className="size-6" />
        </div>
        <h2
          ref={successHeadingRef}
          tabIndex={-1}
          className="text-foreground text-2xl font-semibold outline-none"
        >
          {m.contact_successTitle()}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg text-base leading-7 break-words">
          {m.contact_successBody({ email: sentEmail })}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-border bg-card space-y-5 rounded-3xl border p-6 md:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">{m.contact_nameLabel()}</Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            disabled={!hydrated || pending}
            maxLength={150}
            value={name}
            onChange={(event) => {
              nameTouched.current = true;
              setName(event.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">{m.contact_emailLabel()}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={!hydrated || pending}
            maxLength={254}
            value={email}
            onChange={(event) => {
              emailTouched.current = true;
              setEmail(event.target.value);
            }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-body">{m.contact_messageLabel()}</Label>
        <Textarea
          id="contact-body"
          name="body"
          required
          disabled={!hydrated || pending}
          maxLength={20000}
          rows={8}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <Label htmlFor="contact-website">{m.contact_websiteLabel()}</Label>
        <Input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!hydrated || pending}>
        {!hydrated
          ? m.contact_loading()
          : pending
            ? m.contact_sending()
            : m.contact_send()}
      </Button>
    </form>
  );
}
