"use client";

import { useRef, useState } from "react";

import { useRouter } from "@tanstack/react-router";

import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { initialsOf } from "../lib/initials";
import { m } from "../paraglide/messages";
import { uploadAvatar } from "../server/account";

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
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  return (
    <div className="flex items-center gap-4">
      <Avatar size="xl" src={avatarUrl} initials={initialsOf(displayName ?? "")} alt={displayName ?? ""} />
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-test="avatar-file-input"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setStatus("pending");
            const formData = new FormData();
            formData.append("avatar", file);
            try {
              await uploadAvatar({ data: formData });
              await router.invalidate();
              setStatus("idle");
            } catch {
              setStatus("error");
            }
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button
          color="secondary"
          size="sm"
          isDisabled={status === "pending"}
          onClick={() => inputRef.current?.click()}
        >
          {status === "pending"
            ? m.avatarUpload_uploadingLabel()
            : m.avatarUpload_changePhotoLabel()}
        </Button>
        <p className="text-tertiary text-xs">{m.avatarUpload_formatsText()}</p>
        {status === "error" ? (
          <p className="text-error-primary text-xs" role="status">
            {m.avatarUpload_uploadErrorText()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
