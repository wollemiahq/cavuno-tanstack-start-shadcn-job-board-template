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

export interface CarouselController {
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: () => boolean;
  canScrollNext: () => boolean;
  on: (event: 'reInit' | 'select', callback: () => void) => void;
  off: (event: 'select', callback: () => void) => void;
}

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

export function resolveCarouselOptions({
  orientation,
  opts,
  dir,
  contextDirection,
}: {
  orientation: 'horizontal' | 'vertical';
  opts?: CarouselOptions;
  dir?: string;
  contextDirection: 'ltr' | 'rtl';
}) {
  const direction =
    opts?.direction ??
    (dir === 'ltr' || dir === 'rtl' ? dir : contextDirection);
  return {
    direction,
    options: {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
      direction,
    } satisfies CarouselOptions,
  };
}

export function CarouselRoot({
  orientation = 'horizontal',
  opts,
  setApi,
  className,
  children,
  dir,
  carouselRef,
  api,
  controller,
  ...props
}: React.ComponentProps<'div'> &
  CarouselProps & {
    carouselRef: ReturnType<typeof useEmblaCarousel>[0];
    api: CarouselApi;
    controller: CarouselController | undefined;
  }) {
  const direction = opts?.direction ?? (dir === 'rtl' ? 'rtl' : 'ltr');
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback(() => {
    if (!controller) return;
    setCanScrollPrev(controller.canScrollPrev());
    setCanScrollNext(controller.canScrollNext());
  }, [controller]);

  const scrollPrev = React.useCallback(() => {
    controller?.scrollPrev();
  }, [controller]);

  const scrollNext = React.useCallback(() => {
    controller?.scrollNext();
  }, [controller]);

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
    if (!controller) return;
    onSelect();
    controller.on('reInit', onSelect);
    controller.on('select', onSelect);

    return () => {
      controller.off('select', onSelect);
    };
  }, [api, controller, onSelect]);

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

function Carousel(props: React.ComponentProps<'div'> & CarouselProps) {
  const {
    orientation = 'horizontal',
    opts,
    plugins,
    dir,
    ...rootProps
  } = props;
  // Embla translates the track in raw pixels, so `<html dir>` alone does NOT
  // mirror it. Its own direction option must follow the document default.
  const contextDirection = useDirection();
  const resolved = resolveCarouselOptions({
    orientation,
    opts,
    dir,
    contextDirection,
  });
  const [carouselRef, api] = useEmblaCarousel(resolved.options, plugins);

  return (
    <CarouselRoot
      {...rootProps}
      orientation={orientation}
      opts={resolved.options}
      dir={resolved.direction}
      carouselRef={carouselRef}
      api={api}
      controller={api}
    />
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
