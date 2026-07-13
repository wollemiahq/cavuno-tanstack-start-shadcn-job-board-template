'use client'

import { useRef, useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { Resume } from '@cavuno/board'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import { deleteResume, uploadResume } from '../server/account'

/**
 * Resume uploader — mirrors the hosted onboarding resume pipeline (ADR-0055):
 * pick a file, POST it as multipart, then poll parse status. The SDK calls are
 * `board.me.resume.{upload,retrieve,delete}`. Upload returns `parsing`; the
 * worker fills in parsed profile fields asynchronously.
 */
const PARSE_STATUS_LABEL: Record<string, () => string> = {
  parsing: m.resumeUpload_parseStatusParsing,
  parsed: m.resumeUpload_parseStatusParsed,
  failed: m.resumeUpload_parseStatusFailed,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return m.resumeUpload_fileSizeB({ value: bytes })
  if (bytes < 1024 * 1024) {
    return m.resumeUpload_fileSizeKb({ value: Math.round(bytes / 1024) })
  }
  return m.resumeUpload_fileSizeMb({ value: (bytes / (1024 * 1024)).toFixed(1) })
}

export function ResumeUpload({ resume }: { resume: Resume }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keepOnFile, setKeepOnFile] = useState(resume.keepResumeOnFile ?? false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')

  return (
    <section className="space-y-3" data-test="resume-upload">
      <div className="flex items-center justify-between gap-4">
        <Text as="h2" variant="heading4">{m.resumeUpload_heading()}</Text>
        {resume.parseStatus ? (
          <Badge
            color="gray"
            type={resume.parseStatus === 'failed' ? 'modern' : 'pill-color'}
          >
            {PARSE_STATUS_LABEL[resume.parseStatus]?.() ?? resume.parseStatus}
          </Badge>
        ) : null}
      </div>

      {resume.parseStatus === 'parsing' ? (
        <p className="text-tertiary text-sm" role="status">
          {m.resumeUpload_parsingText()}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => router.invalidate()}
          >
            {m.resumeUpload_refreshLabel()}
          </button>
        </p>
      ) : null}
      {resume.parseStatus === 'failed' && resume.parseFailureReason ? (
        <p className="text-error-primary text-sm">{resume.parseFailureReason}</p>
      ) : null}

      {resume.hasResumeOnFile && resume.file ? (
        <div className="border-secondary flex items-center justify-between gap-4 rounded-lg border p-3">
          <a
            href={resume.file.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            {m.resumeUpload_viewStoredResumeLink({
              size: formatBytes(resume.file.sizeBytes),
            })}
          </a>
          <Button
            color="tertiary"
            size="sm"
            data-test="resume-delete"
            onClick={async () => {
              await deleteResume()
              await router.invalidate()
            }}
          >
            {m.resumeUpload_deleteLabel()}
          </Button>
        </div>
      ) : (
        <p className="text-tertiary text-sm">{m.resumeUpload_emptyText()}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,application/pdf"
        className="hidden"
        data-test="resume-file-input"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setStatus('pending')
          const formData = new FormData()
          formData.append('resume', file)
          formData.append('keepResumeOnFile', String(keepOnFile))
          try {
            await uploadResume({ data: formData })
            await router.invalidate()
            setStatus('idle')
          } catch {
            setStatus('error')
          }
          if (inputRef.current) inputRef.current.value = ''
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          color="secondary"
          size="sm"
          isDisabled={status === 'pending'}
          onClick={() => inputRef.current?.click()}
        >
          {status === 'pending'
            ? m.resumeUpload_uploadingLabel()
            : resume.hasResumeOnFile
            ? m.resumeUpload_replaceLabel()
            : m.resumeUpload_uploadLabel()}
        </Button>
        <Checkbox
          label={m.resumeUpload_keepCopyLabel()}
          isSelected={keepOnFile}
          onChange={setKeepOnFile}
        />
      </div>
      <p className="text-tertiary text-xs">
        {m.resumeUpload_formatsText()}
      </p>
      {status === 'error' ? (
        <p className="text-error-primary text-xs" role="status">
          {m.resumeUpload_uploadError()}
        </p>
      ) : null}
    </section>
  )
}
