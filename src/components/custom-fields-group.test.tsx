// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomFieldInput, hasCustomFieldInput } from './custom-fields-group';

import type { RichTextEditorProps } from './rich-text-editor';

// Tiptap needs a real layout engine; the field only has to route to it.
vi.mock('@/components/rich-text-editor', () => ({
  RichTextEditor: ({ value, onChange, ariaLabel }: RichTextEditorProps) => (
    <textarea
      aria-label={ariaLabel}
      defaultValue={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

import type { PublicBoard } from '@cavuno/board';

type Definition = PublicBoard['customFields']['job'][number];

const definitions: Definition[] = [
  { key: 'team', label: 'Team', type: 'short_text', required: true },
  {
    key: 'stack',
    label: 'Stack',
    type: 'multi_select',
    required: false,
    options: [
      { key: 'react', label: 'React' },
      { key: 'ros', label: 'ROS' },
    ],
  },
  {
    key: 'visa_support',
    label: 'Visa support',
    type: 'boolean',
    required: false,
  },
];

afterEach(cleanup);

describe('CustomFieldInput', () => {
  it('renders each definition type as an owned control and stores option keys', () => {
    const onChange = vi.fn();
    render(
      <>
        {definitions.map((definition) => (
          <CustomFieldInput
            key={definition.key}
            definition={definition}
            value={undefined}
            onChange={(value) => onChange({ [definition.key]: value })}
          />
        ))}
      </>,
    );

    expect(screen.getByLabelText('Team')).toBeRequired();
    expect(screen.getByRole('group', { name: 'Stack' })).toHaveAttribute(
      'data-slot',
      'field-set',
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'ROS' }));
    expect(onChange).toHaveBeenCalledWith({ stack: ['ros'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Visa support' }));
    expect(onChange).toHaveBeenCalledWith({ visa_support: true });
  });

  it('renders a rich text field as the editor, labelled by the field', async () => {
    const onChange = vi.fn();
    render(
      <CustomFieldInput
        definition={{
          key: 'benefits',
          label: 'Benefits',
          type: 'rich_text',
          required: false,
        }}
        value="<p>Gym</p>"
        onChange={onChange}
      />,
    );

    const editor = await screen.findByRole('textbox', { name: 'Benefits' });
    expect(editor).toHaveValue('<p>Gym</p>');
    fireEvent.change(editor, { target: { value: '<p>Pool</p>' } });
    expect(onChange).toHaveBeenLastCalledWith('<p>Pool</p>');
    // An emptied editor clears the answer, so a required check sees it.
    fireEvent.change(editor, { target: { value: '<p></p>' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('hasCustomFieldInput', () => {
  it('draws gallery and file fields only for a form with uploads', () => {
    expect(hasCustomFieldInput({ type: 'rich_text' })).toBe(true);
    expect(hasCustomFieldInput({ type: 'image_gallery' })).toBe(false);
    expect(hasCustomFieldInput({ type: 'file' })).toBe(false);
    expect(
      hasCustomFieldInput({ type: 'image_gallery' }, { uploads: true }),
    ).toBe(true);
    expect(hasCustomFieldInput({ type: 'file' }, { uploads: true })).toBe(true);
  });
});
