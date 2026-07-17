'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { X } from 'lucide-react';

import { m } from '../paraglide/messages';
import { replaceLanguages } from '../server/account';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Language = { name: string; proficiency: string };

const LEVELS = [
  m.languagesSection_levelNative,
  m.languagesSection_levelFluent,
  m.languagesSection_levelProfessional,
  m.languagesSection_levelConversational,
  m.languagesSection_levelBasic,
];

/**
 * Languages — name + proficiency rows over the whole-set replace
 * (`board.me.profile.updateLanguages`). Proficiency is a free string on the
 * API; the select offers the five common levels and keeps any previously
 * stored custom value selectable so an edit round-trip cannot lose it.
 */
export function LanguagesSection({
  languages: initial,
}: {
  languages: Language[];
}) {
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>(initial);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  const dirty = JSON.stringify(languages) !== JSON.stringify(initial);
  const valid = languages.every((l) => l.name.trim() && l.proficiency.trim());

  const update = (index: number, patch: Partial<Language>) =>
    setLanguages(
      languages.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  const levelLabels: string[] = LEVELS.map((level) => level());

  return (
    <Card data-test="languages-section" id="languages">
      <CardHeader>
        <CardTitle>
          <h2>{m.languagesSection_heading()}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {languages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {m.languagesSection_emptyText()}
          </p>
        ) : (
          <ul className="space-y-2">
            {languages.map((language, index) => {
              const levels = levelLabels.includes(language.proficiency)
                ? levelLabels
                : language.proficiency
                  ? [language.proficiency, ...levelLabels]
                  : levelLabels;
              return (
                <li key={index} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={language.name}
                    placeholder={m.languagesSection_languageLabel()}
                    aria-label={m.languagesSection_languageLabel()}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                  <Select
                    items={levels.map((level) => ({
                      label: level,
                      value: level,
                    }))}
                    value={language.proficiency || null}
                    onValueChange={(proficiency) =>
                      update(index, {
                        proficiency: (proficiency as string | null) ?? '',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={m.languagesSection_proficiencyLabel()}
                      className="flex-1"
                    >
                      <SelectValue
                        placeholder={m.languagesSection_proficiencyLabel()}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={m.languagesSection_removeLanguageAriaLabel()}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() =>
                      setLanguages(languages.filter((_, i) => i !== index))
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLanguages([...languages, { name: '', proficiency: '' }])
            }
          >
            {m.languagesSection_addLabel()}
          </Button>
          {dirty ? (
            <Button
              size="sm"
              disabled={pending || !valid}
              onClick={async () => {
                setPending(true);
                setFeedback('idle');
                try {
                  await replaceLanguages({ data: { languages } });
                  await router.invalidate();
                } catch {
                  setFeedback('error');
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending
                ? m.languagesSection_savingLabel()
                : m.languagesSection_saveLabel()}
            </Button>
          ) : null}
        </div>
        <CandidateActionFeedback state={feedback} />
      </CardContent>
    </Card>
  );
}
