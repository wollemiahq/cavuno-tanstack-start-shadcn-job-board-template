// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Bleed } from './bleed';
import { Box } from './box';
import { Container } from './container';
import { Grid } from './grid';

afterEach(cleanup);

describe('layout primitives', () => {
  it('Box chooses semantic HTML and forwards non-visual native attributes', () => {
    render(
      <Box
        as="section"
        id="candidate-summary"
        aria-label="Candidate summary"
        data-test="candidate-summary"
        padding={{ base: '4', md: '8' }}
        background="card"
        border="all"
        radius="xl"
      >
        Summary
      </Box>,
    );

    const section = screen.getByRole('region', { name: 'Candidate summary' });
    expect(section).toHaveAttribute('id', 'candidate-summary');
    expect(section).toHaveAttribute('data-test', 'candidate-summary');
    expect(section).toHaveTextContent('Summary');
  });

  it('Grid preserves list semantics for responsive result matrices', () => {
    render(
      <Grid
        as="ol"
        aria-label="Companies"
        columns={{ base: 1, sm: 2, lg: 3 }}
        gap="5"
      >
        <li>Acme</li>
        <li>Globex</li>
      </Grid>,
    );

    expect(screen.getByRole('list', { name: 'Companies' }).tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('Container and Bleed retain the caller-selected landmarks', () => {
    render(
      <Container
        as="nav"
        width="content"
        gutter={{ base: '4', md: '8' }}
        aria-label="Company navigation"
      >
        <Bleed as="section" aria-label="Sponsored jobs">
          Sponsored content
        </Bleed>
      </Container>,
    );

    expect(
      screen.getByRole('navigation', { name: 'Company navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Sponsored jobs' }),
    ).toHaveTextContent('Sponsored content');
  });
});
