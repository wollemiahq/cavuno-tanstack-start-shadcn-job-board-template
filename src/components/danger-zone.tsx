"use client";

import { useState } from "react";

import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "../paraglide/messages";
import { deleteAccount } from "../server/account";
import { signOut } from "../server/auth";

const CONFIRM_WORD = "DELETE";

/**
 * Danger zone — irreversible account delete (`board.me.delete()`). This is
 * ahead-of-hosted (no hosted candidate delete UI); the typed confirmation
 * guards against accidents. On success we clear the session and go home.
 */
export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");

  return (
    <section
      className="space-y-3 rounded-2xl p-4 ring-1 ring-destructive/40"
      data-test="danger-zone"
    >
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-destructive">
          {m.dangerZone_heading()}
        </h2>
        <p className="text-sm text-muted-foreground">{m.dangerZone_warningText()}</p>
      </div>

      {open ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="delete-account-confirmation">
              {m.dangerZone_confirmLabel({ word: CONFIRM_WORD })}
            </Label>
            <Input
              id="delete-account-confirmation"
              value={confirm}
              autoComplete="off"
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={confirm !== CONFIRM_WORD || status === "deleting"}
              onClick={async () => {
                setStatus("deleting");
                try {
                  await deleteAccount();
                  await signOut();
                  await router.invalidate();
                  await router.navigate({ to: "/" });
                } catch {
                  setStatus("error");
                }
              }}
            >
              {status === "deleting"
                ? m.dangerZone_deletingLabel()
                : m.dangerZone_deleteConfirmLabel()}
            </Button>
            <Button
              variant="ghost"
              disabled={status === "deleting"}
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setStatus("idle");
              }}
            >
              {m.dangerZone_cancelLabel()}
            </Button>
          </div>
          {status === "error" ? (
            <p className="text-sm text-destructive" role="status">
              {m.dangerZone_deleteError()}
            </p>
          ) : null}
        </div>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {m.dangerZone_deleteAccountLabel()}
        </Button>
      )}
    </section>
  );
}
