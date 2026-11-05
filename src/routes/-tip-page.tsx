/**
 * The tip page: the board's tip jar with three suggested amounts plus
 * "Other", an optional note, and the tip count when the board shows it.
 * "Tip" mounts the embedded Stripe Checkout in place of the form; Stripe
 * returns the tipper here with `session_id`, and the page polls the checkout
 * until it is paid (thank-you) or shows that the payment is processing.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import {
  tipCoverFeeCents,
  type TipJar,
  type TipJarCheckout,
  type TipJarCheckoutStatus,
} from '@cavuno/board';
import { Link } from '@tanstack/react-router';
import {
  CircleCheck,
  Clock,
  HandHeart,
  Lock,
  Plus,
  SearchX,
} from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { formatMoney, parseAmountCents } from '@/board/product-view-model';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { boardErrorMessage } from '@/lib/board-error-message';
import { cn } from '@/lib/utils';

const EmbeddedCheckout = lazy(() =>
  import('@/components/paywall/embedded-checkout').then((module) => ({
    default: module.EmbeddedCheckout,
  })),
);

/** Polls after Stripe returns: every 2 s for about a minute. */
const POLL_ATTEMPTS = 30;

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

export type TipCheckoutValues = {
  amountCents: number;
  note?: string;
  website?: string;
  /** Only when the tipper ticked "cover the card fee"; never `false`. */
  coverFee?: true;
};

export type TipPageDependencies = {
  startCheckout: (input: {
    data: TipCheckoutValues & { returnPath: string };
  }) => Promise<ActionResult<TipJarCheckout>>;
  getCheckoutState: (input: {
    data: { sessionId: string };
  }) => Promise<ActionResult<TipJarCheckoutStatus>>;
};

type MountKit = {
  publishableKey: string;
  stripeAccountId: string;
  clientSecret: string;
  sessionId: string | null;
};

function mountKit(checkout: TipJarCheckout): MountKit | null {
  if (
    !checkout.publishableKey ||
    !checkout.stripeAccountId ||
    !checkout.clientSecret
  ) {
    return null;
  }
  return {
    publishableKey: checkout.publishableKey,
    stripeAccountId: checkout.stripeAccountId,
    clientSecret: checkout.clientSecret,
    sessionId: checkout.sessionId,
  };
}

type FieldKey = 'amount' | 'note' | 'coverFee' | 'form';

/** Which field a Board API refusal belongs under. */
export function tipRefusalField(code: string | null): FieldKey {
  switch (code) {
    case 'tip_amount_below_minimum':
    case 'tip_amount_invalid':
      return 'amount';
    case 'tip_note_not_allowed':
    case 'tip_note_too_long':
      return 'note';
    case 'tip_fee_cover_not_allowed':
      return 'coverFee';
    default:
      return 'form';
  }
}

function tipRefusalText(
  refusal: { code: string | null; message: string },
  tipJar: TipJar,
  locale: string,
): string {
  switch (refusal.code) {
    case 'tip_amount_below_minimum':
      return m.tip_amountBelowMinimumText({
        minimum: formatMoney(locale, tipJar.minimumCents, tipJar.currency),
      });
    case 'tip_amount_invalid':
      return m.tip_amountInvalidText();
    case 'tip_note_too_long':
      return m.tip_noteTooLongText({ max: String(tipJar.noteMaxLength) });
    case 'tip_note_not_allowed':
      return m.tip_noteNotAllowedText();
    case 'tip_fee_cover_not_allowed':
      return m.tip_coverFeeNotAllowedText();
    default:
      // stripe_not_connected, rate_limited, … and the generic fallback.
      return boardErrorMessage(refusal);
  }
}

/**
 * The amount the tipper chose, or why it can't be taken. Suggested amounts
 * come from the API and are always valid; "Other" is checked here against
 * the minimum and whole minor units. There is no maximum here: Stripe's
 * depends on the currency and payment method, and the API returns
 * `tip_amount_invalid` when Stripe refuses an amount as too large.
 */
export function resolveTipAmount(
  tipJar: TipJar,
  choice: string,
  otherText: string,
  locale: string,
): { ok: true; amountCents: number } | { ok: false; error: string } {
  if (choice !== 'other') {
    const suggested = tipJar.suggestedCents[Number(choice)];
    if (suggested !== undefined) return { ok: true, amountCents: suggested };
  }
  const parsed = parseAmountCents(otherText);
  if (parsed === null) return { ok: false, error: m.tip_amountInvalidText() };
  if (parsed < tipJar.minimumCents) {
    return {
      ok: false,
      error: m.tip_amountBelowMinimumText({
        minimum: formatMoney(locale, tipJar.minimumCents, tipJar.currency),
      }),
    };
  }
  return { ok: true, amountCents: parsed };
}

