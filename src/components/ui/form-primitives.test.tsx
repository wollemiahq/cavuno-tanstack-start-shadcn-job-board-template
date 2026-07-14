// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Field, FieldDescription, FieldError, FieldLabel } from './field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from './input-group';

afterEach(cleanup);

describe('Field', () => {
  it('composes an accessible label, description, and announced error', () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="company-name">Company name</FieldLabel>
        <input id="company-name" aria-describedby="company-name-help" />
        <FieldDescription id="company-name-help">
          Use the public company name.
        </FieldDescription>
        <FieldError errors={[{ message: 'Company name is required.' }]} />
      </Field>,
    );

    expect(screen.getByRole('group')).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByLabelText('Company name')).toHaveAccessibleDescription(
      'Use the public company name.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Company name is required.',
    );
  });
});

describe('InputGroup', () => {
  it('keeps a visible URL prefix while focusing the owned input from the addon', () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Company website" />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );

    fireEvent.click(screen.getByText('https://'));
    expect(screen.getByLabelText('Company website')).toHaveFocus();
  });
});
