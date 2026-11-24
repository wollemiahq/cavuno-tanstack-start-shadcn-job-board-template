/**
 * The board MCP server's consent page. An assistant sends its visitor here
 * to sign in; the Board API says which step comes next (`mcp-consent.ts`):
 * sign in, verify the email, the Allow/Cancel choice, or straight back to
 * the assistant. A request for fine scopes (`profile.read`, `jobs.publish`)
 * lists them to tick, and Allow approves only the ticked ones.
 *
 * The API gives the step as facts; the page words them in the board's
 * language (`mcp-consent-copy.ts`).
 */
import { useEffect, useId, useState } from 'react';

import { redirect } from '@tanstack/react-router';

import {
  consentErrorText,
  consentHeading,
  consentRedirectNotice,
  consentScopes,
  consentTrust,
} from '../board/mcp-consent-copy';
import { hasFineScope, scopeCopy } from '../board/mcp-scope-copy';
import { AuthCard, FormError } from '../components/auth-form';
import { McpConsentMark } from '../components/mcp-consent-mark';
import { localizePath } from '../lib/localized-path';
import { MCP_CONSENT_PATH } from '../lib/mcp-authorize-query';
import { m } from '../paraglide/messages';
import {
  getMcpConsentStep,
  type McpConsentDecision,
  type McpConsentResult,
  type McpConsentStep,
} from '../server/mcp-consent';
import { getSeoBase } from '../server/queries';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { boardErrorMessage } from '@/lib/board-error-message';
import { cn } from '@/lib/utils';

export type McpConsentPageStep = Extract<
  McpConsentStep,
  { next: 'consent' | 'redirect' | 'error' }
>;

/**
 * This page, in the board's words, with the query of the Board API's
 * `returnTo` (which names Cavuno's `/oauth/authorize`): sign-in comes back
 * here directly. Kept beside the page, out of the module the shared shell
 * loads.
 */
function mcpConsentReturnTo(returnTo: string): string {
  const { search } = new URL(returnTo, 'https://board.invalid');
  return `${localizePath(MCP_CONSENT_PATH)}${search}`;
}

export async function loadMcpConsent(
  search: string,
  actions: {
    getMcpConsentStep: (input: {
      data: { search: string };
    }) => Promise<McpConsentStep>;
    getSeoBase: () => Promise<{ boardName: string }>;
  } = { getMcpConsentStep, getSeoBase },
): Promise<{ step: McpConsentPageStep; seo?: { boardName: string } }> {
  const [step, seo] = await Promise.all([
    actions.getMcpConsentStep({ data: { search } }),
    actions.getSeoBase().catch(() => undefined),
  ]);
  switch (step.next) {
    // `returnTo` carries the request sealed into it, so the visitor comes
    // back here once they are signed in and verified.
    case 'sign_in':
      throw redirect({
        to: '/auth/sign-in',
        search: { returnTo: mcpConsentReturnTo(step.returnTo) },
      });
    case 'verify_email':
      throw redirect({
        to: '/auth/verify-email-required',
        search: { returnTo: mcpConsentReturnTo(step.returnTo) },
      });
    case 'redirect':
      // A web callback is a plain redirect. An app's own scheme
      // (`cursor://…`) is not one the router redirects to, so the page
      // sends the browser there instead (`McpConsentReturn`).
      if (/^https?:\/\//i.test(step.location)) {
        throw redirect({ href: step.location });
      }
      return { step, seo };
    default:
      return { step, seo };
  }
}

