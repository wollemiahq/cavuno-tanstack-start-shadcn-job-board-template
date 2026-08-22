'use client';

import { useState } from 'react';

import { Upload } from 'lucide-react';

import { m } from '../paraglide/messages';

import { ResumeUpload } from '@/components/resume-upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Resume } from '@cavuno/board';

/**
 * "Import resume" page-header action: the resume pipeline (upload → parse →
 * keep-on-file) lives in a dialog instead of a page section — mirroring the
 * hosted board's resume upload modal.
 */
export function ResumeImportDialog({
  resume,
  triggerLabel,
}: {
  resume: Resume;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload aria-hidden data-icon="inline-start" />
        {triggerLabel ?? m.resumeImport_triggerLabel()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.resumeImport_title()}</DialogTitle>
          <DialogDescription>{m.resumeImport_description()}</DialogDescription>
        </DialogHeader>
        <ResumeUpload resume={resume} variant="embedded" />
      </DialogContent>
    </Dialog>
  );
}
