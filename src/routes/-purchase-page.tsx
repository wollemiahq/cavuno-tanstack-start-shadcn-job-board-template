/**
 * `/purchases/$purchaseToken` — the download page the purchase email links
 * to. Files and links with their state (ready, preparing a stamped copy, no
 * downloads left), "Download all", the order with its receipt, "Email me
 * this link again", the buyer's own review when ratings are on, and the
 * email-confirmation step a shared link asks for.
 */
import { useId, useState, type FormEvent } from 'react';

import { formatDate } from '@cavuno/board/format';
import { Link } from '@tanstack/react-router';
import {
  CircleCheck,
  Download,
  ExternalLink,
  Lock,
  MailCheck,
  Star,
} from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import {
  fileBadge,
  formatFileSize,
  formatMoneyExact,
} from '@/board/product-view-model';
import { EmptyState } from '@/components/empty-state';
import { Container } from '@/components/layout/container';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PageLayout } from '@/components/layout/page-layout';
import { useRootSession } from '@/components/root-session';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { boardErrorMessage } from '@/lib/board-error-message';
import { candidateAuthSearch } from '@/lib/candidate-return-to';
import { cn } from '@/lib/utils';
import type {
  Purchase,
  PurchaseDownload,
  PurchaseDownloadAll,
  PurchaseReviewResult,
} from '@cavuno/board';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

export type PurchasePageDependencies = {
  confirmEmail: (input: {
    data: { purchaseToken: string; email: string };
  }) => Promise<ActionResult<{ confirmed: true }>>;
  download: (input: {
    data: { purchaseToken: string; fileId: string };
  }) => Promise<ActionResult<PurchaseDownload>>;
  downloadAll: (input: {
    data: { purchaseToken: string };
  }) => Promise<ActionResult<PurchaseDownloadAll>>;
  review: (input: {
    data: {
      purchaseToken: string;
      stars: number;
      comment?: string;
      displayName?: string;
    };
  }) => Promise<ActionResult<PurchaseReviewResult>>;
  resend: (input: {
    data: { email: string; productSlug?: string };
  }) => Promise<ActionResult<unknown>>;
  /** Hand the browser a signed file URL (an attachment download). */
  openUrl: (url: string) => void;
  /** Re-read the page (counts, states, the confirmation step). */
  invalidate: () => Promise<void>;
};

type PurchaseFile = Purchase['files'][number];

/** Re-read the page when the API says the link needs confirming again. */
const RECHECK_CODES = new Set(['purchase_email_confirmation_required']);

