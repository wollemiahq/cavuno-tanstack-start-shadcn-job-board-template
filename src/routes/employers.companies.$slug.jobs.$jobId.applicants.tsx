import { useState } from 'react';

import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { employerJobStatusLabel } from '../lib/employer-job-labels';
import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  addApplicantNote,
  bulkRejectApplicants,
  createStage,
  getPipeline,
  moveApplicant,
  removeStage,
  renameStage,
} from '../server/employers';

import { Page, PageContent } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
} from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmployerApplicant, EmployerPipelineStage } from '@cavuno/board';

export const Route = createFileRoute(
  '/employers/companies/$slug/jobs/$jobId/applicants',
)({
  loader: async ({ params }) => {
    try {
      return await getPipeline({
        data: { slug: params.slug, job: params.jobId },
      });
    } catch (error) {
      handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/applicants`,
      );
    }
  },
  head: () => ({ meta: [{ title: m.employerApplicants_title() }] }),
  staticData: { ownsMain: true },
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { slug } = Route.useParams();
  const pipeline = Route.useLoaderData();
  const visibleStages = pipeline.stages.filter((stage) => !stage.hidden);

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {pipeline.job.title}
              </h1>
              <p className="text-muted-foreground text-sm">
                {employerJobStatusLabel(pipeline.job.status)} ·{' '}
                {pipeline.applicants.length === 1
                  ? m.employerApplicants_countOne({
                      count: pipeline.applicants.length,
                    })
                  : m.employerApplicants_countMany({
                      count: pipeline.applicants.length,
                    })}
              </p>
            </div>
            <Link
              to="/employers/companies/$slug"
              params={{ slug }}
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.employerApplicants_backToCompanyLabel()}
            </Link>
          </header>

          <section
            aria-labelledby="pipeline-stages-heading"
            className="space-y-4"
          >
            <h2
              id="pipeline-stages-heading"
              className="font-heading text-xl font-semibold"
            >
              {m.employerApplicants_stagesHeading()}
            </h2>
            <StageManager
              slug={slug}
              jobId={pipeline.job.id}
              stages={pipeline.stages}
            />
          </section>

          <hr className="border-border" />

          <section aria-labelledby="applicants-heading" className="space-y-4">
            <h2
              id="applicants-heading"
              className="font-heading text-xl font-semibold"
            >
              {m.employerApplicants_title()}
            </h2>
            {pipeline.applicants.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>
                    {m.employerApplicants_noApplicantsText()}
                  </EmptyTitle>
                  <EmptyDescription>
                    {m.employerApplicants_stagesHeading()}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-4">
                {pipeline.applicants.map((applicant) => (
                  <ApplicantRow
                    key={applicant.id}
                    slug={slug}
                    applicant={applicant}
                    stages={visibleStages}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </PageContent>
    </Page>
  );
}

function StageManager({
  slug,
  jobId,
  stages,
}: {
  slug: string;
  jobId: string;
  stages: EmployerPipelineStage[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [createState, setCreateState] = useState({
    pending: false,
    message: '',
  });

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    try {
      const result = await fn();
      if (!result.ok)
        return result.message ?? m.employerApplicants_genericError();
      await router.invalidate();
      return null;
    } catch {
      return m.employerApplicants_genericError();
    }
  }

  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <StagePill key={stage.id} slug={slug} stage={stage} onAct={act} />
          ))}
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!label.trim() || createState.pending) return;
            setCreateState({ pending: true, message: '' });
            const message = await act(() =>
              createStage({ data: { slug, jobId, label: label.trim() } }),
            );
            if (!message) setLabel('');
            setCreateState({ pending: false, message: message ?? '' });
          }}
        >
          <Field data-invalid={Boolean(createState.message)}>
            <InputGroup>
              <InputGroupInput
                value={label}
                aria-label={m.employerApplicants_newStagePlaceholder()}
                placeholder={m.employerApplicants_newStagePlaceholder()}
                onChange={(event) => setLabel(event.target.value)}
              />
              <InputGroupAddon align="inline-end" className="p-0">
                <InputGroupButton
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={createState.pending}
                >
                  {m.employerApplicants_addStageLabel()}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {createState.message ? (
              <FieldError>{createState.message}</FieldError>
            ) : null}
          </Field>
        </form>
      </CardContent>
    </Card>
  );
}

function StagePill({
  slug,
  stage,
  onAct,
}: {
  slug: string;
  stage: EmployerPipelineStage;
  onAct: (
    fn: () => Promise<{ ok: boolean; message?: string }>,
  ) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(stage.label);
  const [actionState, setActionState] = useState({
    pending: false,
    message: '',
  });

  if (editing) {
    return (
      <div className="space-y-2">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!label.trim() || actionState.pending) return;
            setActionState({ pending: true, message: '' });
            const message = await onAct(() =>
              renameStage({
                data: { slug, stageId: stage.id, label: label.trim() },
              }),
            );
            setActionState({ pending: false, message: message ?? '' });
            if (!message) setEditing(false);
          }}
        >
          <InputGroup className="w-48">
            <InputGroupInput
              value={label}
              aria-label={stage.label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <InputGroupAddon align="inline-end" className="p-0">
              <InputGroupButton
                type="submit"
                size="sm"
                disabled={actionState.pending}
              >
                {m.employerApplicants_saveLabel()}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        {actionState.message ? (
          <Alert variant="destructive">
            <AlertDescription>{actionState.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ButtonGroup aria-label={stage.label}>
        <ButtonGroupText>
          {stage.label}
          {stage.isProtected ? (
            <Badge variant="secondary">
              {m.employerApplicants_systemBadge()}
            </Badge>
          ) : null}
        </ButtonGroupText>
        {!stage.isProtected ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${m.employerApplicants_editLabel()} ${stage.label}`}
              disabled={actionState.pending}
              onClick={() => {
                setActionState({ pending: false, message: '' });
                setEditing(true);
              }}
            >
              <PencilIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${m.employerCompany_deleteLabel()} ${stage.label}`}
              disabled={actionState.pending}
              onClick={async () => {
                if (actionState.pending) return;
                setActionState({ pending: true, message: '' });
                const message = await onAct(() =>
                  removeStage({ data: { slug, stageId: stage.id } }),
                );
                setActionState({ pending: false, message: message ?? '' });
              }}
            >
              <Trash2Icon />
            </Button>
          </>
        ) : null}
      </ButtonGroup>
      {actionState.message ? (
        <Alert variant="destructive">
          <AlertDescription>{actionState.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ApplicantRow({
  slug,
  applicant,
  stages,
}: {
  slug: string;
  applicant: EmployerApplicant;
  stages: EmployerPipelineStage[];
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [actionState, setActionState] = useState<{
    scope: 'applicant' | 'note' | null;
    pending: boolean;
    message: string;
  }>({ scope: null, pending: false, message: '' });
  const currentStageId =
    stages.find((stage) => (stage.systemStage ?? stage.id) === applicant.stage)
      ?.id ?? '';
  const selectedStage = currentStageId || '__current__';
  const stageItems = Object.fromEntries<string>([
    ...(currentStageId
      ? []
      : ([['__current__', applicant.stage]] as [string, string][])),
    ...stages.map((stage): [string, string] => [stage.id, stage.label]),
  ]);

  const stageLabel = (token: string | null) => {
    if (!token) return '—';
    const match = stages.find(
      (stage) => stage.id === token || stage.systemStage === token,
    );
    return match?.label ?? token;
  };

  async function act(
    scope: 'applicant' | 'note',
    fn: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    if (actionState.pending) return false;
    setActionState({ scope, pending: true, message: '' });
    try {
      const result = await fn();
      if (!result.ok) {
        setActionState({
          scope,
          pending: false,
          message: result.message ?? m.employerApplicants_genericError(),
        });
        return false;
      }
      await router.invalidate();
      setActionState({ scope: null, pending: false, message: '' });
      return true;
    } catch {
      setActionState({
        scope,
        pending: false,
        message: m.employerApplicants_genericError(),
      });
      return false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {applicant.candidateName ??
                applicant.candidateEmail ??
                m.employerApplicants_applicantFallbackName()}
            </CardTitle>
            {applicant.candidateEmail ? (
              <p className="text-muted-foreground text-sm">
                {applicant.candidateEmail}
              </p>
            ) : null}
            {applicant.candidateHeadline ? (
              <p className="text-muted-foreground text-sm">
                {applicant.candidateHeadline}
              </p>
            ) : null}
          </div>
          {applicant.resumeUrl ? (
            <a
              href={applicant.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {m.employerApplicants_resumeLabel()}
              <ExternalLinkIcon data-icon="inline-end" />
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {applicant.coverNote ? (
          <p className="text-sm">{applicant.coverNote}</p>
        ) : null}

        <Field orientation="responsive">
          <FieldLabel htmlFor={`applicant-stage-${applicant.id}`}>
            {m.employerApplicants_stageLabel()}
          </FieldLabel>
          <Select
            items={stageItems}
            value={selectedStage}
            disabled={actionState.pending}
            onValueChange={(value) => {
              if (!value || value === '__current__') return;
              void act('applicant', () =>
                moveApplicant({
                  data: {
                    slug,
                    applicationId: applicant.id,
                    stageId: value,
                  },
                }),
              );
            }}
          >
            <SelectTrigger
              id={`applicant-stage-${applicant.id}`}
              aria-label={m.employerApplicants_stageLabel()}
              className="w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stageItems).map(([id, label]) => (
                <SelectItem key={id} value={id} disabled={id === '__current__'}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={actionState.pending}
            onClick={() =>
              act('applicant', () =>
                bulkRejectApplicants({
                  data: { slug, applicationIds: [applicant.id] },
                }),
              )
            }
          >
            {m.employerApplicants_rejectLabel()}
          </Button>
        </Field>
        {actionState.scope === 'applicant' && actionState.message ? (
          <div data-applicant-action-feedback>
            <Alert variant="destructive">
              <AlertDescription>{actionState.message}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!note.trim()) return;
            const succeeded = await act('note', () =>
              addApplicantNote({
                data: { slug, applicationId: applicant.id, body: note.trim() },
              }),
            );
            if (succeeded) setNote('');
          }}
        >
          <Field
            data-applicant-note-field
            data-invalid={
              actionState.scope === 'note' && Boolean(actionState.message)
            }
          >
            <InputGroup>
              <InputGroupInput
                value={note}
                aria-label={m.employerApplicants_notePlaceholder()}
                placeholder={m.employerApplicants_notePlaceholder()}
                onChange={(event) => setNote(event.target.value)}
              />
              <InputGroupAddon align="inline-end" className="p-0">
                <InputGroupButton
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={actionState.pending}
                >
                  {m.employerApplicants_noteLabel()}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {actionState.scope === 'note' && actionState.message ? (
              <FieldError>{actionState.message}</FieldError>
            ) : null}
          </Field>
        </form>

        {applicant.timeline.length > 0 ? (
          <ItemGroup>
            {applicant.timeline.slice(0, 5).map((entry) => (
              <Item key={entry.id} role="listitem" size="xs" variant="muted">
                <ItemContent>
                  <ItemDescription>
                    {entry.type === 'note_created' && entry.noteBody
                      ? m.employerApplicants_timelineNote({
                          note: entry.noteBody,
                        })
                      : entry.type === 'stage_changed'
                        ? m.employerApplicants_timelineMoved({
                            from: stageLabel(entry.fromStage),
                            to: stageLabel(entry.toStage),
                          })
                        : entry.type}
                    {entry.actorName ? ` · ${entry.actorName}` : ''}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        ) : null}
      </CardContent>
    </Card>
  );
}
