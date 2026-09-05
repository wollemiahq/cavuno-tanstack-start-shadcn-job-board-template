/**
 * The multipart body `uploadApplicationResume` (src/server/applications.ts)
 * validates: a `jobSlug` and the `resume` file. Built here so every apply
 * surface posts the same field names.
 */
export function applicationResumeFormData(
  jobSlug: string,
  file: File,
): FormData {
  const body = new FormData();
  body.set('jobSlug', jobSlug);
  body.set('resume', file);
  return body;
}
