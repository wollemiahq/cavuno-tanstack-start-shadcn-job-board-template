// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('exposes native button behavior through the owned Rhea component', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Create account</Button>);
    const button = screen.getByRole('button', { name: 'Create account' });
    button.click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(button.getAttribute('data-slot')).toBe('button');
  });
});
