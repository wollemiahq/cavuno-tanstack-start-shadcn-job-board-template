'use client';

import { CheckCircle2, Circle } from 'lucide-react';

import { m } from '../paraglide/messages';

import { ResumeUpload } from '@/components/resume-upload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Resume } from '@cavuno/board';

export type ProfileChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  /** Anchor of the section that completes the item (e.g. `#experience`). */
  href?: string;
};

/**
 * Profile-completeness rail card: one progress read-out over the checklist of
 * profile parts, with the resume uploader embedded — "complete your profile by
 * uploading your resume or filling it out". The caller derives the checklist
 * from the account loader data; this stays pure presentation.
 */
export function ProfileCompletenessCard({
  items,
  resume,
}: {
  items: ProfileChecklistItem[];
  resume: Resume;
}) {
  const done = items.filter((item) => item.done).length;
  const percent =
    items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  return (
    <Card data-test="profile-completeness">
      <CardHeader>
        <CardTitle>
          <h2>{m.profileCompleteness_title()}</h2>
        </CardTitle>
        <CardDescription>{m.profileCompleteness_introText()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Progress
            value={percent}
            aria-label={m.profileCompleteness_regionLabel()}
          />
          <p className="text-muted-foreground text-xs">
            {m.profileCompleteness_percentText({ percent })}
          </p>
        </div>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 aria-hidden className="text-primary size-4" />
              ) : (
                <Circle
                  aria-hidden
                  className="text-muted-foreground/50 size-4"
                />
              )}
              {item.done || !item.href ? (
                <span className={cn(item.done && 'text-muted-foreground')}>
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="underline-offset-4 hover:underline"
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
        <Separator />
        <ResumeUpload resume={resume} variant="embedded" />
      </CardContent>
    </Card>
  );
}