export function PurchaseReadyView({
  purchase,
  purchaseToken,
  dependencies,
}: {
  purchase: Purchase;
  purchaseToken: string;
  dependencies: PurchasePageDependencies;
}) {
  const locale = getLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [allError, setAllError] = useState<string | null>(null);
  const files = purchase.files;
  const downloadable = files.filter(
    (file) => file.kind === 'file' && file.state === 'ready',
  );
  const preparing = files.some(
    (file) => file.kind === 'file' && file.state === 'preparing',
  );
  const paid = purchase.status === 'paid';

  async function download(file: PurchaseFile) {
    setBusy(file.fileId);
    setRowErrors(({ [file.fileId]: _cleared, ...rest }) => rest);
    try {
      const result = await dependencies.download({
        data: { purchaseToken, fileId: file.fileId },
      });
      if (result.ok) {
        dependencies.openUrl(result.data.url);
        await dependencies.invalidate();
      } else if (result.code && RECHECK_CODES.has(result.code)) {
        await dependencies.invalidate();
      } else {
        setRowErrors((previous) => ({
          ...previous,
          [file.fileId]: boardErrorMessage(result),
        }));
        if (
          result.code === 'purchase_download_limit_reached' ||
          result.code === 'purchase_file_preparing'
        ) {
          await dependencies.invalidate();
        }
      }
    } catch {
      setRowErrors((previous) => ({
        ...previous,
        [file.fileId]: boardErrorMessage({}),
      }));
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    setBusy('all');
    setAllError(null);
    try {
      const result = await dependencies.downloadAll({
        data: { purchaseToken },
      });
      if (result.ok) {
        dependencies.openUrl(result.data.url);
        await dependencies.invalidate();
      } else if (result.code && RECHECK_CODES.has(result.code)) {
        await dependencies.invalidate();
      } else {
        setAllError(boardErrorMessage(result));
      }
    } catch {
      setAllError(boardErrorMessage({}));
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageLayout
      band={
        <div className="border-border bg-muted/50 border-b">
          <Container width="wide">
            <header className="flex flex-col gap-2 pt-(--header-space) pb-(--header-space)">
              <p className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
                <CircleCheck aria-hidden="true" className="size-4" />
                {paid ? m.purchase_completeLabel() : m.purchase_claimedLabel()}
              </p>
              <Text
                as="h1"
                variant="heading2"
                className="md:text-3xl"
                dir="auto"
              >
                {purchase.product.name}
              </Text>
              <p className="text-muted-foreground text-sm">
                {m.purchase_emailedText({ email: purchase.email })}
              </p>
            </header>
          </Container>
        </div>
      }
      rail={
        <>
          {purchase.ratingsEnabled ? (
            <PurchaseReviewCard
              purchase={purchase}
              purchaseToken={purchaseToken}
              dependencies={dependencies}
            />
          ) : null}
          <OrderCard purchase={purchase} dependencies={dependencies} />
          <AccountCard />
        </>
      }
      railLabel={m.purchase_orderRegionLabel()}
      railSticky={false}
    >
      <section
        aria-labelledby="purchase-files-heading"
        className="flex flex-col gap-4 pb-8"
      >
        <div className="flex items-center gap-3">
          <h2
            id="purchase-files-heading"
            className="text-foreground flex-1 text-xl font-semibold"
          >
            {m.purchase_filesHeading()}
          </h2>
          {downloadable.length > 1 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void downloadAll()}
            >
              {busy === 'all' ? <Spinner data-icon="inline-start" /> : null}
              {m.purchase_downloadAllAction()}
            </Button>
          ) : null}
        </div>
        {allError ? <FieldError>{allError}</FieldError> : null}
        {purchase.product.thankYouMessage ? (
          <p className="text-muted-foreground whitespace-pre-line" dir="auto">
            {purchase.product.thankYouMessage}
          </p>
        ) : null}
        <ul className="flex flex-col gap-3" data-test="purchase-files">
          {files.map((file) => (
            <li key={file.fileId}>
              <FileRow
                file={file}
                locale={locale}
                downloadCap={purchase.downloadCap}
                busy={busy === file.fileId}
                disabled={busy !== null}
                error={rowErrors[file.fileId] ?? null}
                onDownload={() => void download(file)}
              />
            </li>
          ))}
        </ul>
        {preparing ? (
          <p className="text-muted-foreground text-sm" role="status">
            {m.purchase_preparingNote()}
          </p>
        ) : null}
        {purchase.refundPolicy ? (
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            <span className="text-foreground font-medium">
              {m.product_refundPolicyLabel()}
            </span>{' '}
            {purchase.refundPolicy}
          </p>
        ) : null}
      </section>
    </PageLayout>
  );
}

