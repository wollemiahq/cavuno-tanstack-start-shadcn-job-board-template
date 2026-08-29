import { useState } from 'react';

import { m } from '../../paraglide/messages';

import { saveSourcedCandidate } from '@/server/employers';
import { Button } from '@/components/ui/button';

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

  if (jobs.length === 0) return null;

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!jobId) return;
        setPending(true);
        void saveSourcedCandidate({
          data: { slug, job: jobId, candidateBoardUserId },
        })
          .then((result) => {
            if (result.ok) setSaved(true);
          })
          .finally(() => setPending(false));
      }}
    >
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
      <Button type="submit" size="sm" disabled={pending || saved}>
        {saved ? m.talentSave_savedLabel() : m.talentSave_saveLabel()}
      </Button>
    </form>
  );
}
