/**
 * The board MCP server's consent page. An assistant sends its visitor here
 * to sign in; the Board API says which step comes next (`mcp-consent.ts`):
 * sign in, verify the email, the Allow/Cancel choice, or straight back to
 * the assistant.
 *
 * The step's own copy (heading, trust line, what the assistant can do) comes
 * from the API in English, the same words as the board's other consent pages.
 */
import { useEffect, useState } from 'react';

import { redirect } from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import { m } from '../paraglide/messages';
import {
  getMcpConsentStep,
  type McpConsentResult,
  type McpConsentStep,
} from '../server/mcp-consent';
import { getSeoBase } from '../server/queries';

import { Button, buttonVariants } from '@/components/ui/button';
import { boardErrorMessage } from '@/lib/board-error-message';
import { cn } from '@/lib/utils';

export type McpConsentPageStep = Extract<
  McpConsentStep,
  { next: 'consent' | 'redirect' | 'error' }
>;

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
    // `returnTo` is this page with the request sealed into it, so the
    // visitor comes back here once they are signed in and verified.
    case 'sign_in':
      throw redirect({
        to: '/auth/sign-in',
        search: { returnTo: step.returnTo },
      });
    case 'verify_email':
      throw redirect({
        to: '/auth/verify-email-required',
        search: { returnTo: step.returnTo },
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
  decide,
  assignLocation,
}: {
  step: McpConsentPageStep;
  decide: (input: {
    data: {
      request: string;
      consentToken: string;
      decision: 'allow' | 'deny';
    };
  }) => Promise<McpConsentResult>;
  assignLocation: (url: string) => void;
}) {
  if (step.next === 'error') {
    return (
      <AuthCard title={m.mcpConsent_errorTitle()}>
        <p className="text-muted-foreground text-center text-sm leading-6">
          {step.message}
        </p>
      </AuthCard>
    );
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
      decide={decide}
      assignLocation={assignLocation}
    />
  );
}

function McpConsentChoice({
  step,
  decide,
  assignLocation,
}: {
  step: Extract<McpConsentStep, { next: 'consent' }>;
  decide: Parameters<typeof McpConsentView>[0]['decide'];
  assignLocation: (url: string) => void;
}) {
  const [pending, setPending] = useState<'allow' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: 'allow' | 'deny') {
    setPending(decision);
    setError(null);
    try {
      const result = await decide({
        data: {
          request: step.request,
          consentToken: step.consentToken,
          decision,
        },
      });
      if (!result.ok) {
        setError(boardErrorMessage(result));
      } else if (result.data.next === 'redirect') {
        // Back to the assistant, which may be another site or an app. The
        // buttons stay disabled while the browser leaves.
        assignLocation(result.data.location);
        return;
      } else {
        setError(result.data.message);
      }
    } catch {
      setError(boardErrorMessage({ code: 'unknown' }));
    }
    setPending(null);
  }

  return (
    <AuthCard
      title={step.heading}
      supportingText={m.mcpConsent_signedInAs({ email: step.email })}
    >
      <div className="grid gap-1 text-sm leading-6">
        <p className="text-foreground font-medium">{step.trust.label}</p>
        <p className="text-muted-foreground">{step.trust.description}</p>
      </div>
      {step.scopes.map((scope) => (
        <p key={scope} className="text-foreground text-sm leading-6">
          {scope}
        </p>
      ))}
      {step.redirectNotice ? (
        <p className="text-muted-foreground text-sm leading-6">
          {step.redirectNotice.map((part, index) =>
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- selects the text member of the API's typed inline union
            typeof part === 'string' ? (
              part
            ) : (
              <strong key={index} className="text-foreground font-medium">
                {part.strong}
              </strong>
            ),
          )}
        </p>
      ) : null}
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending !== null}
          onClick={() => void submit('allow')}
        >
          {m.mcpConsent_allowLabel()}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:order-first"
          disabled={pending !== null}
          onClick={() => void submit('deny')}
        >
          {m.mcpConsent_cancelLabel()}
        </Button>
      </div>
    </AuthCard>
  );
}

function McpConsentReturn({
  location,
  assignLocation,
}: {
  location: string;
  assignLocation: (url: string) => void;
}) {
  useEffect(() => {
    assignLocation(location);
  }, [assignLocation, location]);
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
