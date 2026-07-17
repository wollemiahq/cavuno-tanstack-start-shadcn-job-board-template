'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { Sparkles, X } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceSkills } from '../server/account';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';

/**
 * Skills — a tag editor over the whole-set replace
 * (`board.me.profile.updateSkills`). Edits are local; one PUT on save.
 */
export function SkillsSection({ skills: initial }: { skills: string[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>(initial);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  const dirty =
    skills.length !== initial.length || skills.some((s, i) => s !== initial[i]);

  const add = () => {
    const name = input.trim();
    if (!name || skills.includes(name)) {
      setInput('');
      return;
    }
    setSkills([...skills, name]);
    setInput('');
  };

  return (
    <Card data-test="skills-section" id="skills">
      <CardHeader>
        <CardTitle>
          <h2>{m.skillsSection_heading()}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.length === 0 ? (
          <Empty className="border-0 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>{m.skillsSection_emptyText()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                render={<li />}
                className="h-6 gap-0.5 pr-0.5"
              >
                {skill}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={m.skillsSection_removeSkillAriaLabel({ skill })}
                  className="text-muted-foreground hover:text-foreground size-5 rounded-full"
                  onClick={() => setSkills(skills.filter((s) => s !== skill))}
                >
                  <X className="size-3.5" />
                </Button>
              </Badge>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={input}
            placeholder={m.skillsSection_addSkillLabel()}
            aria-label={m.skillsSection_addSkillLabel()}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={add}>
            {m.skillsSection_addLabel()}
          </Button>
        </div>
        {dirty ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setFeedback('idle');
              try {
                await replaceSkills({ data: { skills } });
                await router.invalidate();
              } catch {
                setFeedback('error');
              } finally {
                setPending(false);
              }
            }}
          >
            {pending
              ? m.skillsSection_savingLabel()
              : m.skillsSection_saveLabel()}
          </Button>
        ) : null}
        <CandidateActionFeedback state={feedback} />
      </CardContent>
    </Card>
  );
}
