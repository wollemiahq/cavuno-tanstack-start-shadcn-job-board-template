'use client';

/**
 * The short step before payment (or before a free download): the email the
 * link goes to, the amount for pay what you want, the product's buyer
 * questions (a required checkbox covers the EU right-to-cancel waiver), the
 * job-alert opt-in on free products, and a hidden honeypot field. Refusals
 * from the Board API are worded under the field they concern.
 */
import { useId, useState, type FormEvent } from 'react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  formatMoney,
  minimumAmountCents,
  parseAmountCents,
} from '@/board/product-view-model';
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
import { suggestEmailFix } from '@/lib/email-typo';
import { productErrorMessage } from '@/lib/product-error-message';
import type { Product, ProductCheckoutBody } from '@cavuno/board';

export type ProductCheckoutValues = {
  email: string;
  answers: NonNullable<ProductCheckoutBody['answers']>;
  amountCents?: number;
  jobAlertOptIn?: boolean;
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
  onSubmit,
  onCancel,
}: {
  product: Product;
  defaultEmail?: string | null;
  /** Resolves with a refusal to show, or nothing once the step moved on. */
  onSubmit: (
    values: ProductCheckoutValues,
  ) => Promise<ProductCheckoutRefusal | void>;
  onCancel: () => void;
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
  const [jobAlertOptIn, setJobAlertOptIn] = useState(false);
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const suggestion = suggestEmailFix(email);

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
      // The job-alert opt-in is offered on free products only.
      jobAlertOptIn: free ? jobAlertOptIn : undefined,
      website: website || undefined,
    };
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
      <h2 className="text-foreground text-base font-semibold">
        {free ? m.product_freeStepTitle() : m.product_paidStepTitle()}
      </h2>
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
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
          />
          {errors.email ? (
            <FieldError>{errors.email}</FieldError>
          ) : suggestion ? (
            <FieldDescription role="status">
              {m.product_emailSuggestionText({ email: suggestion })}{' '}
              <Button
                type="button"
                variant="link"
                size="inline"
                onClick={() => setEmail(suggestion)}
              >
                {m.product_emailSuggestionAction()}
              </Button>
            </FieldDescription>
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

        {free ? (
          <Field orientation="horizontal">
            <Checkbox
              id={`${id}-alerts`}
              checked={jobAlertOptIn}
              onCheckedChange={(checked) => setJobAlertOptIn(checked === true)}
            />
            <FieldLabel htmlFor={`${id}-alerts`} className="font-normal">
              {m.product_jobAlertOptInLabel()}
            </FieldLabel>
          </Field>
        ) : null}

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
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {ctaLabel}
        </Button>
        {errors.form ? (
          <FieldError data-test="product-checkout-error">
            {errors.form}
          </FieldError>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          {m.product_cancelStepAction()}
        </Button>
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
