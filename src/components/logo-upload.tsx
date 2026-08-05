'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { uploadCompanyLogo } from '../server/employers';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Button } from '@/components/ui/button';

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
}: {
  slug: string;
  logoUrl: string | null;
  companyName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');

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
              await uploadCompanyLogo({ data: formData });
              await router.invalidate();
              setStatus('idle');
            } catch {
              setStatus('error');
            }
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={status === 'pending'}
          onClick={() => inputRef.current?.click()}
        >
          {status === 'pending'
            ? m.logoUpload_uploadingLabel()
            : m.logoUpload_changeLogoLabel()}
        </Button>
        {status === 'error' ? (
          <p className="text-destructive text-xs" role="status">
            {m.logoUpload_uploadErrorText()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
