/**
 * Alert-signup VIEW-MODEL — the Layer-1b seam for the job-alert subscribe
 * block. `toAlertSignupVM` is the only place the i18n
 * alert copy (`boardCopy`) touches the form: it resolves every label the
 * markup renders plus the per-status result messages.
 *
 * The `AlertSignupForm` presentation renders its copy from `AlertSignupVM`,
 * so it makes no runtime SDK/copy call — a redesign is pure markup and
 * can't drift the copy resolution. (The form's props still reference the
 * subscribe wire types `JobAlertSubscribeInput`/`BoardLabelOverrides`
 * type-only — they are its API contract with the route, erased at runtime,
 * and kept precise so the generated DESIGN.md records what to pass.)
 *
 * NOTE: unlike `apply-view-model`, this VM deliberately does NOT re-export
 * those wire types for the component to import — routing these indexed/mapped
 * types (`JobAlertSubscribeInput['filters'|'context']`, the `Partial<Record>`
 * of `BoardLabelOverrides`) through a barrel makes the `gen:design` extractor
 * resolve them as `any`, degrading the builder's API spec. The form imports
 * them directly from `@cavuno/board*` instead. Don't "fix" that to a
 * re-export — it's intentional.
 */
import { boardCopy } from '@/copy';
import type { BoardLabelOverrides } from '@cavuno/board/format';

export interface AlertSignupVM {
  sectionAriaLabel: string;
  /** Default heading; a placement can override it via the `title` prop. */
  defaultTitle: string;
  emailAriaLabel: string;
  emailPlaceholder: string;
  submitAriaLabel: string;
  subscribingLabel: string;
  buttonText: string;
  /** The privacy-preserving subscribe result and failure messages. */
  messages: { submitted: string; error: string };
}

export function toAlertSignupVM(
  language: string,
  labels?: BoardLabelOverrides,
): AlertSignupVM {
  const copy = boardCopy(language, labels).alerts;
  return {
    sectionAriaLabel: copy.sectionAriaLabel,
    defaultTitle: copy.jobAlertTitle,
    emailAriaLabel: copy.emailAriaLabel,
    emailPlaceholder: copy.jobAlertEmailPlaceholder,
    submitAriaLabel: copy.submitAriaLabel,
    subscribingLabel: copy.subscribingLabel,
    buttonText: copy.jobAlertButtonText,
    messages: {
      submitted: copy.jobAlertSuccessToast,
      error: copy.jobAlertErrorToast,
    },
  };
}
