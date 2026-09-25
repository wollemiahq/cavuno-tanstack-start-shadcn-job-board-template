// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { CustomFieldFilterFields } from './custom-field-filter-fields';

import type { CustomFilterField } from '@/lib/custom-field-filters';
import type { CustomFieldFilter } from '@cavuno/board';

afterEach(cleanup);

function Filters({ fields }: { fields: CustomFilterField[] }) {
  const [value, setValue] = useState<CustomFieldFilter[]>([]);
  return (
    <CustomFieldFilterFields
      fields={fields}
      value={value}
      onChange={setValue}
    />
  );
}

it('limits active fields to ten and lets users replace a selection', () => {
  render(
    <Filters
      fields={Array.from({ length: 11 }, (_, i) => ({
        kind: 'flag',
        key: `field_${i}`,
        label: `Field ${i}`,
      }))}
    />,
  );
  for (let i = 0; i < 10; i++)
    fireEvent.click(screen.getByRole('checkbox', { name: `Field ${i}` }));
  expect(screen.getByRole('checkbox', { name: 'Field 10' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Field 0' }));
  const replacement = screen.getByRole('checkbox', {
    name: 'Field 10',
  });
  expect(replacement).not.toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(replacement);
  expect(replacement).toBeChecked();
});

it('limits selected options to ten and lets users replace a selection', () => {
  render(
    <Filters
      fields={[
        {
          kind: 'choice',
          key: 'choices',
          label: 'Choices',
          options: Array.from({ length: 11 }, (_, i) => ({
            value: `option_${i}`,
            label: `Option ${i}`,
          })),
        },
      ]}
    />,
  );
  for (let i = 0; i < 10; i++)
    fireEvent.click(screen.getByRole('checkbox', { name: `Option ${i}` }));
  expect(screen.getByRole('checkbox', { name: 'Option 10' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Option 0' }));
  const replacement = screen.getByRole('checkbox', {
    name: 'Option 10',
  });
  expect(replacement).not.toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(replacement);
  expect(replacement).toBeChecked();
});
