'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

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

export function ContactForm() {
  const { user, ready } = useRootSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(requestId());
  const nameTouched = useRef(false);
  const emailTouched = useRef(false);

  useEffect(() => {
    if (!ready || !user) return;
    if (!nameTouched.current) setName(user.displayName ?? '');
    if (!emailTouched.current) setEmail(user.email ?? '');
  }, [ready, user]);

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
      setSent(true);
      requestIdRef.current = requestId();
    } catch {
      setError(m.contact_error());
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="border-border bg-card rounded-3xl border p-8"
      >
        <h2 className="text-foreground text-xl font-semibold">
          {m.contact_successTitle()}
        </h2>
        <p className="text-muted-foreground mt-2">{m.contact_successBody()}</p>
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
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? m.contact_sending() : m.contact_send()}
      </Button>
    </form>
  );
}
