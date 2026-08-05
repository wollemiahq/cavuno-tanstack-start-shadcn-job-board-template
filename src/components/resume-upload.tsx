'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { FileText, Upload } from 'lucide-react';

import { m } from '../paraglide/messages';
import { deleteResume, uploadResume } from '../server/account';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toastActionError } from '@/lib/action-toast';
import type { Resume } from '@cavuno/board';

/**
 * Resume uploader — mirrors the hosted onboarding resume pipeline:
 * pick a file, POST it as multipart, then poll parse status. The SDK calls are
 * `board.me.resume.{upload,retrieve,delete}`. Upload returns `parsing`; the
 * worker fills in parsed profile fields asynchronously.
 */
const PARSE_STATUS_LABEL: Record<string, () => string> = {
  parsing: m.resumeUpload_parseStatusParsing,
  parsed: m.resumeUpload_parseStatusParsed,
  failed: m.resumeUpload_parseStatusFailed,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return m.resumeUpload_fileSizeB({ value: bytes });
  if (bytes < 1024 * 1024) {
    return m.resumeUpload_fileSizeKb({ value: Math.round(bytes / 1024) });
  }
  return m.resumeUpload_fileSizeMb({
    value: (bytes / (1024 * 1024)).toFixed(1),
  });
}

export function ResumeUpload({
  resume,
  variant = 'section',
}: {
  resume: Resume;
  /** `embedded` drops the section heading — the host surface provides it. */
  variant?: 'section' | 'embedded';
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Keeping the resume on file is the helpful default (hosted parity) —
  // people expect an uploaded resume to stay available for reuse.
  const [keepOnFile, setKeepOnFile] = useState(resume.keepResumeOnFile ?? true);
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'deleting' | 'upload-error'
  >('idle');

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

      {resume.hasResumeOnFile && resume.file ? (
        <Attachment className="w-full" data-test="resume-attachment">
          <AttachmentMedia>
            <FileText aria-hidden />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>
              <a
                href={resume.file.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {m.resumeUpload_viewStoredResumeLink({
                  size: formatBytes(resume.file.sizeBytes),
                })}
              </a>
            </AttachmentTitle>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              size="sm"
              data-test="resume-delete"
              disabled={status === 'deleting' || status === 'uploading'}
              onClick={async () => {
                setStatus('deleting');
                try {
                  await deleteResume();
                  await router.invalidate();
                  setStatus('idle');
                } catch {
                  setStatus('idle');
                  void toastActionError();
                }
              }}
            >
              {m.resumeUpload_deleteLabel()}
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,application/pdf"
        className="sr-only"
        data-test="resume-file-input"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setStatus('uploading');
          const formData = new FormData();
          formData.append('resume', file);
          formData.append('keepResumeOnFile', String(keepOnFile));
          try {
            await uploadResume({ data: formData });
            await router.invalidate();
            setStatus('idle');
          } catch {
            setStatus('upload-error');
          }
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {/* Dropzone-styled click target (an interactive take on the Empty
          composition) — file picking is click-to-browse. */}
      <button
        type="button"
        disabled={status === 'uploading' || status === 'deleting'}
        onClick={() => inputRef.current?.click()}
        className="border-input hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col items-center gap-1.5 rounded-3xl border border-dashed p-8 text-center transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="bg-muted text-foreground mb-1 flex size-10 items-center justify-center rounded-xl">
          <Upload aria-hidden className="size-5" />
        </span>
        <span className="text-sm font-medium">
          {status === 'uploading'
            ? m.resumeUpload_uploadingLabel()
            : resume.hasResumeOnFile
              ? m.resumeUpload_replaceLabel()
              : m.resumeUpload_uploadLabel()}
        </span>
        <span className="text-muted-foreground text-xs">
          {m.resumeUpload_formatsText()}
        </span>
      </button>
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
      {status === 'upload-error' ? (
        <p className="text-destructive text-xs" role="alert">
          {m.resumeUpload_uploadError()}
        </p>
      ) : null}
    </section>
  );
}
