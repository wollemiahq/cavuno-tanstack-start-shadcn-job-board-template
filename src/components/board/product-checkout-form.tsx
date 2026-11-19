'use client';

/**
 * The "Before you pay" form, shown in the product page's buy dialog (which
 * owns the title): the email the link goes to, the amount for pay what you
 * want, the product's buyer questions (a required checkbox covers the EU
 * right-to-cancel waiver), an unticked checkbox asking for the board's own
 * email (news and offers), and a hidden honeypot field. Refusals from the Board
 * API are worded under the field they concern.
 */
import { useId, useRef, useState, type FormEvent } from 'react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  formatMoney,
  minimumAmountCents,
  parseAmountCents,
} from '@/board/product-view-model';
import {
  EmailSuggestionHint,
  useEmailSuggestion,
} from '@/components/email-suggestion-hint';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { productErrorMessage } from '@/lib/product-error-message';
import type { Product, ProductCheckoutBody } from '@cavuno/board';

export type ProductCheckoutValues = {
  email: string;
  answers: NonNullable<ProductCheckoutBody['answers']>;
  amountCents?: number;
  marketingConsent?: ProductCheckoutBody['marketingConsent'];
  website?: string;
};

export type ProductCheckoutRefusal = {
  code: string | null;
  message: string;
};

type FieldKey = 'email' | 'amount' | 'answers' | 'form';

/** Which field a Board API refusal belongs under. */
export function refusalField(code: string | null): FieldKey {
  switch (code) {
    case 'product_email_invalid':
    case 'product_email_blocked':
      return 'email';
    case 'product_amount_below_minimum':
    case 'product_amount_invalid':
      return 'amount';
    case 'product_answers_invalid':
      return 'answers';
    default:
      return 'form';
  }
}

