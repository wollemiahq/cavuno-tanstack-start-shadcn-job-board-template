/**
 * Presentation for operator-defined detail data (custom fields and
 * collection selections), shared by the job and company pages. Every value
 * arrives pre-resolved from `src/board/detail-fields.ts`; the page decides
 * where each zone sits, these components decide how one looks.
 */
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
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

/** A label/value list: the job facts and a rich card's details. */
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

/** A compact collection's entries as chips, with the entry logo if any. */
export function CollectionChips({
  entries,
  variant = 'outline',
}: {
  entries: DetailCollectionEntry[];
  variant?: 'outline' | 'secondary';
}) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Badge
            variant={variant}
            className={cn(
              variant === 'outline' ? 'h-6 px-2.5 text-sm' : undefined,
            )}
          >
            {entry.logoUrl ? (
              <img
                src={entry.logoUrl}
                alt=""
                loading="lazy"
                className="size-4 rounded-sm object-contain"
              />
            ) : null}
            <span dir="auto">{entry.title}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function RichEntryCard({ entry }: { entry: DetailCollectionEntry }) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="flex items-center gap-3">
        {entry.logoUrl ? (
          <Avatar size="sm">
            <AvatarImage src={entry.logoUrl} alt="" />
          </Avatar>
        ) : null}
        <CardTitle>
          <h3 dir="auto">{entry.title}</h3>
        </CardTitle>
      </CardHeader>
      {entry.description ||
      entry.details.length > 0 ||
      entry.rows.length > 0 ? (
        <CardContent className="flex flex-col gap-3">
          {entry.description?.kind === 'html' ? (
            <Prose html={entry.description.html} />
          ) : entry.description ? (
            <p
              className="text-muted-foreground text-sm whitespace-pre-line"
              dir="auto"
            >
              {entry.description.text}
            </p>
          ) : null}
          <DetailFactList rows={entry.details} />
          {entry.rows.map((row) => (
            <div key={row[0]!.key} className="border-border border-t pt-3">
              <DetailFactList rows={row} />
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

/** Rich collections: one card grid per field, under the field label. */
export function DetailRichCollections({
  collections,
}: {
  collections: DetailCollection[];
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
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {collection.entries.map((entry) => (
          <li key={entry.id}>
            <RichEntryCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  ));
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
