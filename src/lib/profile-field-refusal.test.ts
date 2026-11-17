import { describe, expect, it } from 'vitest';

import { boardErrorMessage } from './board-error-message';
import { profileFieldRefusal } from './profile-field-refusal';

import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

const definitions = {
  collectionFields: [
    {
      key: 'cards',
      label: 'Site cards',
      typeId: 'card',
      multiple: true,
      visibility: 'public' as const,
      editableByOwner: true,
      allowOverrides: false,
      entryDefinitions: [
        {
          key: 'number',
          label: 'Card number',
          type: 'short_text' as const,
          required: true,
          visibility: 'private' as const,
          editableByOwner: true,
        },
      ],
    },
  ],
};

describe('profileFieldRefusal', () => {
  it('names each refused field, a collection entry’s detail too', () => {
    const refusal = profileFieldRefusal(
      {
        code: 'validation_bad_request',
        message: 'Refused',
        fieldViolations: [
          { fieldKey: 'number', code: 'custom_field_required', message: '' },
        ],
      },
      definitions,
    );
    const message = m.profileForm_fieldRequiredError({ field: 'Card number' });
    expect(refusal.byKey.number).toEqual({
      code: 'custom_field_required',
      message,
    });
    expect(refusal.messages).toEqual([{ message }]);
  });

  it('falls back to the API sentence on an English board, else the code’s copy', () => {
    const failure = {
      code: 'validation_bad_request',
      message: '"Site cards" is required on this board',
    };
    expect(profileFieldRefusal(failure, definitions).messages).toEqual([
      {
        message: getLocale().startsWith('en')
          ? failure.message
          : boardErrorMessage(failure),
      },
    ]);
  });
});
