// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Prose } from './prose';

describe('Prose content', () => {
  it('renders trusted rich HTML', () => {
    render(
      <Prose
        aria-label="Job description"
        html="<h2>About the role</h2><p>Build useful software.</p>"
      />,
    );

    const prose = screen.getByLabelText('Job description');
    expect(prose.querySelector('h2')).toHaveTextContent('About the role');
  });

  it('renders composed article content', () => {
    render(
      <Prose as="article" aria-label="Article">
        <p>Readable content</p>
      </Prose>,
    );

    expect(screen.getByRole('article', { name: 'Article' })).toHaveTextContent(
      'Readable content',
    );
  });
});