type ReturnState =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  /** Still clearing; `polling` false once the minute of polls ran out. */
  | { kind: 'processing'; polling: boolean }
  | { kind: 'paid'; status: TipJarCheckoutStatus }
  | { kind: 'missing' };

/** Poll the tip checkout until it is paid; ~60 s, then offer a re-check. */
function useTipCheckoutReturn(
  sessionId: string | null,
  getCheckoutState: TipPageDependencies['getCheckoutState'],
) {
  const [state, setState] = useState<ReturnState>(
    sessionId ? { kind: 'confirming' } : { kind: 'idle' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let attempts = 0;
    let timer: number;
    const tick = async () => {
      attempts += 1;
      let result: ActionResult<TipJarCheckoutStatus> | null = null;
      try {
        result = await getCheckoutState({ data: { sessionId } });
      } catch {
        result = null;
      }
      if (stop) return;
      if (result?.ok && result.data.status === 'paid') {
        setState({ kind: 'paid', status: result.data });
        return;
      }
      if (result && !result.ok && result.code === 'tip_checkout_not_found') {
        setState({ kind: 'missing' });
        return;
      }
      if (result?.ok) setState({ kind: 'processing', polling: true });
      if (attempts >= POLL_ATTEMPTS) {
        setState({ kind: 'processing', polling: false });
        return;
      }
      timer = window.setTimeout(tick, 2000);
    };
    timer = window.setTimeout(tick, 500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [attempt, getCheckoutState, sessionId]);

  return {
    state,
    retry: () => {
      setState({ kind: 'processing', polling: true });
      setAttempt((value) => value + 1);
    },
  };
}

export function TipPageView({
  tipJar,
  boardName,
  returnPath,
  sessionId,
  dependencies,
}: {
  tipJar: TipJar;
  boardName: string;
  /** This page's own path, where Stripe sends the tipper back. */
  returnPath: string;
  /** Set when Stripe sent the tipper back. */
  sessionId: string | null;
  dependencies: TipPageDependencies;
}) {
  const [kit, setKit] = useState<MountKit | null>(null);
  const [kitAmountCents, setKitAmountCents] = useState(0);
  const [kitSessionId, setKitSessionId] = useState<string | null>(null);
  const returning = useTipCheckoutReturn(
    sessionId ?? kitSessionId,
    dependencies.getCheckoutState,
  );

  const handleStripeComplete = useCallback(() => {
    // Stripe normally redirects to the return URL; if it completes in place,
    // start confirming the tip here.
    setKitSessionId((current) => current ?? kit?.sessionId ?? null);
    setKit(null);
  }, [kit]);

  if (returning.state.kind !== 'idle') {
    return (
      <TipReturnState
        state={returning.state}
        boardName={boardName}
        onRetry={returning.retry}
      />
    );
  }

  if (kit) {
    return (
      <Page width="content">
        <PageContent
          header={
            <PageHeader
              title={m.tip_checkoutTitle()}
              description={`${tipJar.name} · ${formatMoney(getLocale(), kitAmountCents, tipJar.currency)}`}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKit(null)}
                >
                  {m.tip_backAction()}
                </Button>
              }
            />
          }
        >
          <Suspense fallback={<Spinner className="mx-auto size-6" />}>
            <EmbeddedCheckout kit={kit} onComplete={handleStripeComplete} />
          </Suspense>
        </PageContent>
      </Page>
    );
  }

  return (
    <TipForm
      tipJar={tipJar}
      boardName={boardName}
      onStart={async (values) => {
        const result = await dependencies.startCheckout({
          data: { ...values, returnPath },
        });
        if (!result.ok) return { code: result.code, message: result.message };
        const nextKit = mountKit(result.data);
        if (!nextKit) return { code: null, message: '' };
        setKitAmountCents(
          values.amountCents +
            (values.coverFee
              ? tipCoverFeeCents(values.amountCents, tipJar.coverFee)
              : 0),
        );
        setKit(nextKit);
      }}
    />
  );
}

