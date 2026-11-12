import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import type { Images } from '@/components/custom-field-display';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { m } from '@/paraglide/messages';

/** The gallery's larger view: one image at a time, stepping through all. */
export function GalleryLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: Images;
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const current = open ? images[index] : undefined;
  const step = (delta: number) => {
    if (index === null) return;
    onIndexChange((index + delta + images.length) % images.length);
  };
  const position = m.customFieldDisplay_galleryImagePosition({
    position: String((index ?? 0) + 1),
    total: String(images.length),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-3xl"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') step(-1);
          else if (event.key === 'ArrowRight') step(1);
        }}
      >
        <DialogTitle className="sr-only">{position}</DialogTitle>
        {current ? (
          <img
            src={current.url}
            alt={current.name}
            className="bg-muted max-h-[70vh] w-full rounded-lg object-contain"
          />
        ) : null}
        {images.length > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => step(-1)}
              aria-label={m.customFieldDisplay_galleryPrevious()}
            >
              <ChevronLeftIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
            <span className="text-muted-foreground text-sm" aria-live="polite">
              {position}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => step(1)}
              aria-label={m.customFieldDisplay_galleryNext()}
            >
              <ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
