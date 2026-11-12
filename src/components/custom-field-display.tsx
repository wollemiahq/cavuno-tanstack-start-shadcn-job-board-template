import { lazy, Suspense, useState, type ElementType } from 'react';

import { FileText, Globe, Mail, Phone } from 'lucide-react';

import type {
  FieldDisplayEntry,
  FieldDisplayValue,
} from '@/board/custom-field-display';
import { Prose } from '@/components/prose';
import { Badge } from '@/components/ui/badge';
import { textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

/**
 * The default display for the operator's custom and collection fields, used
 * by the talent profile, the company page and the job page. Entries come
 * from `resolveFieldDisplay`, already in form order and already without
 * empty answers, so every component here renders what it is given.
 */

/** How many gallery tiles show before the last one becomes "View all". */
export const GALLERY_TILE_LIMIT = 6;

export type Images = Extract<FieldDisplayValue, { kind: 'images' }>['images'];

// The larger view loads on the first tile click, so pages pay for the
// dialog only when a visitor opens an image.
const LazyGalleryLightbox = lazy(() =>
  import('./custom-field-gallery-lightbox').then(({ GalleryLightbox }) => ({
    default: GalleryLightbox,
  })),
);

/**
 * Thumbnails in stored order, up to six. With more images the sixth tile
 * reads "View all (N)"; any tile opens the larger view at that image, which
 * steps through all of them.
 */
export function CustomFieldGallery({
  images,
  className,
}: {
  images: Images;
  className?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const overflow = images.length > GALLERY_TILE_LIMIT;
  const tiles = images.slice(0, GALLERY_TILE_LIMIT);

  // Columns follow the space the gallery sits in, not the viewport, so
  // tiles stay thumbnail-sized in a wide profile column and a narrow pane.
  return (
    <div className="@container">
      <ul
        className={cn(
          'grid grid-cols-2 gap-2 @md:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-6',
          className,
        )}
        data-slot="custom-field-gallery"
      >
        {tiles.map((image, position) => {
          const viewAll = overflow && position === tiles.length - 1;
          return (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                className="bg-muted focus-visible:ring-ring relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg outline-none focus-visible:ring-2"
                aria-label={
                  viewAll
                    ? m.customFieldDisplay_galleryViewAll({
                        count: String(images.length),
                      })
                    : m.customFieldDisplay_galleryOpenImage({
                        position: String(position + 1),
                        total: String(images.length),
                      })
                }
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-opacity hover:opacity-90"
                />
                {viewAll ? (
                  <span
                    aria-hidden="true"
                    className="bg-foreground/60 text-background absolute inset-0 grid place-items-center text-sm font-medium"
                  >
                    {m.customFieldDisplay_galleryViewAll({
                      count: String(images.length),
                    })}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {index === null ? null : (
        <Suspense fallback={null}>
          <LazyGalleryLightbox
            images={images}
            index={index}
            onIndexChange={setIndex}
            onClose={() => setIndex(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

/** One field's answer, formatted for its type. */
export function CustomFieldValue({ value }: { value: FieldDisplayValue }) {
  switch (value.kind) {
    case 'text':
      return (
        <span
          dir="auto"
          className={cn(
            '[overflow-wrap:anywhere]',
            value.multiline && 'whitespace-pre-line',
          )}
        >
          {value.text}
        </span>
      );
    case 'html':
      // Rich-text answers arrive sanitized from the Board API.
      return <Prose html={value.html} />;
    case 'chips':
      return (
        <span className="flex flex-wrap gap-1.5">
          {value.items.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </span>
      );
    case 'link':
      return (
        <a
          href={value.href}
          className={cn(
            textLinkClass,
            'w-fit max-w-full [overflow-wrap:anywhere]',
          )}
          {...(value.external
            ? { target: '_blank', rel: 'noopener nofollow' }
            : {})}
        >
          {value.text}
        </a>
      );
    case 'images':
      return <CustomFieldGallery images={value.images} />;
    case 'files':
      return (
        <ul className="flex flex-col gap-1.5">
          {value.files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-x-2">
              <a
                href={file.url}
                target="_blank"
                rel="noopener"
                download={file.name}
                className={cn(
                  textLinkClass,
                  'inline-flex max-w-full items-center gap-1.5 [overflow-wrap:anywhere]',
                )}
              >
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                {file.name}
              </a>
              <span className="text-muted-foreground text-sm">
                {file.sizeLabel}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'collection':
      return (
        <span className="flex flex-wrap gap-1.5">
          {value.entries.map((entry) => (
            <Badge key={entry.id} variant="outline">
              {entry.logoUrl ? (
                <img
                  src={entry.logoUrl}
                  alt=""
                  data-icon="inline-start"
                  className="size-3.5 rounded-sm object-cover"
                />
              ) : null}
              {entry.title}
            </Badge>
          ))}
        </span>
      );
  }
}

/**
 * Short answers as label-over-value facts. `grid` lays them out in columns
 * (the talent Details section); `stack` keeps one per row (a sidebar card).
 */
export function CustomFieldFacts({
  entries,
  layout = 'grid',
}: {
  entries: readonly FieldDisplayEntry[];
  layout?: 'grid' | 'stack';
}) {
  if (entries.length === 0) return null;
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        layout === 'grid' && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {entries.map((entry) => (
        <div key={entry.id} className="flex min-w-0 flex-col gap-1.5">
          <dt className="text-muted-foreground text-sm font-medium">
            {entry.label}
          </dt>
          <dd className="text-foreground text-sm">
            <CustomFieldValue value={entry.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Long answers (rich text, galleries, files), each under its own heading. */
export function CustomFieldSections({
  entries,
  headingAs: Heading = 'h2',
  headingClassName = 'text-foreground text-lg font-semibold',
}: {
  entries: readonly FieldDisplayEntry[];
  headingAs?: ElementType;
  headingClassName?: string;
}) {
  return entries.map((entry) => (
    <section key={entry.id} className="flex flex-col gap-3">
      <Heading className={headingClassName}>{entry.label}</Heading>
      <div className="text-foreground text-sm">
        <CustomFieldValue value={entry.value} />
      </div>
    </section>
  ));
}

/** Contact links (URL, email, phone fields) for a profile header. */
export function CustomFieldContactLinks({
  entries,
}: {
  entries: readonly FieldDisplayEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {entries.map((entry) => {
        const Icon =
          entry.type === 'email'
            ? Mail
            : entry.type === 'phone'
              ? Phone
              : Globe;
        return (
          <li key={entry.id} className="flex min-w-0 items-center gap-1.5">
            <Icon
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only">{entry.label}: </span>
            <CustomFieldValue value={entry.value} />
          </li>
        );
      })}
    </ul>
  );
}

/** Answers as label-beside-value rows (the job page's "Additional details"). */
export function CustomFieldRows({
  entries,
}: {
  entries: readonly FieldDisplayEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <dl className="grid max-w-full min-w-0 gap-x-6 gap-y-2.5 sm:grid-cols-[max-content_minmax(0,1fr)]">
      {entries.map((entry) => (
        <div key={entry.id} className="contents">
          <dt className="text-muted-foreground text-sm font-medium">
            {entry.label}
          </dt>
          <dd className="text-foreground min-w-0 text-sm">
            <CustomFieldValue value={entry.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
