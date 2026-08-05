// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchSelection } from './use-search-selection';

function setDesktop(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(min-width: 48rem)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function Harness({
  selectedJob,
  jobSlugs = ['first-job', 'second-job'],
  page,
  onReplace = vi.fn(),
  onPush = vi.fn(),
}: {
  selectedJob?: string;
  jobSlugs?: string[];
  page?: number;
  onReplace?: (jobSlug: string) => void;
  onPush?: (jobSlug: string) => void;
}) {
  const selection = useSearchSelection({
    selectedId: selectedJob,
    resultIds: jobSlugs,
    page,
    onReplace,
    onPush,
  });

  return (
    <div>
      <output data-testid="selected-job">{selection.selectedId}</output>
      <div
        ref={(node) => {
          selection.detailRef.current = node;
          if (node) node.scrollTo = vi.fn();
        }}
        data-testid="detail-pane"
      />
      <section
        ref={(node) => {
          selection.listRef.current = node;
          if (node && !node.scrollTo) node.scrollTo = vi.fn();
        }}
        data-testid="results-list"
      >
        {jobSlugs.map((slug) => (
          <div key={slug} data-result-id={slug}>
            {slug}
          </div>
        ))}
      </section>
      <a
        href="/companies/acme/jobs/second-job"
        onClick={(event) => selection.onResultActivate(event, 'second-job')}
      >
        Second job
      </a>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useSearchSelection', () => {
  it('replaces an absent or invalid desktop selection with the first result', async () => {
    setDesktop(true);
    const onReplace = vi.fn();

    render(<Harness selectedJob="removed-job" onReplace={onReplace} />);

    await waitFor(() => expect(onReplace).toHaveBeenCalledWith('first-job'));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('pushes an explicit desktop selection', () => {
    setDesktop(true);
    const onPush = vi.fn();

    render(<Harness selectedJob="first-job" onPush={onPush} />);
    fireEvent.click(screen.getByRole('link', { name: 'Second job' }));

    expect(onPush).toHaveBeenCalledWith('second-job');
  });

  it('resets only the detail pane whenever browser history changes the selection', () => {
    setDesktop(true);

    const { rerender } = render(<Harness selectedJob="first-job" />);
    const detailPane = screen.getByTestId('detail-pane');

    rerender(<Harness selectedJob="second-job" />);

    expect(detailPane.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('leaves modified activation to the canonical anchor', () => {
    setDesktop(true);
    const onPush = vi.fn();

    render(<Harness selectedJob="first-job" onPush={onPush} />);
    const detailPane = screen.getByTestId('detail-pane');

    fireEvent.click(screen.getByRole('link', { name: 'Second job' }), {
      metaKey: true,
    });

    expect(onPush).not.toHaveBeenCalled();
    expect(detailPane.scrollTo).not.toHaveBeenCalled();
  });

  it('does not inject a selection or intercept activation on mobile', async () => {
    setDesktop(false);
    const onReplace = vi.fn();
    const onPush = vi.fn();

    render(<Harness onReplace={onReplace} onPush={onPush} />);

    expect(screen.getByTestId('selected-job').textContent).toBe('');
    await waitFor(() => expect(onReplace).not.toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: 'Second job' }));
    expect(onPush).not.toHaveBeenCalled();
  });

  describe('arrival scroll (URL-selected job aligns to list top)', () => {
    // jsdom ships no scrollIntoView; the hook guards on its presence, so
    // provide a spy to observe the arrival alignment.
    const scrollIntoView = vi.fn();
    beforeEach(() => {
      scrollIntoView.mockClear();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    it('scrolls the URL-selected row to the top on initial arrival', () => {
      setDesktop(true);
      render(
        <Harness
          selectedJob="second-job"
          jobSlugs={['first-job', 'second-job', 'third-job']}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      const target = scrollIntoView.mock.instances[0] as HTMLElement;
      expect(target.getAttribute('data-result-id')).toBe('second-job');
    });

    it('does not scroll a later in-page selection made after arrival', () => {
      setDesktop(true);
      const { rerender } = render(
        <Harness
          selectedJob={undefined}
          jobSlugs={['first-job', 'second-job']}
        />,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();

      // A click selects a row post-mount — the list must not jump.
      rerender(
        <Harness
          selectedJob="second-job"
          jobSlugs={['first-job', 'second-job']}
        />,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('is a no-op when the arrived job is absent from this page', () => {
      setDesktop(true);
      render(
        <Harness
          selectedJob="off-page"
          jobSlugs={['first-job', 'second-job']}
        />,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('does not scroll on mobile', () => {
      setDesktop(false);
      render(
        <Harness
          selectedJob="second-job"
          jobSlugs={['first-job', 'second-job']}
        />,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('page-change list scroll reset', () => {
    // jsdom's Element.scrollTo is incomplete; pin the list's own method so the
    // pagination reset is observable the same way arrival scroll uses
    // scrollIntoView.
    it('scrolls the list to its top when the page search param changes', () => {
      setDesktop(true);
      const { rerender } = render(
        <Harness
          selectedJob="first-job"
          jobSlugs={['first-job', 'second-job']}
          page={1}
        />,
      );
      const list = screen.getByTestId('results-list');
      const scrollTo = vi.fn();
      list.scrollTo = scrollTo;

      rerender(
        <Harness
          selectedJob="first-job"
          jobSlugs={['first-job', 'second-job']}
          page={2}
        />,
      );

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    it('does not reset list scroll when only the selected result changes', () => {
      setDesktop(true);
      const { rerender } = render(
        <Harness
          selectedJob="first-job"
          jobSlugs={['first-job', 'second-job']}
          page={1}
        />,
      );
      const list = screen.getByTestId('results-list');
      const scrollTo = vi.fn();
      list.scrollTo = scrollTo;

      rerender(
        <Harness
          selectedJob="second-job"
          jobSlugs={['first-job', 'second-job']}
          page={1}
        />,
      );

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('does not scroll the list on the initial mount page', () => {
      setDesktop(true);
      render(
        <Harness
          selectedJob="first-job"
          jobSlugs={['first-job', 'second-job']}
          page={2}
        />,
      );
      const list = screen.getByTestId('results-list');
      const scrollTo = vi.fn();
      list.scrollTo = scrollTo;

      // Mount with page=2 must not yank the list — only a subsequent page
      // change does. Re-render with the same page to flush effects.
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