export function ProductCheckoutForm({
  product,
  defaultEmail,
  boardName,
  onSubmit,
}: {
  product: Product;
  defaultEmail?: string | null;
  /** The board's name, which the marketing checkbox's wording names. */
  boardName: string;
  /** Resolves with a refusal to show, or nothing once the step moved on. */
  onSubmit: (
    values: ProductCheckoutValues,
  ) => Promise<ProductCheckoutRefusal | void>;
}) {
  const id = useId();
  const locale = getLocale();
  const price = product.price;
  const free = price.kind === 'free';
  const payWhatYouWant = price.kind === 'pay_what_you_want';
  const currency = price.currency ?? 'usd';
  const minimumCents = minimumAmountCents(price);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [amount, setAmount] = useState(() =>
    payWhatYouWant ? String((price.suggestedCents ?? minimumCents) / 100) : '',
  );
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const emailSuggestion = useEmailSuggestion();
  const marketingText = m.emailPreferences_marketingConsent({
    board: boardName,
  });
  const warnedEmail = useRef<string | null>(null);

  function clearMissing(questionId: string) {
    setMissing((previous) => {
      if (!previous.has(questionId)) return previous;
      const next = new Set(previous);
      next.delete(questionId);
      return next;
    });
  }

  function setText(questionId: string, value: string) {
    setTexts((previous) => ({ ...previous, [questionId]: value }));
    clearMissing(questionId);
  }

  function setTick(questionId: string, value: boolean) {
    setTicks((previous) => ({ ...previous, [questionId]: value }));
    clearMissing(questionId);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    let amountCents: number | undefined;
    if (payWhatYouWant) {
      const parsed = parseAmountCents(amount);
      if (parsed === null) {
        nextErrors.amount = m.boardError_productAmountInvalidText();
      } else if (parsed < minimumCents) {
        nextErrors.amount = m.product_amountBelowMinimumText({
          minimum: formatMoney(locale, minimumCents, currency),
        });
      } else {
        amountCents = parsed;
      }
    }
    const unanswered = new Set(
      product.questions
        .filter((question) => {
          if (!question.required) return false;
          return question.kind === 'checkbox'
            ? ticks[question.id] !== true
            : (texts[question.id] ?? '').trim() === '';
        })
        .map((question) => question.id),
    );
    setMissing(unanswered);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || unanswered.size > 0) return;

    const payload: ProductCheckoutValues = {
      email: email.trim(),
      answers: product.questions.flatMap(
        (question): ProductCheckoutValues['answers'] => {
          if (question.kind === 'checkbox') {
            return [
              { questionId: question.id, value: ticks[question.id] === true },
            ];
          }
          const text = (texts[question.id] ?? '').trim();
          return text ? [{ questionId: question.id, value: text }] : [];
        },
      ),
      amountCents,
      // Sent only when ticked, with the exact wording the buyer saw; with no
      // topics, they get the topics the board adds to new sign-ups.
      marketingConsent: marketingOptIn
        ? { granted: true, text: marketingText }
        : undefined,
      website: website || undefined,
    };
    // Checkout has no server-side refusal for a mistyped domain, and the
    // blur check can lose the race with a click on the button (or not run,
    // on Enter). So the first submit of an address with a likely correction
    // stops and shows it; submitting the same address again sends it.
    if (warnedEmail.current !== payload.email) {
      const { suggestEmailAddress } = await import('@cavuno/board/email');
      const suggestion = suggestEmailAddress(payload.email);
      if (suggestion) {
        warnedEmail.current = payload.email;
        emailSuggestion.offer(suggestion);
        return;
      }
    }
    setPending(true);
    try {
      const refusal = await onSubmit(payload);
      if (refusal) {
        setErrors({
          [refusalField(refusal.code)]: productErrorMessage(refusal),
        });
      }
    } catch {
      setErrors({ form: productErrorMessage({}) });
    } finally {
      setPending(false);
    }
  }

  const ctaLabel = free
    ? m.product_sendFilesAction()
    : m.product_continueToPaymentAction();

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label={free ? m.product_freeStepTitle() : m.product_paidStepTitle()}
      className="flex flex-col gap-4"
      data-test="product-checkout-form"
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor={`${id}-email`}>
            {m.product_emailLabel()}
          </FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            aria-invalid={Boolean(errors.email) || undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              emailSuggestion.clear();
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            onBlur={(event) => emailSuggestion.check(event.target.value)}
          />
          {errors.email ? (
            <FieldError>{errors.email}</FieldError>
          ) : emailSuggestion.suggestion ? (
            <EmailSuggestionHint
              suggestion={emailSuggestion.suggestion}
              disabled={pending}
              onAccept={(suggested) => {
                setEmail(suggested);
                emailSuggestion.clear();
              }}
            />
          ) : (
            <FieldDescription>{m.product_emailHelpText()}</FieldDescription>
          )}
        </Field>

        {payWhatYouWant ? (
          <Field data-invalid={Boolean(errors.amount) || undefined}>
            <FieldLabel htmlFor={`${id}-amount`}>
              {m.product_amountLabel()}
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>{currency.toUpperCase()}</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id={`${id}-amount`}
                name="amount"
                inputMode="decimal"
                value={amount}
                aria-invalid={Boolean(errors.amount) || undefined}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (errors.amount)
                    setErrors({ ...errors, amount: undefined });
                }}
              />
            </InputGroup>
            {errors.amount ? (
              <FieldError>{errors.amount}</FieldError>
            ) : (
              <FieldDescription>
                {m.product_amountHelpText({
                  minimum: formatMoney(locale, minimumCents, currency),
                })}
              </FieldDescription>
            )}
          </Field>
        ) : null}

        {product.questions.map((question) => {
          const fieldId = `${id}-q-${question.id}`;
          const isMissing = missing.has(question.id);
          if (question.kind === 'checkbox') {
            return (
              <Field
                key={question.id}
                orientation="horizontal"
                data-invalid={isMissing || undefined}
              >
                <Checkbox
                  id={fieldId}
                  checked={ticks[question.id] === true}
                  aria-invalid={isMissing || undefined}
                  aria-required={question.required || undefined}
                  onCheckedChange={(checked) =>
                    setTick(question.id, checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor={fieldId} className="font-normal">
                    <span>
                      {question.label}
                      {question.required ? <RequiredMark /> : null}
                    </span>
                  </FieldLabel>
                  {isMissing ? (
                    <FieldError>{m.product_checkboxRequiredText()}</FieldError>
                  ) : null}
                </FieldContent>
              </Field>
            );
          }
          return (
            <Field key={question.id} data-invalid={isMissing || undefined}>
              <FieldLabel htmlFor={fieldId}>
                <span>
                  {question.label}
                  {question.required ? <RequiredMark /> : null}
                </span>
              </FieldLabel>
              {question.kind === 'dropdown' ? (
                <NativeSelect
                  id={fieldId}
                  value={texts[question.id] ?? ''}
                  aria-invalid={isMissing || undefined}
                  aria-required={question.required || undefined}
                  onChange={(event) => setText(question.id, event.target.value)}
                >
                  <NativeSelectOption value="">
                    {m.product_choosePlaceholder()}
                  </NativeSelectOption>
                  {(question.options ?? []).map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {option}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  id={fieldId}
                  value={texts[question.id] ?? ''}
                  maxLength={2000}
                  aria-invalid={isMissing || undefined}
                  aria-required={question.required || undefined}
                  onChange={(event) => setText(question.id, event.target.value)}
                />
              )}
              {isMissing ? (
                <FieldError>{m.product_answerRequiredText()}</FieldError>
              ) : null}
            </Field>
          );
        })}
        {errors.answers ? <FieldError>{errors.answers}</FieldError> : null}

        <Field orientation="horizontal">
          <Checkbox
            id={`${id}-marketing`}
            checked={marketingOptIn}
            onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
          />
          <FieldLabel htmlFor={`${id}-marketing`} className="font-normal">
            {marketingText}
          </FieldLabel>
        </Field>

        {/* Honeypot: hidden from people and assistive tech, left empty. */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor={`${id}-website`}>{m.contact_websiteLabel()}</label>
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

      <div className="flex flex-col gap-2">
        <Button type="submit" size="xl" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {ctaLabel}
        </Button>
        {errors.form ? (
          <FieldError data-test="product-checkout-error">
            {errors.form}
          </FieldError>
        ) : null}
      </div>
    </form>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-muted-foreground">
        {' *'}
      </span>
      <span className="sr-only">{m.product_requiredLabel()}</span>
    </>
  );
}
