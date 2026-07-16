// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Bleed } from './bleed';
import { Box } from './box';
import { Container } from './container';
import { Page, PageContent, PageHeader, PageSection } from './page';

afterEach(cleanup);

describe('Page composition', () => {
  it('renders one main and one h1 while keeping the page header inside main', () => {
    const { container } = render(
      <Page id="jobs-page" width="wide" data-test="jobs-page">
        <PageContent
          header={
            <PageHeader
              eyebrow={<p>1,204 open roles</p>}
              title="Jobs"
              description="Find your next role"
              actions={<button type="button">Save search</button>}
            >
              <form aria-label="Job search">Search controls</form>
            </PageHeader>
          }
        >
          <PageSection title="Search results">
            <p>Result list</p>
          </PageSection>
        </PageContent>
      </Page>,
    );

    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);

    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Jobs' }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole('form', { name: 'Job search' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save search' }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-test="jobs-page"]')).toHaveAttribute(
      'id',
      'jobs-page',
    );
  });

  it('can propagate a bounded viewport height without changing normal page flow', () => {
    const { container } = render(
      <Page fill>
        <PageContent>
          <p>Viewport workspace</p>
        </PageContent>
      </Page>,
    );

    expect(container.querySelector('[data-layout="page"]')).toHaveClass(
      'md:h-full',
      'md:min-h-0',
    );
  });

  it('renders the optional aside as a named complementary landmark', () => {
    render(
      <Page>
        <PageContent aside={<p>Apply and save</p>} asideLabel="Job actions">
          <p>Job description</p>
        </PageContent>
      </Page>,
    );

    expect(screen.getByRole('main')).toHaveTextContent('Job description');
    expect(
      screen.getByRole('complementary', { name: 'Job actions' }),
    ).toHaveTextContent('Apply and save');
  });

  it('makes mobile aside priority explicit in DOM reading order', () => {
    const { rerender } = render(
      <Page>
        <PageContent
          aside={<p data-testid="aside-content">Apply</p>}
          asideLabel="Job actions"
          asideOrder="before"
        >
          <p data-testid="primary-content">Description</p>
        </PageContent>
      </Page>,
    );

    const beforeAside = screen.getByRole('complementary', {
      name: 'Job actions',
    });
    const beforePrimary = screen.getByTestId('primary-content').parentElement!;
    expect(
      beforeAside.compareDocumentPosition(beforePrimary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    rerender(
      <Page>
        <PageContent
          aside={<p>Related searches</p>}
          asideLabel="Related searches"
          asideOrder="after"
        >
          <p data-testid="primary-content">Results</p>
        </PageContent>
      </Page>,
    );

    const afterAside = screen.getByRole('complementary', {
      name: 'Related searches',
    });
    const afterPrimary = screen.getByTestId('primary-content').parentElement!;
    expect(
      afterPrimary.compareDocumentPosition(afterAside) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('labels sections through either a visible h2 or an explicit aria label', () => {
    render(
      <Page>
        <PageContent>
          <PageSection
            id="requirements"
            title="Requirements"
            description="What the candidate needs"
            actions={<a href="#all">View all</a>}
          >
            <p>TypeScript</p>
          </PageSection>
          <PageSection ariaLabel="Company facts">
            <p>Founded in 2020</p>
          </PageSection>
        </PageContent>
      </Page>,
    );

    const requirements = screen.getByRole('region', { name: 'Requirements' });
    expect(requirements).toHaveAttribute('id', 'requirements');
    expect(
      within(requirements).getByRole('heading', {
        level: 2,
        name: 'Requirements',
      }),
    ).toBeInTheDocument();
    expect(requirements).toHaveTextContent('What the candidate needs');
    expect(
      screen.getByRole('region', { name: 'Company facts' }),
    ).toHaveTextContent('Founded in 2020');
  });

  it('supports a full-width header through Bleed without changing header semantics', () => {
    render(
      <Page>
        <PageContent
          header={
            <Bleed>
              <Box background="muted" border="bottom">
                <Container>
                  <PageHeader align="center" title="Companies" />
                </Container>
              </Box>
            </Bleed>
          }
        >
          <p>Company results</p>
        </PageContent>
      </Page>,
    );

    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Companies' }),
    ).toBeInTheDocument();
    expect(within(main).getByText('Company results')).toBeInTheDocument();
  });
});

/** Type-only checks for structural invariants that runtime markup cannot prove. */
function _typeContract() {
  return (
    <>
      {/* @ts-expect-error — Page owns its geometry and has no className escape hatch. */}
      <Page className="max-w-none">Invalid</Page>
      {/* @ts-expect-error — inline style cannot bypass the Page contract. */}
      <PageContent style={{ padding: 7 }}>Invalid</PageContent>
      {/* @ts-expect-error — a rendered aside must have an accessible name. */}
      <PageContent aside={<p>Actions</p>}>Content</PageContent>
      {/* @ts-expect-error — every PageHeader owns one required page title. */}
      <PageHeader />
      {/* @ts-expect-error — PageSection must have a visible title or ariaLabel. */}
      <PageSection>Unlabelled section</PageSection>
      {/* @ts-expect-error — the two labelling modes are intentionally exclusive. */}
      <PageSection title="Facts" ariaLabel="Facts">
        Duplicate label
      </PageSection>
    </>
  );
}

void _typeContract;
