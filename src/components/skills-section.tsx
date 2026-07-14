"use client";

import { useState } from "react";

import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from "@/components/candidate-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "../paraglide/messages";
import { replaceSkills } from "../server/account";

/**
 * Skills — a tag editor over the whole-set replace
 * (`board.me.profile.updateSkills`). Edits are local; one PUT on save.
 */
export function SkillsSection({ skills: initial }: { skills: string[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<CandidateActionFeedbackState>("idle");

  const dirty = skills.length !== initial.length || skills.some((s, i) => s !== initial[i]);

  const add = () => {
    const name = input.trim();
    if (!name || skills.includes(name)) {
      setInput("");
      return;
    }
    setSkills([...skills, name]);
    setInput("");
  };

  return (
    <section className="space-y-3" data-test="skills-section">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {m.skillsSection_heading()}
      </h2>
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.skillsSection_emptyText()}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li
              key={skill}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
            >
              {skill}
              <button
                type="button"
                aria-label={m.skillsSection_removeSkillAriaLabel({ skill })}
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setSkills(skills.filter((s) => s !== skill))}
              >
                <X className="size-3.5" />
              </button>
            </li>
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
            if (e.key === "Enter") {
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
            setFeedback("idle");
            try {
              await replaceSkills({ data: { skills } });
              await router.invalidate();
              setFeedback("success");
            } catch {
              setFeedback("error");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? m.skillsSection_savingLabel() : m.skillsSection_saveLabel()}
        </Button>
      ) : null}
      <CandidateActionFeedback state={feedback} />
    </section>
  );
}