function TipForm({
  tipJar,
  boardName,
  onStart,
}: {
  tipJar: TipJar;
  boardName: string;
  /** Resolves with a refusal to show, or nothing once checkout mounts. */
  onStart: (
    values: TipCheckoutValues,
  ) => Promise<{ code: string | null; message: string } | void>;
}) {
  const id = useId();
  const locale = getLocale();
  const otherInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const addNoteButton = useRef<HTMLButtonElement>(null);
  // The middle suggestion starts selected, like most tip jars.
  const [choice, setChoice] = useState(
    tipJar.suggestedCents.length > 1 ? '1' : '0',
  );
  const [otherText, setOtherText] = useState('');
  // The note starts collapsed behind "Add a note"; only an open note is sent.
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  // Unticked by default; offered only when the board passes the fee on.
  const [coverFee, setCoverFee] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const focusOther = useEffectEvent(() => otherInput.current?.focus());
  const [otherPicked, setOtherPicked] = useState(0);
  useEffect(() => {
    if (otherPicked > 0) focusOther();
  }, [otherPicked]);
  // Opening the note moves focus into it; removing it returns focus to
  // "Add a note". Skipped on the first render so the page never steals focus.
  const noteToggled = useRef(false);
  useEffect(() => {
    if (!noteToggled.current) return;
    if (noteOpen) noteInput.current?.focus();
    else addNoteButton.current?.focus();
  }, [noteOpen]);

  const resolved = resolveTipAmount(tipJar, choice, otherText, locale);
  const money = (cents: number) => formatMoney(locale, cents, tipJar.currency);
  // The exact fee the checkout adds for `coverFee: true`.
  const feeCents =
    tipJar.coverFee && resolved.ok
      ? tipCoverFeeCents(resolved.amountCents, tipJar.coverFee)
      : 0;
  const offerCoverFee = feeCents > 0;
  const chargeCents = resolved.ok
    ? resolved.amountCents + (offerCoverFee && coverFee ? feeCents : 0)
    : 0;

  function toggleNote(open: boolean) {
    noteToggled.current = true;
    setNoteOpen(open);
    if (!open) {
      setNote('');
      if (errors.note) setErrors({ ...errors, note: undefined });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolved.ok) {
      setErrors({ amount: resolved.error });
      otherInput.current?.focus();
      return;
    }
    setErrors({});
    setPending(true);
    const values: TipCheckoutValues = {
      amountCents: resolved.amountCents,
      note: tipJar.allowNote && noteOpen ? note.trim() || undefined : undefined,
      website: website || undefined,
    };
    // Unticked tips send the same request as before: no coverFee at all.
    if (offerCoverFee && coverFee) values.coverFee = true;
    try {
      const refusal = await onStart(values);
      if (refusal) {
        if (refusal.code === 'tip_fee_cover_not_allowed') setCoverFee(false);
        setErrors({
          [tipRefusalField(refusal.code)]: tipRefusalText(
            refusal,
            tipJar,
            locale,
          ),
        });
      }
    } catch {
      setErrors({ form: boardErrorMessage({}) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Page width="narrow">
      <PageContent>
        <div className="mx-auto flex w-full max-w-120 flex-col gap-8">
          <header className="flex flex-col gap-1.5">
            <Text variant="heading1" as="h1" className="tracking-tight">
              {tipJar.name}
            </Text>
            {tipJar.descriptionHtml ? (
              <Prose
                html={tipJar.descriptionHtml}
                className="text-muted-foreground"
              />
            ) : tipJar.description ? (
              <Text
                variant="secondary"
                className="leading-relaxed whitespace-pre-line"
                dir="auto"
              >
                {tipJar.description}
              </Text>
            ) : null}
          </header>

          <Card>
            <CardContent>
              <form
                noValidate
                onSubmit={submit}
                aria-labelledby={`${id}-title`}
                className="flex flex-col gap-6"
                data-test="tip-form"
              >
                <div className="flex flex-col gap-3">
                  <Text variant="heading4" as="h2" id={`${id}-title`}>
                    {m.tip_cardTitle()}
                  </Text>
                  {tipJar.tipCount !== null ? (
                    <div
                      className="flex items-center gap-3"
                      data-test="tip-count"
                    >
                      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                        <HandHeart aria-hidden="true" className="size-4" />
                      </span>
                      <Text variant="secondary" size="sm">
                        {m.tip_tippedCountText({
                          count: tipJar.tipCount,
                          countLabel: new Intl.NumberFormat(locale).format(
                            tipJar.tipCount,
                          ),
                        })}
                      </Text>
                    </div>
                  ) : null}
                </div>

                <FieldGroup className="gap-6">
                  <FieldSet data-invalid={Boolean(errors.amount) || undefined}>
                    <FieldLegend variant="label">
                      {m.tip_amountLegend()}
                    </FieldLegend>
                    <RadioGroup
                      name="amount"
                      value={choice}
                      onValueChange={(value: string | null) => {
                        if (value === null) return;
                        setChoice(value);
                        if (errors.amount) {
                          setErrors({ ...errors, amount: undefined });
                        }
                        if (value === 'other') setOtherPicked((n) => n + 1);
                      }}
                      className="grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {[
                        ...tipJar.suggestedCents.map((cents, index) => ({
                          value: String(index),
                          label: money(cents),
                        })),
                        { value: 'other', label: m.tip_otherAmountOption() },
                      ].map((option) => (
                        <FieldLabel
                          key={option.value}
                          htmlFor={`${id}-amount-${option.value}`}
                          className="hover:bg-muted has-data-checked:border-primary has-focus-visible:ring-ring/30 cursor-pointer justify-center transition-colors has-focus-visible:ring-3 *:data-[slot=field]:px-1 *:data-[slot=field]:py-3"
                        >
                          <Field
                            orientation="horizontal"
                            className="justify-center text-center"
                          >
                            {/* Out of the flow: the whole card is the radio. */}
                            <RadioGroupItem
                              id={`${id}-amount-${option.value}`}
                              value={option.value}
                              className="absolute opacity-0"
                            />
                            <FieldTitle className="justify-center">
                              {option.label}
                            </FieldTitle>
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                    {choice === 'other' ? (
                      <Field data-invalid={Boolean(errors.amount) || undefined}>
                        <FieldLabel htmlFor={`${id}-other`}>
                          {m.tip_otherAmountLabel()}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupAddon>
                            <InputGroupText>
                              {tipJar.currency.toUpperCase()}
                            </InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            ref={otherInput}
                            id={`${id}-other`}
                            name="otherAmount"
                            inputMode="decimal"
                            autoComplete="off"
                            value={otherText}
                            aria-invalid={Boolean(errors.amount) || undefined}
                            aria-describedby={`${id}-other-help`}
                            onChange={(event) => {
                              setOtherText(event.target.value);
                              if (errors.amount) {
                                setErrors({ ...errors, amount: undefined });
                              }
                            }}
                          />
                        </InputGroup>
                        {errors.amount ? (
                          <FieldError id={`${id}-other-help`}>
                            {errors.amount}
                          </FieldError>
                        ) : (
                          <FieldDescription id={`${id}-other-help`}>
                            {m.tip_amountHelpText({
                              minimum: money(tipJar.minimumCents),
                            })}
                          </FieldDescription>
                        )}
                      </Field>
                    ) : errors.amount ? (
                      <FieldError>{errors.amount}</FieldError>
                    ) : null}
                  </FieldSet>

                  {offerCoverFee || errors.coverFee ? (
                    <Field
                      orientation="horizontal"
                      data-invalid={Boolean(errors.coverFee) || undefined}
                      className="flex-wrap"
                    >
                      {offerCoverFee ? (
                        <>
                          <Checkbox
                            id={`${id}-cover-fee`}
                            name="coverFee"
                            checked={coverFee}
                            onCheckedChange={(checked) => {
                              setCoverFee(checked === true);
                              if (errors.coverFee) {
                                setErrors({ ...errors, coverFee: undefined });
                              }
                            }}
                          />
                          <FieldLabel
                            htmlFor={`${id}-cover-fee`}
                            className="font-normal"
                          >
                            {m.tip_coverFeeLabel({ fee: money(feeCents) })}
                          </FieldLabel>
                        </>
                      ) : null}
                      {errors.coverFee ? (
                        <FieldError className="basis-full">
                          {errors.coverFee}
                        </FieldError>
                      ) : null}
                    </Field>
                  ) : null}

                  {tipJar.allowNote && !noteOpen ? (
                    <div>
                      <Button
                        ref={addNoteButton}
                        type="button"
                        variant="link"
                        size="inline"
                        className="-ms-1 text-sm"
                        aria-expanded={false}
                        aria-controls={`${id}-note-section`}
                        onClick={() => toggleNote(true)}
                      >
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {m.tip_addNoteAction()}
                      </Button>
                    </div>
                  ) : null}
                  {tipJar.allowNote && noteOpen ? (
                    <Field
                      id={`${id}-note-section`}
                      data-invalid={Boolean(errors.note) || undefined}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <FieldLabel htmlFor={`${id}-note`}>
                          {m.tip_noteLabel({ boardName })}
                        </FieldLabel>
                        <Button
                          type="button"
                          variant="link"
                          size="inline"
                          className="-me-1 text-sm"
                          onClick={() => toggleNote(false)}
                        >
                          {m.tip_removeNoteAction()}
                        </Button>
                      </div>
                      <Textarea
                        ref={noteInput}
                        id={`${id}-note`}
                        name="note"
                        rows={3}
                        maxLength={tipJar.noteMaxLength}
                        placeholder={m.tip_notePlaceholder()}
                        value={note}
                        dir="auto"
                        aria-invalid={Boolean(errors.note) || undefined}
                        aria-describedby={`${id}-note-help ${id}-note-count`}
                        onChange={(event) => {
                          setNote(event.target.value);
                          if (errors.note) {
                            setErrors({ ...errors, note: undefined });
                          }
                        }}
                      />
                      {errors.note ? (
                        <FieldError>{errors.note}</FieldError>
                      ) : null}
                      <div className="text-muted-foreground flex items-start justify-between gap-3 text-xs">
                        <p id={`${id}-note-help`} className="flex gap-1.5">
                          <Lock
                            aria-hidden="true"
                            className="mt-0.5 size-3 shrink-0"
                          />
                          {m.tip_notePrivacyText({ boardName })}
                        </p>
                        <p
                          id={`${id}-note-count`}
                          className="shrink-0 tabular-nums"
                        >
                          {m.tip_noteCountText({
                            count: String(note.length),
                            max: String(tipJar.noteMaxLength),
                          })}
                        </p>
                      </div>
                    </Field>
                  ) : null}

                  {/* Honeypot: hidden from people and assistive tech, left empty. */}
                  <div aria-hidden="true" className="sr-only">
                    <label htmlFor={`${id}-website`}>
                      {m.contact_websiteLabel()}
                    </label>
                    <input
                      id={`${id}-website`}
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>
                </FieldGroup>

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    size="xl"
                    className="w-full"
                    disabled={pending}
                    aria-busy={pending || undefined}
                  >
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    {resolved.ok
                      ? m.tip_submitAction({ amount: money(chargeCents) })
                      : m.tip_continueAction()}
                  </Button>
                  {errors.form ? (
                    <FieldError data-test="tip-checkout-error">
                      {errors.form}
                    </FieldError>
                  ) : null}
                  <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                    <Lock aria-hidden="true" className="size-3" />
                    {m.tip_secureCheckoutText()}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </Page>
  );
}

function TipReturnState({
  state,
  boardName,
  onRetry,
}: {
  state: Exclude<ReturnState, { kind: 'idle' }>;
  boardName: string;
  onRetry: () => void;
}) {
  const locale = getLocale();
  return (
    <Page width="narrow">
      <PageContent>
        <Empty className="min-h-96 border-0" data-test={`tip-${state.kind}`}>
          {state.kind === 'confirming' ? (
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <Text variant="heading2" as="h1">
                {m.tip_confirmingTitle()}
              </Text>
              <EmptyDescription>{m.tip_confirmingText()}</EmptyDescription>
            </EmptyHeader>
          ) : state.kind === 'paid' ? (
            <>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleCheck aria-hidden="true" />
                </EmptyMedia>
                <Text variant="heading2" as="h1">
                  {m.tip_thankYouTitle()}
                </Text>
                <EmptyDescription>
                  {m.tip_thankYouAmountText({
                    boardName,
                    amount: formatMoney(
                      locale,
                      state.status.amountCents,
                      state.status.currency,
                    ),
                  })}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {state.status.thankYouMessage ? (
                  <p
                    className="text-foreground leading-relaxed whitespace-pre-line"
                    dir="auto"
                  >
                    {state.status.thankYouMessage}
                  </p>
                ) : null}
                {state.status.receiptEmail ? (
                  <p className="text-muted-foreground text-sm">
                    {m.tip_receiptSentText({
                      email: state.status.receiptEmail,
                    })}
                  </p>
                ) : null}
                <Link
                  to="/jobs"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  {m.tip_browseJobsAction()}
                </Link>
              </EmptyContent>
            </>
          ) : state.kind === 'processing' ? (
            <>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock aria-hidden="true" />
                </EmptyMedia>
                <Text variant="heading2" as="h1">
                  {m.tip_processingTitle()}
                </Text>
                <EmptyDescription>{m.tip_processingText()}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {state.polling ? (
                  <Spinner className="size-5" />
                ) : (
                  <Button variant="outline" onClick={onRetry}>
                    {m.tip_checkAgainAction()}
                  </Button>
                )}
              </EmptyContent>
            </>
          ) : (
            <>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <Text variant="heading2" as="h1">
                  {m.tip_checkoutMissingTitle()}
                </Text>
                <EmptyDescription>
                  {m.tip_checkoutMissingText()}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link
                  to="/tip"
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  {m.tip_startOverAction()}
                </Link>
              </EmptyContent>
            </>
          )}
        </Empty>
      </PageContent>
    </Page>
  );
}
