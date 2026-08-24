import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export type SearchResultDetailProps = Omit<
  ComponentPropsWithRef<'section'>,
  'aria-label' | 'children'
> & {
  label: string;
  scrollRestorationId?: string;
  children: ReactNode;
};

const SearchResultDetailContext = createContext(false);
const COMPACT_HEADER_EXIT_BUFFER = 8;

export function SearchResultDetailHeader({
  expanded,
  compact,
}: {
  expanded: ReactNode;
  compact: ReactNode;
}) {
  const condensed = useContext(SearchResultDetailContext);

  return (
    <>
      <div
        data-slot="detail-expanded-header"
        aria-hidden={condensed || undefined}
        inert={condensed || undefined}
      >
        {expanded}
      </div>
      <div data-slot="detail-hero-boundary" className="h-px" aria-hidden />
      <div
        data-slot="detail-compact-header-anchor"
        className="sticky top-0 z-10 h-0 group-data-[condensed=true]/detail:h-16"
      >
        {condensed ? (
          <div data-slot="detail-compact-header">{compact}</div>
        ) : null}
      </div>
    </>
  );
}

/** The desktop-only, independently scrolling detail projection. */
export function SearchResultDetail({
  label,
  scrollRestorationId = 'search-result-detail',
  className,
  children,
  ref,
  onScroll,
  ...props
}: SearchResultDetailProps) {
  const [condensed, setCondensed] = useState(false);
  const detailRef = useRef<HTMLElement | null>(null);
  /** True while a condensed-header rAF is queued (id alone is wrong if rAF is sync). */
  const pendingFrameRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  const isRefCallback = (
    value: typeof ref,
  ): value is (instance: HTMLElement | null) => void =>
    Object.prototype.toString.call(value) === '[object Function]';
  const setDetailRef = useCallback(
    (node: HTMLElement | null) => {
      detailRef.current = node;
      if (isRefCallback(ref)) {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );
  const updateCondensed = useCallback(() => {
    const detail = detailRef.current;
    if (!detail) return;

    const heroBoundary = detail.querySelector<HTMLElement>(
      '[data-slot="detail-hero-boundary"]',
    );
    setCondensed((current) => {
      if (!heroBoundary || detail.scrollTop <= 0) return false;

      // offsetTop forces layout; at most once per animation frame via the
      // scheduler below so scroll handlers do not thrash style→layout→style.
      const enterAt = heroBoundary.offsetTop;
      const exitBelow = Math.max(enterAt - COMPACT_HEADER_EXIT_BUFFER, 0);

      return detail.scrollTop >= (current ? exitBelow : enterAt);
    });
  }, []);

  const scheduleUpdateCondensed = useCallback(() => {
    if (pendingFrameRef.current) return;
    pendingFrameRef.current = true;
    frameIdRef.current = requestAnimationFrame(() => {
      pendingFrameRef.current = false;
      frameIdRef.current = null;
      updateCondensed();
    });
  }, [updateCondensed]);

  useEffect(() => {
    scheduleUpdateCondensed();
    return () => {
      if (frameIdRef.current != null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      pendingFrameRef.current = false;
    };
  }, [children, scheduleUpdateCondensed]);

  return (
    <section
      {...props}
      ref={setDetailRef}
      aria-label={label}
      data-slot="search-result-detail"
      data-scroll-restoration-id={scrollRestorationId}
      data-condensed={condensed}
      tabIndex={0}
      onScroll={(event) => {
        scheduleUpdateCondensed();
        onScroll?.(event);
      }}
      className={cn(
        'group/detail focus-visible:ring-ring hidden min-w-0 overflow-x-hidden outline-none [overflow-anchor:none] focus-visible:ring-2 focus-visible:ring-inset md:block md:h-full md:min-h-0 md:overflow-y-auto',
        className,
      )}
    >
      <SearchResultDetailContext.Provider value={condensed}>
        {children}
      </SearchResultDetailContext.Provider>
    </section>
  );
}
