'use client';

import { useRef, useState } from 'react';

import { FileText, MoreHorizontal, Upload } from 'lucide-react';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { boardErrorMessage } from '@/lib/board-error-message';
import { searchString } from '@/lib/pagination';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import type { ProfileFieldMedia } from '@cavuno/board';

/** The API's cap on one profile field's gallery. */
export const GALLERY_MAX_IMAGES = 10;

const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const FILE_ACCEPT =
  '.pdf,.doc,.docx,.odt,.rtf,.txt,image/jpeg,image/png,image/webp,image/gif';

/** One upload to an owner-editable gallery or file field. */
export type CustomFieldUploadResult =
  | { ok: true; data: ProfileFieldMedia }
  | { ok: false; code: string; message: string };

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

function sizeLabel(bytes: number): string {
  const [value, unit] =
    bytes < 1024 * 1024
      ? [bytes / 1024, 'kilobyte']
      : [bytes / 1048576, 'megabyte'];
  return new Intl.NumberFormat(getLocale(), {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: unit === 'megabyte' ? 1 : 0,
  }).format(value);
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
      const result = await uploads.upload(fieldKey, file);
      setPending((count) => count - 1);
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

  function move(index: number, by: -1 | 1) {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(index + by, 0, moved!);
    commit(next);
  }

  const picker = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      className="sr-only"
      tabIndex={-1}
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
  const busy = pending > 0;

  if (!isGallery) {
    const file = shown[0];
    return (
      <div className="space-y-2">
        {picker}
        {file ? (
          <Attachment className="w-full" state={busy ? 'uploading' : 'done'}>
            <AttachmentMedia>
              {busy ? <Spinner /> : <FileText aria-hidden />}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file.name}</AttachmentTitle>
              <AttachmentDescription>
                {sizeLabel(file.sizeBytes)}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {m.customFieldUpload_replaceLabel()}
              </AttachmentAction>
              <AttachmentAction
                size="sm"
                disabled={busy}
                onClick={() => commit([])}
              >
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
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {shown.map((file, index) => (
            <li key={file.id}>
              <Attachment orientation="vertical">
                <AttachmentMedia variant="image">
                  <img
                    src={file.url}
                    alt={m.customFieldDisplay_galleryImagePosition({
                      position: index + 1,
                      total: shown.length,
                    })}
                    loading="lazy"
                  />
                </AttachmentMedia>
                <AttachmentActions>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          aria-label={m.customFieldUpload_imageActionsLabel({
                            position: index + 1,
                            total: shown.length,
                          })}
                        >
                          <MoreHorizontal aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {index > 0 ? (
                        <DropdownMenuItem onClick={() => move(index, -1)}>
                          {m.customFieldUpload_moveEarlierLabel()}
                        </DropdownMenuItem>
                      ) : null}
                      {index < shown.length - 1 ? (
                        <DropdownMenuItem onClick={() => move(index, 1)}>
                          {m.customFieldUpload_moveLaterLabel()}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          commit(ids.filter((fileId) => fileId !== file.id))
                        }
                      >
                        {m.customFieldUpload_removeLabel()}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </AttachmentActions>
              </Attachment>
            </li>
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
