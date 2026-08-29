import { useEffect, useState } from 'react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import { toastActionError } from '@/lib/action-toast';
import { saveSourcedCandidate } from '@/server/employers';

export function TalentSaveToJob({
  slug,
  jobs,
  candidateBoardUserId,
}: {
  slug: string;
  jobs: Array<{ id: string; title: string }>;
  candidateBoardUserId: string;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [jobId]);

  if (jobs.length === 0) return null;
  const oneClick = jobs.length === 1;

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!jobId) return;
        setPending(true);
        void saveSourcedCandidate({
          data: { slug, job: jobId, candidateBoardUserId },
        })
          .then((result) => {
            if (result.ok) {
              setSaved(true);
              return;
            }
            void toastActionError(result.message);
          })
          .catch(() => {
            void toastActionError();
          })
          .finally(() => setPending(false));
      }}
    >
      {oneClick ? null : (
        <select
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
          aria-label={m.talentSave_jobLabel()}
        >
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      )}
      <Button type="submit" size="sm" disabled={pending || saved}>
        {saved ? m.talentSave_savedLabel() : m.talentSave_saveLabel()}
      </Button>
    </form>
  );
}