export function McpConsentView({
  step,
  boardName,
  boardLogoUrl,
  decide,
  assignLocation,
}: {
  step: McpConsentPageStep;
  boardName: string;
  boardLogoUrl: string | null;
  decide: (input: {
    data: {
      request: string;
      consentToken: string;
      decision: 'allow' | 'deny';
      approvedScopes?: string[];
    };
  }) => Promise<McpConsentResult>;
  assignLocation: (url: string) => void;
}) {
  if (step.next === 'error') {
    return <McpConsentError message={consentErrorText(step, boardName)} />;
  }
  if (step.next === 'redirect') {
    return (
      <McpConsentReturn
        location={step.location}
        assignLocation={assignLocation}
      />
    );
  }
  return (
    <McpConsentChoice
      step={step}
      boardName={boardName}
      boardLogoUrl={boardLogoUrl}
      decide={decide}
      assignLocation={assignLocation}
    />
  );
}

function McpConsentChoice({
  step,
  boardName,
  boardLogoUrl,
  decide,
  assignLocation,
}: {
  step: Extract<McpConsentStep, { next: 'consent' }>;
  boardName: string;
  boardLogoUrl: string | null;
  decide: Parameters<typeof McpConsentView>[0]['decide'];
  assignLocation: (url: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Allow or Cancel went through: back to the assistant, or an error no
  // second click would change (an expired page, say).
  const [outcome, setOutcome] = useState<McpConsentDecision | null>(null);
  // A request with fine scopes lists each to tick, all ticked; one that
  // comes down to `candidate` and `employer` reads as before and approves
  // them all.
  const picker = hasFineScope(step.requestedScopes.map(({ id }) => id));
  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () => new Set(step.requestedScopes.map(({ id }) => id)),
  );

  async function submit(decision: 'allow' | 'deny') {
    const approvedScopes =
      picker && decision === 'allow'
        ? step.requestedScopes
            .map(({ id }) => id)
            .filter((id) => ticked.has(id))
        : undefined;
    // The Board API refuses Allow with nothing ticked; say so here instead.
    if (approvedScopes?.length === 0) {
      setError(m.mcpConsent_scopesNoneError());
      return;
    }
    const data: Parameters<typeof decide>[0]['data'] = {
      request: step.request,
      consentToken: step.consentToken,
      decision,
    };
    if (approvedScopes) data.approvedScopes = approvedScopes;
    setPending(true);
    setError(null);
    try {
      const result = await decide({ data });
      if (result.ok) {
        setOutcome(result.data);
        return;
      }
      setError(boardErrorMessage(result));
    } catch {
      setError(boardErrorMessage({ code: 'unknown' }));
    }
    setPending(false);
  }

  if (outcome?.next === 'error') {
    return <McpConsentError message={consentErrorText(outcome, boardName)} />;
  }
  if (outcome?.next === 'redirect') {
    return (
      <McpConsentReturn
        location={outcome.location}
        assignLocation={assignLocation}
      />
    );
  }

  const trust = consentTrust(step);
  const notice = consentRedirectNotice(step);
  return (
    <AuthCard
      title={consentHeading(step, boardName)}
      supportingText={m.mcpConsent_signedInAs({ email: step.email })}
      mark={
        <McpConsentMark
          clientName={step.clientName}
          knownAssistant={step.knownAssistant}
          boardName={boardName}
          boardLogoUrl={boardLogoUrl}
        />
      }
    >
      <div className="grid gap-1 text-sm leading-6">
        <p className="text-foreground font-medium">{trust.label}</p>
        <p className="text-muted-foreground">{trust.description}</p>
      </div>
      {picker ? (
        <McpConsentScopePicker
          step={step}
          ticked={ticked}
          disabled={pending}
          onTick={(id, on) => {
            setError(null);
            setTicked((current) => {
              const next = new Set(current);
              if (on) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
        />
      ) : (
        consentScopes(step, boardName).map((paragraph) => (
          <p key={paragraph} className="text-foreground text-sm leading-6">
            {paragraph}
          </p>
        ))
      )}
      {notice ? (
        <p className="text-muted-foreground text-sm leading-6">
          {notice.before}
          <strong className="text-foreground font-medium">{notice.host}</strong>
          {notice.after}
        </p>
      ) : null}
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => void submit('allow')}
        >
          {m.mcpConsent_allowLabel()}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:order-first"
          disabled={pending}
          onClick={() => void submit('deny')}
        >
          {m.mcpConsent_cancelLabel()}
        </Button>
      </div>
    </AuthCard>
  );
}

/**
 * The requested scopes as checkboxes, in the board's language, each marked
 * when one of its changes can't be undone or it reads personal data.
 */
function McpConsentScopePicker({
  step,
  ticked,
  disabled,
  onTick,
}: {
  step: Extract<McpConsentStep, { next: 'consent' }>;
  ticked: ReadonlySet<string>;
  disabled: boolean;
  onTick: (id: string, on: boolean) => void;
}) {
  const idPrefix = useId();
  return (
    <FieldSet>
      <FieldLegend variant="label">
        {m.mcpConsent_scopesLegend({ client: step.clientName })}
      </FieldLegend>
      <FieldGroup data-slot="checkbox-group">
        {step.requestedScopes.map((scope, index) => {
          const copy = scopeCopy(scope);
          const titleId = `${idPrefix}-${index}-title`;
          const textId = `${idPrefix}-${index}-text`;
          const badgesId = `${idPrefix}-${index}-badges`;
          const marked = scope.changes === 'irreversible' || scope.personalData;
          return (
            <FieldLabel key={scope.id}>
              <Field orientation="horizontal">
                <Checkbox
                  aria-labelledby={titleId}
                  aria-describedby={marked ? `${textId} ${badgesId}` : textId}
                  checked={ticked.has(scope.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onTick(scope.id, checked === true)
                  }
                />
                <FieldContent>
                  <FieldTitle id={titleId}>{copy.label}</FieldTitle>
                  <FieldDescription id={textId}>
                    {copy.description}
                  </FieldDescription>
                  {marked ? (
                    <span id={badgesId} className="flex flex-wrap gap-1.5">
                      {scope.changes === 'irreversible' ? (
                        <Badge variant="destructive">
                          {m.mcpConsent_scopeIrreversibleBadge()}
                        </Badge>
                      ) : null}
                      {scope.personalData ? (
                        <Badge variant="outline">
                          {m.mcpConsent_scopePersonalDataBadge()}
                        </Badge>
                      ) : null}
                    </span>
                  ) : null}
                </FieldContent>
              </Field>
            </FieldLabel>
          );
        })}
      </FieldGroup>
    </FieldSet>
  );
}

function McpConsentError({ message }: { message: string }) {
  return (
    <AuthCard title={m.mcpConsent_errorTitle()}>
      <p className="text-muted-foreground text-center text-sm leading-6">
        {message}
      </p>
    </AuthCard>
  );
}

/**
 * Schemes that would run or show something inside this site instead of
 * opening the assistant. The Board API only issues https, loopback http and
 * known app callbacks; this keeps the page safe if that list ever grows
 * wrong, without having to list every app's own scheme here.
 */
const UNSAFE_CALLBACK_SCHEMES: ReadonlySet<string> = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'blob:',
  'file:',
  'about:',
]);

/** An absolute URL with a scheme that opens the assistant. */
function isOpenableCallback(location: string): boolean {
  try {
    return !UNSAFE_CALLBACK_SCHEMES.has(new URL(location).protocol);
  } catch {
    // Relative or protocol-relative: not a callback this page should open.
    return false;
  }
}

function McpConsentReturn({
  location,
  assignLocation,
}: {
  location: string;
  assignLocation: (url: string) => void;
}) {
  const openable = isOpenableCallback(location);
  useEffect(() => {
    if (openable) assignLocation(location);
  }, [assignLocation, location, openable]);
  if (!openable) {
    return <McpConsentError message={boardErrorMessage({ code: 'unknown' })} />;
  }
  return (
    <AuthCard
      title={m.mcpConsent_returnTitle()}
      supportingText={m.mcpConsent_returnBody()}
    >
      <a
        href={location}
        className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
      >
        {m.mcpConsent_returnLabel()}
      </a>
    </AuthCard>
  );
}
