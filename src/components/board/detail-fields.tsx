/**
 * Presentation for operator-defined detail data (custom fields and
 * collection selections), shared by the job and company pages. Every value
 * arrives pre-resolved from `src/board/detail-fields.ts`; the page decides
 * where each zone sits, these components decide how one looks.
 */
import { useId, useState, type ReactNode } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import type {
  DetailCollection,
  DetailCollectionEntry,
  DetailDocuments,
  DetailField,
  DetailMedia,
  DetailValue,
} from '@/board/detail-fields';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { initialsOf } from '@/lib/initials';
import { textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

/** One resolved value, inline. HTML only for the API's sanitised fields. */
export function DetailValueView({ value }: { value: DetailValue }) {
  switch (value.kind) {
    case 'text':
      return (
        <span className="whitespace-pre-line" dir="auto">
          {value.text}
        </span>
      );
    case 'link': {
      const external = /^https?:/i.test(value.href);
      return (
        <a
          href={value.href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className={cn(textLinkClass, 'break-words')}
          dir="auto"
        >
          {value.text}
        </a>
      );
    }
    case 'html':
      // TRUST BOUNDARY: rich text values and rich-text collection
      // descriptions are sanitised by the Board API (the same contract as the
      // job and company descriptions).
      return <Prose html={value.html} />;
    case 'images':
      return (
        <div className="flex flex-wrap gap-2">
          {value.images.map((image, index) => (
            <a
              key={`${index}:${image.url}`}
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-2"
            >
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                className="bg-muted size-16 rounded-md object-cover"
              />
            </a>
          ))}
        </div>
      );
    case 'files':
      return <FileLinks files={value.files} />;
  }
}

function FileLinks({ files }: { files: DetailDocuments['files'] }) {
  return (
    <ul className="flex flex-col gap-1">
      {files.map((file) => (
        <li key={file.url} className="flex flex-wrap items-baseline gap-x-2">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className={cn(textLinkClass, 'break-all')}
            dir="auto"
          >
            {file.name}
          </a>
          {file.sizeLabel ? (
            <span className="text-muted-foreground text-xs">
              {file.sizeLabel}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** A label/value list: the job facts. */
export function DetailFactList({ rows }: { rows: DetailField[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="text-muted-foreground text-sm font-medium">
            {row.label}
          </dt>
          <dd className="text-foreground min-w-0 text-sm">
            <DetailValueView value={row.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Long and rich text fields, each its own section under its label. */
export function DetailProseSections({ fields }: { fields: DetailField[] }) {
  return fields.map((field) => (
    <section
      key={field.key}
      aria-label={field.label}
      className="flex flex-col gap-3"
    >
      <Text as="h2" variant="heading4">
        {field.label}
      </Text>
      {field.value.kind === 'html' ? (
        <Prose html={field.value.html} />
      ) : field.value.kind === 'text' ? (
        <Prose>
          <p className="whitespace-pre-line">{field.value.text}</p>
        </Prose>
      ) : (
        <DetailValueView value={field.value} />
      )}
    </section>
  ));
}

/** Image fields as figures and galleries as thumbnail grids. */
export function DetailMediaSections({ media }: { media: DetailMedia[] }) {
  return media.map((field) => (
    <section
      key={field.key}
      aria-label={field.label}
      className="flex flex-col gap-3"
    >
      <Text as="h2" variant="heading4">
        {field.label}
      </Text>
      {field.layout === 'figure' ? (
        <figure>
          <img
            src={field.images[0]!.url}
            alt={field.images[0]!.alt}
            loading="lazy"
            className="bg-muted w-full rounded-xl object-cover"
          />
        </figure>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {field.images.map((image, index) => (
            <li key={`${index}:${image.url}`}>
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="focus-visible:ring-ring/50 block rounded-lg outline-none focus-visible:ring-2"
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  className="bg-muted aspect-square w-full rounded-lg object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  ));
}

/** How many entries a collection previews before its "Show all" control. */
const LIST_PREVIEW_COUNT = 6;
const TILE_PREVIEW_COUNT = 12;
const CHIP_PREVIEW_COUNT = 12;

/**
 * Renders a run of entries. `previewCount` hides the entries past it; they
 * stay in the markup, so the page's HTML carries the whole selection.
 */
type RenderEntries = (
  entries: DetailCollectionEntry[],
  previewCount?: number,
) => ReactNode;

/**
 * Preview, then expand in place. Collapsed, a long collection shows its
 * first `limit` entries, ungrouped. Expanded, it shows every entry, under the
 * collection's group subheadings when it has any (`collection.groups`), or as
 * the same flat run when it has none. A collection within the limit has
 * nothing to expand.
 */
function ExpandableCollection({
  collection,
  limit,
  renderEntries,
}: {
  collection: DetailCollection;
  limit: number;
  renderEntries: RenderEntries;
}) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const total = collection.entries.length;
  const collapsible = total > limit;
  const groups = collapsible && expanded ? collection.groups : null;
  return (
    <>
      <div id={contentId} className="flex flex-col gap-6">
        {groups
          ? groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <Text as="h3" variant="secondary" size="sm" bold>
                  {group.label}
                </Text>
                {renderEntries(group.entries)}
              </div>
            ))
          : renderEntries(
              collection.entries,
              collapsible && !expanded ? limit : undefined,
            )}
      </div>
      {collapsible ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="-ms-3 self-start"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? m.detailFields_showFewer()
            : m.detailFields_showAll({
                count: total.toLocaleString(getLocale()),
              })}
          {expanded ? (
            <ChevronUp data-icon="inline-end" />
          ) : (
            <ChevronDown data-icon="inline-end" />
          )}
        </Button>
      ) : null}
    </>
  );
}

/**
 * A chip collection (no descriptions, no logos): name chips, wrapping, in
 * the same size and treatment as the taxonomy chips on both pages. The first
 * twelve show; a disclosure reveals the rest in place, grouped when the
 * collection has a categorising field.
 */
export function CollectionChips({
  collection,
}: {
  collection: DetailCollection;
}) {
  return (
    <ExpandableCollection
      collection={collection}
      limit={CHIP_PREVIEW_COUNT}
      renderEntries={(entries, previewCount) => (
        <ul className="flex flex-wrap items-center gap-1.5">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              hidden={previewCount !== undefined && index >= previewCount}
            >
              <Badge variant="outline" className="h-6 px-2.5 text-sm">
                <span dir="auto">{entry.title}</span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

const entryMarkSize = {
  /** List rows. */
  md: 'size-8 rounded-lg text-xs',
  /** Logo tiles. */
  lg: 'size-12 rounded-xl text-base',
} as const;

/**
 * The entry's logo, contained on a neutral square (so a transparent logo
 * still reads as a tile), or the same square with its initial. Decorative.
 */
function EntryMark({
  entry,
  size = 'md',
}: {
  entry: DetailCollectionEntry;
  size?: keyof typeof entryMarkSize;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-muted text-muted-foreground flex shrink-0 items-center justify-center overflow-hidden font-medium',
        entryMarkSize[size],
      )}
    >
      {entry.logoUrl ? (
        <img
          src={entry.logoUrl}
          alt=""
          loading="lazy"
          className="size-full object-contain"
        />
      ) : (
        initialsOf(entry.title.trim().split(/\s+/)[0] ?? '')
      )}
    </span>
  );
}

/**
 * A tile collection (no descriptions, at least one logo): a muted panel of
 * equal tiles, each a large logo over the name; an entry without a logo gets
 * the same tile with its initial. Four columns on wide screens, three on
 * medium, two on phones. The first twelve show; a disclosure reveals the
 * rest in place, grouped when the collection has a categorising field.
 */
export function CollectionTiles({
  collection,
}: {
  collection: DetailCollection;
}) {
  return (
    <ExpandableCollection
      collection={collection}
      limit={TILE_PREVIEW_COUNT}
      renderEntries={(entries, previewCount) => (
        <ul className="bg-muted/50 grid auto-rows-fr grid-cols-2 gap-2 rounded-2xl p-2 md:grid-cols-3 lg:grid-cols-4">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              hidden={previewCount !== undefined && index >= previewCount}
              className="min-w-0"
            >
              <Card
                size="sm"
                className="h-full items-center gap-3 px-3 text-center"
              >
                <EntryMark entry={entry} size="lg" />
                <span
                  className="text-foreground line-clamp-2 text-sm font-medium break-words"
                  dir="auto"
                >
                  {entry.title}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

/**
 * A list collection: logo, bold title and a description clamped to two
 * lines, two columns on wide screens, no cards or borders. The first six
 * show; a disclosure reveals the rest in place, grouped when the collection
 * has a categorising field.
 */
export function CollectionList({
  collection,
}: {
  collection: DetailCollection;
}) {
  return (
    <ExpandableCollection
      collection={collection}
      limit={LIST_PREVIEW_COUNT}
      renderEntries={(entries, previewCount) => (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              hidden={previewCount !== undefined && index >= previewCount}
              className="flex min-w-0 items-start gap-3"
            >
              <EntryMark entry={entry} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p
                  className="text-foreground text-sm font-semibold break-words"
                  dir="auto"
                >
                  {entry.title}
                </p>
                {entry.description?.kind === 'html' ? (
                  // TRUST BOUNDARY: a rich-text collection description is
                  // sanitised by the Board API.
                  <Prose
                    html={entry.description.html}
                    className="text-muted-foreground line-clamp-2 text-sm"
                  />
                ) : entry.description ? (
                  <p
                    className="text-muted-foreground line-clamp-2 text-sm"
                    dir="auto"
                  >
                    {entry.description.text}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

/** Main-column collections: one section per field, under the field label. */
function CollectionSections({
  collections,
  Presentation,
}: {
  collections: DetailCollection[];
  Presentation: typeof CollectionList;
}) {
  return collections.map((collection) => (
    <section
      key={collection.key}
      aria-label={collection.label}
      className="flex flex-col gap-4"
    >
      <Text as="h2" variant="heading4">
        {collection.label}
      </Text>
      <Presentation collection={collection} />
    </section>
  ));
}

/** List collections: one section per field, under the field label. */
export function DetailListCollections({
  collections,
}: {
  collections: DetailCollection[];
}) {
  return (
    <CollectionSections
      collections={collections}
      Presentation={CollectionList}
    />
  );
}

/** Tile collections: one section per field, under the field label. */
export function DetailTileCollections({
  collections,
}: {
  collections: DetailCollection[];
}) {
  return (
    <CollectionSections
      collections={collections}
      Presentation={CollectionTiles}
    />
  );
}

/** File fields as one "Documents" link list, grouped by field label. */
export function DetailDocumentList({
  heading,
  documents,
}: {
  heading: string;
  documents: DetailDocuments[];
}) {
  if (documents.length === 0) return null;
  return (
    <section aria-label={heading} className="flex flex-col gap-3">
      <Text as="h2" variant="heading4">
        {heading}
      </Text>
      <dl className="flex flex-col gap-3">
        {documents.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm font-medium">
              {field.label}
            </dt>
            <dd className="text-sm">
              <FileLinks files={field.files} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
