"use client";

import { useRef, useState } from "react";

import { useRouter } from "@tanstack/react-router";
import type { Resume } from "@cavuno/board";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CandidateActionFeedback } from "@/components/candidate-action-feedback";
import { m } from "../paraglide/messages";
import { deleteResume, uploadResume } from "../server/account";

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

export function ResumeUpload({ resume }: { resume: Resume }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [keepOnFile, setKeepOnFile] = useState(resume.keepResumeOnFile ?? false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "deleting" | "upload-error" | "delete-error"
  >("idle");

  return (
    <section className="space-y-3" data-test="resume-upload">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {m.resumeUpload_heading()}
        </h2>
        {resume.parseStatus ? (
          <Badge variant={resume.parseStatus === "failed" ? "destructive" : "secondary"}>
            {PARSE_STATUS_LABEL[resume.parseStatus]?.() ?? resume.parseStatus}
          </Badge>
        ) : null}
      </div>

      {resume.parseStatus === "parsing" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {m.resumeUpload_parsingText()}{" "}
          <button type="button" className="underline" onClick={() => router.invalidate()}>
            {m.resumeUpload_refreshLabel()}
          </button>
        </p>
      ) : null}
      {resume.parseStatus === "failed" && resume.parseFailureReason ? (
        <p className="text-sm text-destructive">{resume.parseFailureReason}</p>
      ) : null}

      {resume.hasResumeOnFile && resume.file ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-3">
          <a href={resume.file.url} target="_blank" rel="noreferrer" className="text-sm underline">
            {m.resumeUpload_viewStoredResumeLink({
              size: formatBytes(resume.file.sizeBytes),
            })}
          </a>
          <Button
            variant="ghost"
            size="sm"
            data-test="resume-delete"
            disabled={status === "deleting" || status === "uploading"}
            onClick={async () => {
              setStatus("deleting");
              try {
                await deleteResume();
                await router.invalidate();
                setStatus("idle");
              } catch {
                setStatus("delete-error");
              }
            }}
          >
            {m.resumeUpload_deleteLabel()}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{m.resumeUpload_emptyText()}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,application/pdf"
        className="hidden"
        data-test="resume-file-input"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setStatus("uploading");
          const formData = new FormData();
          formData.append("resume", file);
          formData.append("keepResumeOnFile", String(keepOnFile));
          try {
            await uploadResume({ data: formData });
            await router.invalidate();
            setStatus("idle");
          } catch {
            setStatus("upload-error");
          }
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={status === "uploading" || status === "deleting"}
          onClick={() => inputRef.current?.click()}
        >
          {status === "uploading"
            ? m.resumeUpload_uploadingLabel()
            : resume.hasResumeOnFile
              ? m.resumeUpload_replaceLabel()
              : m.resumeUpload_uploadLabel()}
        </Button>
        <Label className="w-fit cursor-pointer">
          <Checkbox
            checked={keepOnFile}
            onCheckedChange={(checked) => setKeepOnFile(checked === true)}
          />
          {m.resumeUpload_keepCopyLabel()}
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">{m.resumeUpload_formatsText()}</p>
      {status === "upload-error" ? (
        <p className="text-xs text-destructive" role="alert">
          {m.resumeUpload_uploadError()}
        </p>
      ) : null}
      <CandidateActionFeedback state={status === "delete-error" ? "error" : "idle"} />
    </section>
  );
}
