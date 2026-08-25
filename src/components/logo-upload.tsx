'use client';

import { useRef, useState } from 'react';

import { m } from '../paraglide/messages';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Button } from '@/components/ui/button';

export type LogoUploadActions = {
  uploadCompanyLogo: (
    ...args: Parameters<typeof import('../server/employers').uploadCompanyLogo>
  ) => ReturnType<typeof import('../server/employers').uploadCompanyLogo>;
  invalidate: () => Promise<void>;
};

/**
 * Company-logo uploader — mirrors the candidate `AvatarUpload` mechanism: pick a
 * file, POST it as multipart (`slug` + `logo`) to the route-mediated upload, then
 * refresh so the new `logoUrl` repaints. The SDK call behind the server function
 * is `board.me.companies.uploadLogo(slug, file)`.
 */
export function LogoUpload({
  slug,
  logoUrl,
  companyName,
  actions,
}: {
  slug: string;
  logoUrl: string | null;
  companyName: string;
  actions: LogoUploadActions;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'upload_error' | 'reconciliation_error'
  >('idle');

  return (
    <div className="flex items-center gap-4">
      <EmployerIdentityAvatar name={companyName} logoUrl={logoUrl} size="lg" />
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          data-test="logo-file-input"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setStatus('pending');
            const formData = new FormData();
            formData.append('slug', slug);
            formData.append('logo', file);
            try {
              await actions.uploadCompanyLogo({ data: formData });
            } catch {
              setStatus('upload_error');
              if (inputRef.current) inputRef.current.value = '';
              return;
            }
            try {
              await actions.invalidate();
              setStatus('idle');
            } catch {
              setStatus('reconciliation_error');
            }
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={status === 'pending' || status === 'reconciliation_error'}
          onClick={() => inputRef.current?.click()}
        >
          {status === 'pending'
            ? m.logoUpload_uploadingLabel()
            : m.logoUpload_changeLogoLabel()}
        </Button>
        {status === 'upload_error' || status === 'reconciliation_error' ? (
          <p className="text-destructive text-xs" role="status">
            {status === 'upload_error'
              ? m.logoUpload_uploadErrorText()
              : m.employerCompany_reconciliationError()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
