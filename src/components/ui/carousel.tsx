'use client';

import * as React from 'react';

import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import { useDirection } from '@/components/ui/direction';
import { cn } from '@/lib/utils';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  // Embla translates the track in raw pixels, so `<html dir>` alone does NOT
  // mirror it: under RTL the flex track lays its slides out right-to-left
  // while embla keeps scrolling the LTR way, and the arrows (already flipped
  // by `rtl:` variants) end up pointing opposite the content. `direction` is
  // embla's own first-class flip. A caller who passes `opts.direction`
  // explicitly still wins — this only supplies the document's default.
  const contextDirection = useDirection();
  const direction =
    opts?.direction ??
    (dir === 'ltr' || dir === 'rtl' ? dir : contextDirection);
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
      direction,
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Arrow keys are PHYSICAL, the scroll is LOGICAL: with a horizontal axis
  // flipped, the next slide is the one to the left, so ArrowLeft advances.
  // Embla does not mirror a vertical axis, so preserve its existing key
  // mapping there.
  const isHorizontalRtl = orientation === 'horizontal' && direction === 'rtl';
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (isHorizontalRtl) scrollNext();
        else scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isHorizontalRtl) scrollPrev();
        else scrollNext();
      }
    },
    [scrollPrev, scrollNext, isHorizontalRtl],
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        dir={direction}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ms-4' : '-mt-4 flex-col',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'ps-4' : 'pt-4',
        className,
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant = 'outline',
  size = 'icon-sm',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        'absolute touch-manipulation rounded-2xl',
        orientation === 'horizontal'
          ? 'inset-y-0 -start-12 my-auto'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      {/* No double flip: embla's `direction: 'rtl'` reverses the TRACK, not
          prev/next, so the previous slide is still the one toward the start —
          physically the right under RTL, which is where `-start-12` puts this
          button and where `rtl:rotate-180` points its chevron. */}
      <ChevronLeftIcon className="rtl:rotate-180" />
      <span className="sr-only">{m.ui_carouselPreviousLabel()}</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = 'outline',
  size = 'icon-sm',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        'absolute touch-manipulation rounded-2xl',
        orientation === 'horizontal'
          ? 'inset-y-0 -end-12 my-auto'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon className="rtl:rotate-180" />
      <span className="sr-only">{m.ui_carouselNextLabel()}</span>
    </Button>
  );
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};
