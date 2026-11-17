/**
 * A refused company or talent profile write, placed on the form: each
 * refused field's message by its key (a custom field, a collection field,
 * or a detail of a collection entry), plus every message for the summary
 * beside Save. Copy comes from the code like every Board API error. A
 * refusal without per-field details shows the API's sentence, which names
 * the field, on an English board, and the error's own copy otherwise.
 */
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { customFieldLabel } from '@/board/custom-field-labels';
import type {
  ProfileCollectionDefinition,
  ProfileCustomDefinition,
} from '@/board/form-layout';
import type { ProfileFieldViolation } from '@/board/profile-field-violations';
import { boardErrorMessage } from '@/lib/board-error-message';

export type ProfileFieldRefusal = {
  byKey: Record<string, { code: string; message: string }>;
  messages: { message: string }[];
};

/** A refused write, as the profile server functions return it. */
export type RefusedWrite = {
  code: string;
  message: string;
  fieldViolations?: ProfileFieldViolation[];
};

export function profileFieldRefusal(
  failure: RefusedWrite,
  definitions: {
    customFields?: readonly ProfileCustomDefinition[];
    collectionFields?: readonly ProfileCollectionDefinition[];
  },
): ProfileFieldRefusal {
  const labelled = [
    ...(definitions.customFields ?? []),
    ...(definitions.collectionFields ?? []).flatMap((field) => [
      field,
      ...(field.valueDefinitions ?? []),
      ...(field.entryDefinitions ?? []),
    ]),
  ];
  const byKey: ProfileFieldRefusal['byKey'] = {};
  for (const violation of failure.fieldViolations ?? []) {
    const field = labelled.find(({ key }) => key === violation.fieldKey);
    byKey[violation.fieldKey] = {
      code: violation.code,
      message:
        field && violation.code === 'custom_field_required'
          ? m.profileForm_fieldRequiredError({ field: customFieldLabel(field) })
          : boardErrorMessage(violation),
    };
  }
  const messages = Object.values(byKey).map(({ message }) => ({ message }));
  if (messages.length === 0) {
    const wire = failure.message.trim();
    messages.push({
      message:
        failure.code === 'validation_bad_request' &&
        wire &&
        getLocale().startsWith('en')
          ? wire
          : boardErrorMessage(failure),
    });
  }
  return { byKey, messages };
}
