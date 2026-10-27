/**
 * The product page's cover images: one image at a time, previous and next
 * buttons over it, arrow keys while the carousel has focus, a swipe on touch
 * screens, and a strip of thumbnail buttons. It never moves on its own. One
 * image renders as a plain cover; no images render nothing.
 *
 * Arrow keys and swipes are physical: under a right-to-left page the next
 * image is the one to the left, so ArrowLeft and a swipe to the right
 * advance.
 */
import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { ProductCover } from '@/components/board/product-ui';
import { Button } from '@/components/ui/button';
import { useDirection } from '@/components/ui/direction';
import { cn } from '@/lib/utils';

/** A horizontal swipe shorter than this is a tap or a scroll, not a swipe. */
const SWIPE_MIN_PX = 40;

export function ProductCarousel({ images }: { images: readonly string[] }) {
  const [active, setActive] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rtl = useDirection() === 'rtl';
  const count = images.length;
  if (count === 0) return null;
  if (count === 1) return <ProductCover src={images[0]} />;

  const index = Math.min(active, count - 1);
  const show = (next: number) => setActive((next + count) % count);
  const previous = () => show(index - 1);
  const next = () => show(index + 1);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (rtl) next();
      else previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (rtl) previous();
      else next();
    }
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    // A finger moving left pulls the next image in (mirrored under RTL).
    if (dx < 0 === !rtl) next();
    else previous();
  }

  return (
    <div
      role="region"
      aria-label={m.product_galleryLabel()}
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-slot="product-carousel"
      className="focus-visible:ring-ring/50 flex flex-col gap-3 rounded-2xl outline-none focus-visible:ring-3"
    >
      <div
        className="relative touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ProductCover key={images[index]} src={images[index]} />
        <Button
          type="button"
          variant="overlay"
          size="icon-xl"
          className="absolute start-3 top-1/2 -translate-y-1/2 lg:start-4"
          aria-label={m.product_previousImageLabel()}
          onClick={previous}
        >
          <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        </Button>
        <Button
          type="button"
          variant="overlay"
          size="icon-xl"
          className="absolute end-3 top-1/2 -translate-y-1/2 lg:end-4"
          aria-label={m.product_nextImageLabel()}
          onClick={next}
        >
          <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
        </Button>
        <div
          aria-hidden="true"
          className="bg-background/80 absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full px-2 py-1"
        >
          {images.map((image, dot) => (
            <span
              key={image}
              className={cn(
                'size-1.5 rounded-full',
                dot === index ? 'bg-foreground' : 'bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {m.product_imagePositionText({ index: index + 1, count })}
      </p>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {images.map((image, thumb) => (
          <button
            key={image}
            type="button"
            aria-label={m.product_showImageLabel({ index: thumb + 1 })}
            aria-current={thumb === index ? 'true' : undefined}
            onClick={() => setActive(thumb)}
            className={cn(
              'focus-visible:ring-ring/50 overflow-hidden rounded-lg ring-offset-2 outline-none focus-visible:ring-2',
              thumb === index
                ? 'ring-foreground ring-2'
                : 'opacity-70 hover:opacity-100',
            )}
          >
            <img
              src={image}
              alt=""
              loading="lazy"
              className="bg-muted h-12 w-24 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
