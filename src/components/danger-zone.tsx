'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Text } from '@/components/text'
import { m } from '../paraglide/messages'
import { deleteAccount } from '../server/account'
import { signOut } from '../server/auth'

const CONFIRM_WORD = 'DELETE'

/**
 * Danger zone — irreversible account delete (`board.me.delete()`). This is
 * ahead-of-hosted (no hosted candidate delete UI); the typed confirmation
 * guards against accidents. On success we clear the session and go home.
 */
export function DangerZone() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  return (
    <section
      className="border-error/40 space-y-3 rounded-lg border p-4"
      data-test="danger-zone"
    >
      <div>
        <Text as="h2" variant="heading4" className="text-error-primary">{m.dangerZone_heading()}</Text>
        <p className="text-tertiary text-sm">
          {m.dangerZone_warningText()}
        </p>
      </div>

      {open ? (
        <div className="space-y-2">
          <Input
            label={m.dangerZone_confirmLabel({ word: CONFIRM_WORD })}
            value={confirm}
            autoComplete="off"
            onChange={(value) => setConfirm(value)}
          />
          <div className="flex gap-2">
            <Button
              color="primary-destructive"
              isDisabled={confirm !== CONFIRM_WORD || status === 'deleting'}
              onClick={async () => {
                setStatus('deleting')
                try {
                  await deleteAccount()
                  await signOut()
                  await router.invalidate()
                  await router.navigate({ to: '/' })
                } catch {
                  setStatus('error')
                }
              }}
            >
              {status === 'deleting' ? m.dangerZone_deletingLabel() : m.dangerZone_deleteConfirmLabel()}
            </Button>
            <Button
              color="tertiary"
              isDisabled={status === 'deleting'}
              onClick={() => {
                setOpen(false)
                setConfirm('')
                setStatus('idle')
              }}
            >
              {m.dangerZone_cancelLabel()}
            </Button>
          </div>
          {status === 'error' ? (
            <p className="text-error-primary text-sm" role="status">
              {m.dangerZone_deleteError()}
            </p>
          ) : null}
        </div>
      ) : (
        <Button color="primary-destructive" onClick={() => setOpen(true)}>
          {m.dangerZone_deleteAccountLabel()}
        </Button>
      )}
    </section>
  )
}
