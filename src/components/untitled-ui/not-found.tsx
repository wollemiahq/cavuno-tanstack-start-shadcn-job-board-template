/**
 * Default 404 (the CAV-480 pilot surface): previously TanStack's bare
 * built-in. Copy resolves through the Paraglide seam (starter-local
 * `notFound_*` keys); the CTA is the Untitled UI Button in a documented
 * variant, navigating client-side through the router seam.
 */
import { Button } from '@/components/base/buttons/button'
import { Text } from '@/components/text'
import * as m from '@/paraglide/messages'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <Text as="h1" variant="heading1">
        {m.notFound_heading()}
      </Text>
      <p className="text-tertiary">{m.notFound_body()}</p>
      <Button href="/" color="primary" size="lg">
        {m.notFound_browseJobsLink()}
      </Button>
    </div>
  )
}
