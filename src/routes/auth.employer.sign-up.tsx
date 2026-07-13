import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'

import { RheaRegistrationPage } from '@/components/rhea-auth-pilot'
import { buttonVariants } from '@/components/ui/button'
import { m } from '../paraglide/messages'
import { signUpEmployer } from '../server/auth'
import { getBoardContext } from '../server/queries'

export const Route = createFileRoute('/auth/employer/sign-up')({
  loader: async () => {
    const board = await getBoardContext()
    if (!board.features.employers) throw notFound()
    return { boardName: board.name }
  },
  head: () => ({ meta: [{ title: m.authEmployerSignUp_title() }] }),
  component: EmployerSignUpPage,
  notFoundComponent: () => (
    <div className="rhea-theme">
      <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        {m.authEmployerSignUp_notAvailableText()}
      </p>
    </div>
  ),
})

function EmployerSignUpPage() {
  const router = useRouter()
  const { boardName } = Route.useLoaderData()

  return (
    <RheaRegistrationPage
      title={m.authEmployerSignUp_cardTitle({ boardName })}
      supportingText={m.authEmployerSignUp_supportingText()}
      copy={{
        nameLabel: m.authEmployerSignUp_nameLabel(),
        emailLabel: m.authEmployerSignUp_workEmailLabel(),
        passwordLabel: m.authEmployerSignUp_passwordLabel(),
        submitLabel: m.authEmployerSignUp_submitLabel(),
        pendingLabel: m.authEmployerSignUp_creatingAccountLabel(),
        successTitle: m.authEmployerSignUp_checkEmailTitle(),
        successText: m.authEmployerSignUp_checkEmailBody(),
        successActionLabel: m.authEmployerSignUp_goToDashboardLabel(),
      }}
      successHref="/employers/dashboard"
      onSubmit={async (values) => {
        const result = await signUpEmployer({ data: values })
        if (result.ok) await router.invalidate()
        return result
      }}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {m.authEmployerSignUp_lookingForWorkText()}{' '}
          <Link
            to="/auth/sign-up"
            className={buttonVariants({ variant: 'link', size: 'sm' })}
          >
            {m.authEmployerSignUp_joinAsCandidateLink()}
          </Link>
        </p>
      }
    />
  )
}