function FileRow({
  file,
  locale,
  downloadCap,
  busy,
  disabled,
  error,
  onDownload,
}: {
  file: PurchaseFile;
  locale: string;
  downloadCap: number;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onDownload: () => void;
}) {
  if (file.kind === 'link') {
    const host = safeHost(file.url);
    return (
      <Card size="sm" className="gap-0 py-0">
        <CardContent className="flex items-center gap-3 p-4">
          <span
            aria-hidden="true"
            className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg"
          >
            <ExternalLink className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-foreground truncate font-medium" dir="auto">
              {file.displayName}
            </span>
            <span className="text-muted-foreground truncate text-sm">
              {file.description ??
                (host ? m.purchase_opensInText({ host }) : null)}
            </span>
          </div>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ExternalLink data-icon="inline-start" aria-hidden="true" />
            <span className="max-sm:sr-only">{m.purchase_openAction()}</span>
            <span className="sr-only"> {file.displayName}</span>
          </a>
        </CardContent>
      </Card>
    );
  }
  const size = formatFileSize(locale, file.sizeBytes);
  const meta = [
    size,
    file.stamped ? m.purchase_stampedLabel() : null,
    file.state === 'preparing'
      ? m.purchase_preparingLabel()
      : m.purchase_downloadsLeft({
          left: file.downloadsLeft,
          cap: downloadCap,
        }),
  ].filter((part): part is string => Boolean(part));
  return (
    <Card size="sm" className="gap-0 py-0">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
          >
            {fileBadge(file.displayName, file.contentType)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-foreground truncate font-medium" dir="auto">
              {file.displayName}
            </span>
            <span className="text-muted-foreground text-sm">
              {meta.join(' · ')}
            </span>
          </div>
          {file.state === 'ready' ? (
            <Button disabled={disabled} onClick={onDownload}>
              {busy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" aria-hidden="true" />
              )}
              <span className="max-sm:sr-only">
                {m.purchase_downloadAction()}
              </span>
              <span className="sr-only"> {file.displayName}</span>
            </Button>
          ) : file.state === 'preparing' ? (
            <Badge variant="secondary" className="max-sm:hidden">
              {m.purchase_preparingLabel()}
            </Badge>
          ) : (
            <Badge variant="outline">{m.purchase_limitReachedLabel()}</Badge>
          )}
        </div>
        {file.description ? (
          <p className="text-muted-foreground text-sm" dir="auto">
            {file.description}
          </p>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </CardContent>
    </Card>
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function OrderCard({
  purchase,
  dependencies,
}: {
  purchase: Purchase;
  dependencies: PurchasePageDependencies;
}) {
  const locale = getLocale();
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>(
    'idle',
  );
  const date =
    formatDate(locale, purchase.purchasedAt) ??
    purchase.purchasedAt.slice(0, 10);
  const paid = purchase.status === 'paid';

  async function resend() {
    setStatus('pending');
    try {
      const result = await dependencies.resend({
        data: { email: purchase.email, productSlug: purchase.product.slug },
      });
      setStatus(result.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card size="sm" className="gap-0 py-0" data-slot="purchase-order">
      <CardContent className="flex flex-col gap-2 p-4 text-sm">
        <h2 className="text-foreground text-base font-semibold">
          {m.purchase_orderHeading()}
        </h2>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            {paid
              ? m.purchase_paidOnLabel({ date })
              : m.purchase_claimedOnLabel({ date })}
          </span>
          <span className="text-foreground">
            {paid
              ? formatMoneyExact(
                  locale,
                  purchase.amountCents,
                  purchase.currency,
                )
              : m.product_priceFree()}
          </span>
        </div>
        {purchase.receiptUrl ? (
          <a
            href={purchase.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="text-foreground w-fit underline underline-offset-4"
          >
            {m.purchase_viewReceiptAction()}
          </a>
        ) : null}
        <Button
          variant="link"
          size="inline"
          className="text-foreground w-fit px-0 text-sm"
          disabled={status === 'pending'}
          onClick={() => void resend()}
        >
          {m.purchase_resendAction()}
        </Button>
        {status === 'sent' ? (
          <FieldDescription role="status">
            {m.purchase_resentText({ email: purchase.email })}
          </FieldDescription>
        ) : status === 'error' ? (
          <FieldError>{boardErrorMessage({})}</FieldError>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AccountCard() {
  const { user, ready } = useRootSession();
  if (!ready) return null;
  return (
    <Card size="sm" className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4 text-sm">
        {user ? (
          <Link
            to="/me/purchases"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-fit')}
          >
            {m.purchase_libraryAction()}
          </Link>
        ) : (
          <>
            <p className="text-muted-foreground">
              {m.purchase_createAccountText()}
            </p>
            <Link
              to="/auth/sign-up"
              search={candidateAuthSearch('/me/purchases')}
              className={cn(buttonVariants(), 'w-fit')}
            >
              {m.purchase_createAccountAction()}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PurchaseReviewCard({
  purchase,
  purchaseToken,
  dependencies,
}: {
  purchase: Purchase;
  purchaseToken: string;
  dependencies: PurchasePageDependencies;
}) {
  const id = useId();
  const existing = purchase.review;
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stars < 1) {
      setStatus('error');
      setError(m.purchase_reviewStarsRequiredText());
      return;
    }
    setStatus('pending');
    setError(null);
    try {
      const result = await dependencies.review({
        data: {
          purchaseToken,
          stars,
          comment: comment.trim() || undefined,
          displayName: displayName.trim() || undefined,
        },
      });
      if (result.ok) {
        setStatus('saved');
        await dependencies.invalidate();
      } else {
        setStatus('error');
        setError(boardErrorMessage(result));
      }
    } catch {
      setStatus('error');
      setError(boardErrorMessage({}));
    }
  }

  return (
    <Card size="sm" className="gap-0 py-0" data-slot="purchase-review">
      <CardContent className="p-4">
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-3"
          aria-labelledby={`${id}-title`}
        >
          <h2
            id={`${id}-title`}
            className="text-foreground text-base font-semibold"
          >
            {existing
              ? m.purchase_yourReviewHeading()
              : m.purchase_rateHeading()}
          </h2>
          <div
            role="radiogroup"
            aria-label={m.purchase_ratingLabel()}
            className="flex gap-1"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={stars === value}
                aria-label={m.product_starsAriaLabel({ stars: value })}
                onClick={() => {
                  setStars(value);
                  if (status === 'error') setStatus('idle');
                }}
                className="focus-visible:ring-ring/50 rounded-md p-0.5 outline-none focus-visible:ring-2"
              >
                <Star
                  aria-hidden="true"
                  className={cn(
                    'size-6',
                    value <= stars
                      ? 'text-foreground fill-current'
                      : 'text-muted-foreground/40',
                  )}
                />
              </button>
            ))}
          </div>
          <Field>
            <FieldLabel htmlFor={`${id}-comment`} className="sr-only">
              {m.purchase_reviewCommentLabel()}
            </FieldLabel>
            <Textarea
              id={`${id}-comment`}
              rows={3}
              maxLength={2000}
              placeholder={m.purchase_reviewCommentPlaceholder()}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>
              {m.purchase_reviewNameLabel()}
            </FieldLabel>
            <Input
              id={`${id}-name`}
              maxLength={80}
              autoComplete="given-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <FieldDescription>{m.purchase_reviewNameHelp()}</FieldDescription>
          </Field>
          <Button
            type="submit"
            variant="outline"
            className="w-fit max-sm:w-full"
            disabled={status === 'pending'}
          >
            {status === 'pending' ? <Spinner data-icon="inline-start" /> : null}
            {existing
              ? m.purchase_updateReviewAction()
              : m.purchase_postReviewAction()}
          </Button>
          {status === 'error' && error ? (
            <FieldError>{error}</FieldError>
          ) : status === 'saved' ? (
            <FieldDescription role="status">
              {m.purchase_reviewSavedText()}
            </FieldDescription>
          ) : existing?.hidden ? (
            <FieldDescription>{m.purchase_reviewHiddenText()}</FieldDescription>
          ) : null}
          {existing?.reply ? (
            <p className="border-border text-muted-foreground border-s-2 ps-3 text-sm">
              <span className="text-foreground font-medium">
                {m.product_operatorReplyLabel()}
              </span>{' '}
              {existing.reply}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

/** A shared link: the buyer types the purchase email to continue. */
export function PurchaseConfirmView({
  purchaseToken,
  dependencies,
}: {
  purchaseToken: string;
  dependencies: PurchasePageDependencies;
}) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await dependencies.confirmEmail({
        data: { purchaseToken, email: email.trim() },
      });
      if (result.ok) {
        await dependencies.invalidate();
      } else {
        setError(boardErrorMessage(result));
      }
    } catch {
      setError(boardErrorMessage({}));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page width="narrow">
      <PageContent
        header={
          <PageHeader
            title={m.purchaseConfirm_title()}
            description={m.purchaseConfirm_description()}
          />
        }
      >
        <Card size="sm" className="gap-0 py-0">
          <CardContent className="p-4">
            <form
              noValidate
              onSubmit={submit}
              className="flex flex-col gap-4"
              data-test="purchase-confirm-form"
            >
              <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel htmlFor={`${id}-email`}>
                  {m.product_emailLabel()}
                </FieldLabel>
                <Input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  aria-invalid={Boolean(error) || undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <MailCheck data-icon="inline-start" aria-hidden="true" />
                )}
                {m.purchaseConfirm_submitAction()}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageContent>
    </Page>
  );
}

function unavailableText(code: string): string {
  switch (code) {
    case 'purchase_refunded':
      return m.purchaseUnavailable_refundedText();
    case 'purchase_access_removed':
      return m.purchaseUnavailable_accessRemovedText();
    case 'purchase_awaiting_payment':
      return m.purchaseUnavailable_awaitingPaymentText();
    default:
      return m.purchaseUnavailable_unavailableText();
  }
}

export function PurchaseUnavailableView({ code }: { code: string }) {
  return (
    <Page width="content">
      <PageContent>
        <EmptyState
          icon={<Lock aria-hidden="true" />}
          title={m.purchaseUnavailable_title()}
          description={unavailableText(code)}
          action={
            <Link
              to="/products"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.purchaseUnavailable_browseAction()}
            </Link>
          }
        />
      </PageContent>
    </Page>
  );
}
