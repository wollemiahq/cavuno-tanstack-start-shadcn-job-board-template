// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CustomFieldsGroup } from './custom-fields-group';

import type { PublicBoard } from '@cavuno/board';

type Definition = PublicBoard['customFields'][number];

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
] as Definition[];

afterEach(cleanup);

describe('CustomFieldsGroup', () => {
  it('renders each definition type as an owned control and stores option keys', () => {
    const onChange = vi.fn();
    render(
      <CustomFieldsGroup
        definitions={definitions}
        values={{}}
        onChange={onChange}
      />,
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

  it('renders nothing when the board defines no custom fields', () => {
    const { container } = render(
      <CustomFieldsGroup definitions={[]} values={{}} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
