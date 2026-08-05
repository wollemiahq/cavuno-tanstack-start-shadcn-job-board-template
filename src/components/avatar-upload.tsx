'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { initialsOf } from '../lib/initials';
import { m } from '../paraglide/messages';
import { uploadAvatar } from '../server/account';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/**
 * Avatar uploader — mirrors the hosted `profile-avatar-uploader`: pick a
 * file, POST it as multipart to the route-mediated upload, then refresh.
 * The SDK call is `board.me.profile.uploadAvatar(file)`.
 */
export function AvatarUpload({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={displayName ?? ''} />
        ) : null}
        <AvatarFallback>{initialsOf(displayName ?? '')}</AvatarFallback>
      </Avatar>
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          data-test="avatar-file-input"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setStatus('pending');
            const formData = new FormData();
            formData.append('avatar', file);
            try {
              await uploadAvatar({ data: formData });
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
            ? m.avatarUpload_uploadingLabel()
            : m.avatarUpload_changePhotoLabel()}
        </Button>
        <p className="text-muted-foreground text-xs">
          {m.avatarUpload_formatsText()}
        </p>
        {status === 'error' ? (
          <p className="text-destructive text-xs" role="status">
            {m.avatarUpload_uploadErrorText()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
