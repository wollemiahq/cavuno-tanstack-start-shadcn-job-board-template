'use client';

import { useRef, useState } from 'react';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Upload, X } from 'lucide-react';

import { sizeLabel } from '@/board/custom-field-display';
import type { ProfileFieldValue } from '@/board/profile-field-writes';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { boardErrorMessage } from '@/lib/board-error-message';
import { searchString } from '@/lib/pagination';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import type { ActionResult } from '@/server/employers';
import type { ProfileFieldMedia } from '@cavuno/board';

/** The API's cap on one profile field's gallery. */
export const GALLERY_MAX_IMAGES = 10;

const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const FILE_ACCEPT =
  '.pdf,.doc,.docx,.odt,.rtf,.txt,image/jpeg,image/png,image/webp,image/gif';

/** One upload to an owner-editable gallery or file field. */
export type CustomFieldUploadResult = ActionResult<ProfileFieldMedia>;

/**
 * What the gallery and file inputs need from their form: the upload for
 * this owner (the job seeker's or the company's), and the saved files from
 * the owner read, keyed by field.
 */
export type CustomFieldUploads = {
  upload: (fieldKey: string, file: File) => Promise<CustomFieldUploadResult>;
  media: Readonly<Record<string, readonly ProfileFieldMedia[]>>;
};

/** A gallery stores its file IDs in order; a file field stores one. */
function storedIds(value: ProfileFieldValue | undefined): string[] {
  if (Array.isArray(value)) return value;
  const id = searchString(value);
  return id ? [id] : [];
}

function uploadErrorText(
  failure: { code: string; message: string },
  kind: 'image_gallery' | 'file',
): string {
  if (failure.code === 'media_payload_too_large') {
    return m.customFieldUpload_tooLargeError();
  }
  if (failure.code === 'media_unsupported_type') {
    return kind === 'image_gallery'
      ? m.customFieldUpload_galleryTypeError()
      : m.customFieldUpload_fileTypeError();
  }
  return boardErrorMessage(failure);
}

/**
 * The owner's input for an `image_gallery` or `file` custom field. Each
 * picked file uploads at once and is held as a draft; the field's value is
 * the ordered file IDs (one for a file field), which the form saves with
 * its other custom fields, so nothing goes live until Save. Reordering is a
 * menu per image, so it works by keyboard and touch.
 */
