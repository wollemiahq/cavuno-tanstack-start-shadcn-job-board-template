'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { FileText } from 'lucide-react';

import { m } from '../paraglide/messages';
import { deleteResume, uploadResume } from '../server/account';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionReconciliationError,
} from '@/lib/action-toast';
import type { Resume } from '@cavuno/board';

/**
 * Resume uploader — mirrors the hosted onboarding resume pipeline:
 * pick a file, POST it as multipart, then poll parse status. The SDK calls are
 * `board.me.resume.{upload,retrieve,delete}`. Upload returns `parsing`; the
 * worker fills in parsed profile fields asynchronously.
 */
const PARSE_STATUS_LABEL = {
  parsing: m.resumeUpload_parseStatusParsing,
  parsed: m.resumeUpload_parseStatusParsed,
  failed: m.resumeUpload_parseStatusFailed,
} satisfies Record<string, () => string>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return m.resumeUpload_fileSizeB({ value: bytes });
  if (bytes < 1024 * 1024) {
    return m.resumeUpload_fileSizeKb({ value: Math.round(bytes / 1024) });
  }
  return m.resumeUpload_fileSizeMb({
    value: (bytes / (1024 * 1024)).toFixed(1),
  });
}

export interface ResumeUploadDependencies {
  deleteResume: () => ReturnType<typeof deleteResume>;
  uploadResume: (
    input: Parameters<typeof uploadResume>[0],
  ) => ReturnType<typeof uploadResume>;
  toastActionError: () => void | Promise<void>;
  toastActionReconciliationError: () => void | Promise<void>;
}

const resumeUploadDependencies: ResumeUploadDependencies = {
  deleteResume,
  uploadResume,
  toastActionError,
  toastActionReconciliationError,
};

export function ResumeUpload({
  resume,
  variant = 'section',
  dependencies = resumeUploadDependencies,
  showKeepOnFile = true,
}: {
  resume: Resume;
  /** `embedded` drops the section heading — the host surface provides it. */
  variant?: 'section' | 'embedded';
  dependencies?: ResumeUploadDependencies;
  /**
   * First-run onboarding hides this so the only checkbox is matching emails,
   * matching hosted. The file is still kept (`keepResumeOnFile: true`).
   */
  showKeepOnFile?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Keeping the resume on file is the helpful default (hosted parity) —
  // people expect an uploaded resume to stay available for reuse.
  const [keepOnFile, setKeepOnFile] = useState(resume.keepResumeOnFile ?? true);
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'deleting' | 'upload-error'
  >('idle');
  const storedFile = resume.hasResumeOnFile ? resume.file : null;
  const busy = status === 'uploading' || status === 'deleting';

  async function uploadFile(file: File) {
    setStatus('uploading');
    const formData = new FormData();
    formData.append('resume', file);
    formData.append(
      'keepResumeOnFile',
      String(showKeepOnFile ? keepOnFile : true),
    );
    try {
      await dependencies.uploadResume({ data: formData });
    } catch {
      setStatus('upload-error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setStatus('idle');
    await reconcileCommittedAction(
      () => router.invalidate(),
      dependencies.toastActionReconciliationError,
    );
    if (inputRef.current) inputRef.current.value = '';
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) void uploadFile(file);
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  const parseStatusBadge = resume.parseStatus ? (
    <Badge
      variant={resume.parseStatus === 'failed' ? 'destructive' : 'secondary'}
    >
      {PARSE_STATUS_LABEL[resume.parseStatus]?.() ?? resume.parseStatus}
    </Badge>
  ) : null;

  return (
    <section className="space-y-3" data-test="resume-upload">
      {variant === 'section' ? (
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {m.resumeUpload_heading()}
          </h2>
          {parseStatusBadge}
        </div>
      ) : (
        parseStatusBadge
      )}
      {variant === 'section' && !resume.hasResumeOnFile ? (
        <p className="text-muted-foreground text-sm">
          {m.resumeImport_description()}
        </p>
      ) : null}

      {resume.parseStatus === 'parsing' ? (
        <p className="text-muted-foreground text-sm" role="status">
          {m.resumeUpload_parsingText()}{' '}
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() => router.invalidate()}
          >
            {m.resumeUpload_refreshLabel()}
          </Button>
        </p>
      ) : null}
      {resume.parseStatus === 'failed' && resume.parseFailureReason ? (
        <p className="text-destructive text-sm">{resume.parseFailureReason}</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,application/pdf"
        tabIndex={-1}
        className="sr-only"
        data-test="resume-file-input"
        disabled={busy}
        onChange={onFileChange}
      />
      <Attachment
        className="w-full"
        data-test="resume-attachment"
        state={
          status === 'uploading'
            ? 'uploading'
            : status === 'upload-error'
              ? 'error'
              : storedFile
                ? 'done'
                : 'idle'
        }
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <AttachmentMedia>
          {status === 'uploading' ? <Spinner /> : <FileText aria-hidden />}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>
            {status === 'uploading'
              ? m.resumeUpload_uploadingLabel()
              : storedFile
                ? m.resumeUpload_viewStoredResumeLink({
                    size: formatBytes(storedFile.sizeBytes),
                  })
                : m.resumeUpload_uploadLabel()}
          </AttachmentTitle>
          <AttachmentDescription>
            {m.resumeUpload_formatsText()}
          </AttachmentDescription>
        </AttachmentContent>
        {storedFile && status !== 'uploading' ? (
          <AttachmentActions>
            <AttachmentAction
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {m.resumeUpload_replaceLabel()}
            </AttachmentAction>
            <AttachmentAction
              size="sm"
              data-test="resume-delete"
              disabled={busy}
              onClick={async () => {
                setStatus('deleting');
                try {
                  await dependencies.deleteResume();
                } catch {
                  setStatus('idle');
                  void dependencies.toastActionError();
                  return;
                }
                setStatus('idle');
                await reconcileCommittedAction(
                  () => router.invalidate(),
                  dependencies.toastActionReconciliationError,
                );
              }}
            >
              {m.resumeUpload_deleteLabel()}
            </AttachmentAction>
          </AttachmentActions>
        ) : null}
        {status !== 'uploading' && storedFile ? (
          <AttachmentTrigger
            render={
              <a
                href={storedFile.url}
                target="_blank"
                rel="noreferrer"
                aria-label={m.resumeUpload_viewStoredResumeLink({
                  size: formatBytes(storedFile.sizeBytes),
                })}
              />
            }
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ) : null}
        {status !== 'uploading' && !storedFile ? (
          <AttachmentTrigger
            aria-label={m.resumeUpload_uploadLabel()}
            disabled={busy}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          />
        ) : null}
      </Attachment>
      {showKeepOnFile ? (
        <div className="space-y-1">
          <Label className="w-fit cursor-pointer">
            <Checkbox
              checked={keepOnFile}
              onCheckedChange={(checked) => setKeepOnFile(checked === true)}
            />
            {m.resumeUpload_keepCopyLabel()}
          </Label>
          <p className="text-muted-foreground text-xs">
            {m.resumeUpload_keepCopyHint()}
          </p>
        </div>
      ) : null}
      {status === 'upload-error' ? (
        <p className="text-destructive text-xs" role="alert">
          {m.resumeUpload_uploadError()}
        </p>
      ) : null}
    </section>
  );
}