export function CustomFieldFilesInput({
  id,
  fieldKey,
  label,
  type,
  value,
  uploads,
  onChange,
}: {
  id: string;
  fieldKey: string;
  label: string;
  type: 'image_gallery' | 'file';
  value: ProfileFieldValue | undefined;
  uploads: CustomFieldUploads;
  onChange: (ids: string[] | string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<ProfileFieldMedia[]>([]);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ids = storedIds(value);
  // Uploads in flight append to the latest list, not the render's.
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const files = new Map(
    [...(uploads.media[fieldKey] ?? []), ...drafts].map((file) => [
      file.id,
      file,
    ]),
  );
  const shown = ids.flatMap((fileId) => {
    const file = files.get(fileId);
    return file ? [file] : [];
  });
  const isGallery = type === 'image_gallery';
  const remaining = isGallery ? GALLERY_MAX_IMAGES - ids.length : 1;

  function commit(next: string[]) {
    idsRef.current = next;
    onChange(isGallery ? next : (next[0] ?? ''));
  }

  async function uploadAll(picked: File[]) {
    setError(null);
    const accepted = isGallery
      ? picked.slice(0, Math.max(remaining, 0))
      : picked.slice(0, 1);
    if (isGallery && picked.length > accepted.length) {
      setError(
        m.customFieldUpload_galleryLimitError({ max: GALLERY_MAX_IMAGES }),
      );
    }
    for (const file of accepted) {
      setPending((count) => count + 1);
      let result: CustomFieldUploadResult;
      try {
        result = await uploads.upload(fieldKey, file);
      } catch {
        // A dropped connection or an expired session throws instead of
        // returning a failure; the field must not stay stuck uploading.
        result = { ok: false, code: 'unknown', message: '' };
      } finally {
        setPending((count) => count - 1);
      }
      if (!result.ok) {
        setError(uploadErrorText(result, type));
        continue;
      }
      setDrafts((current) => [...current, result.data]);
      commit(
        isGallery ? [...idsRef.current, result.data.id] : [result.data.id],
      );
    }
  }

  // By ID, not by the shown position: a saved ID whose file the owner read
  // no longer returns is kept in `ids` but not shown.
  function reorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    commit(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    );
  }

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the remove
    // button stays a click; a long press on touch, so the page still scrolls.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const position = (id: UniqueIdentifier) =>
    shown.findIndex((file) => file.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      m.customFieldUpload_reorderPickedUp({
        position: position(active.id),
        total: shown.length,
      }),
    onDragOver: ({ over }) =>
      over
        ? m.customFieldUpload_reorderMoved({
            position: position(over.id),
            total: shown.length,
          })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? m.customFieldUpload_reorderDropped({
            position: position(over.id),
            total: shown.length,
          })
        : m.customFieldUpload_reorderCancelled({
            position: position(active.id),
          }),
    onDragCancel: ({ active }) =>
      m.customFieldUpload_reorderCancelled({ position: position(active.id) }),
  };

  const busy = pending > 0;
  const picker = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      className="sr-only"
      tabIndex={-1}
      // The field label opens this picker too, so it locks with the buttons.
      disabled={busy}
      accept={isGallery ? GALLERY_ACCEPT : FILE_ACCEPT}
      multiple={isGallery}
      aria-label={label}
      onChange={async (event) => {
        const picked = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (picked.length > 0) await uploadAll(picked);
      }}
    />
  );

  if (!isGallery) {
    const file = shown[0];
    return (
      <div className="space-y-2">
        {picker}
        {file ? (
          <Attachment className="w-full">
            <AttachmentMedia>
              <FileText aria-hidden />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file.name}</AttachmentTitle>
              <AttachmentDescription>
                {sizeLabel(file.sizeBytes, getLocale())}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction size="sm" onClick={() => commit([])}>
                {m.customFieldUpload_removeLabel()}
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <span className="sr-only">{file.name}</span>
                </a>
              }
            />
          </Attachment>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Spinner /> : <Upload aria-hidden />}
            {busy
              ? m.customFieldUpload_uploadingLabel()
              : m.customFieldUpload_fileAddLabel()}
          </Button>
        )}
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {picker}
      {shown.length > 0 || busy ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={reorder}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: m.customFieldUpload_reorderInstructions(),
            },
          }}
        >
          <SortableContext
            items={shown.map((file) => file.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="flex flex-wrap gap-2" aria-label={label}>
              {shown.map((file, index) => (
                <SortableImage
                  key={file.id}
                  file={file}
                  position={index + 1}
                  total={shown.length}
                  onRemove={() =>
                    commit(ids.filter((fileId) => fileId !== file.id))
                  }
                />
              ))}
              {busy ? (
                <li>
                  <Attachment orientation="vertical" state="uploading">
                    <AttachmentMedia>
                      <Spinner />
                    </AttachmentMedia>
                  </Attachment>
                </li>
              ) : null}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden />
          {m.customFieldUpload_galleryAddLabel()}
        </Button>
        <FieldDescription>
          {m.customFieldUpload_galleryCount({
            count: ids.length,
            max: GALLERY_MAX_IMAGES,
          })}
        </FieldDescription>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

/**
 * One gallery image. The image is the drag handle (mouse, long press, or
 * focus and space then the arrow keys); the remove button sits beside it,
 * not inside it, so it is never a button within a button.
 */
function SortableImage({
  file,
  position,
  total,
  onRemove,
}: {
  file: ProfileFieldMedia;
  position: number;
  total: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.id,
    attributes: {
      roleDescription: m.customFieldUpload_reorderRoleDescription(),
    },
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
        position: 'relative',
      }}
    >
      <Attachment orientation="vertical">
        <AttachmentMedia
          ref={setActivatorNodeRef}
          variant="image"
          className="focus-visible:ring-ring/30 cursor-grab touch-manipulation outline-none focus-visible:ring-3 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <img
            src={file.url}
            alt={m.customFieldDisplay_galleryImagePosition({ position, total })}
            loading="lazy"
            draggable={false}
          />
        </AttachmentMedia>
        <AttachmentActions>
          <AttachmentAction
            variant="secondary"
            aria-label={m.customFieldUpload_removeImageLabel({
              position,
              total,
            })}
            onClick={onRemove}
          >
            <X aria-hidden />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </li>
  );
}
