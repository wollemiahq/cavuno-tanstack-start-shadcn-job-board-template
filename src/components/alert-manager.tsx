"use client";

import { useId, useState } from "react";

import { useRouter } from "@tanstack/react-router";
import type { Alert, AlertBody } from "@cavuno/board";

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from "@/components/candidate-action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "../paraglide/messages";
import { createMyAlert, deleteMyAlert, updateMyAlert } from "../server/account";

const REMOTE_OPTIONS = ["on_site", "hybrid", "remote"] as const;
const REMOTE_LABEL: Record<string, () => string> = {
  on_site: m.alertManager_remoteOnSite,
  hybrid: m.alertManager_remoteHybrid,
  remote: m.alertManager_remoteRemote,
};

interface FormState {
  label: string;
  frequency: "daily" | "weekly";
  jobFunctions: string;
  remoteOptions: string[];
}

function toBody(form: FormState, initial: Alert | null): AlertBody {
  const jobFunctions = form.jobFunctions
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const filters = initial?.filters;
  return {
    ...(form.label.trim() ? { label: form.label.trim() } : {}),
    frequency: form.frequency,
    ...(jobFunctions.length ? { jobFunctions } : {}),
    ...(form.remoteOptions.length ? { remoteOptions: form.remoteOptions } : {}),
    // `update` is a whole-object PUT — round-trip the filters this simplified
    // UI doesn't edit (seniority / places / salary) so editing the label or
    // frequency doesn't silently wipe them.
    ...(filters?.seniorityLevels.length ? { seniorityLevels: filters.seniorityLevels } : {}),
    ...(filters?.placeIds.length ? { placeIds: filters.placeIds } : {}),
    ...(filters?.salaryMin != null ? { salaryMin: filters.salaryMin } : {}),
    ...(filters?.salaryMax != null ? { salaryMax: filters.salaryMax } : {}),
    ...(filters?.salaryCurrency != null ? { salaryCurrency: filters.salaryCurrency } : {}),
  };
}

function fromAlert(alert: Alert | null): FormState {
  return {
    label: alert?.label ?? "",
    frequency: alert?.frequency ?? "weekly",
    jobFunctions: alert?.filters.jobFunctions.join(", ") ?? "",
    remoteOptions: alert?.filters.remoteOptions ?? [],
  };
}

function AlertForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Alert | null;
  submitLabel: string;
  onSubmit: (body: AlertBody) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [form, setForm] = useState<FormState>(() => fromAlert(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  return (
    <form
      data-test="alert-form"
      className="space-y-3 rounded-2xl border border-border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("saving");
        try {
          await onSubmit(toBody(form, initial));
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>{m.alertManager_nameLabel()}</Label>
        <Input
          id={`${id}-name`}
          name="label"
          value={form.label}
          placeholder={m.alertManager_namePlaceholder()}
          onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-frequency`}>{m.alertManager_frequencyLabel()}</Label>
        <Select
          name="frequency"
          value={form.frequency}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              frequency: value as "daily" | "weekly",
            }))
          }
        >
          <SelectTrigger id={`${id}-frequency`} data-test="alert-frequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{m.alertManager_frequencyDaily()}</SelectItem>
            <SelectItem value="weekly">{m.alertManager_frequencyWeekly()}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-roles`}>{m.alertManager_rolesLabel()}</Label>
        <Input
          id={`${id}-roles`}
          name="jobFunctions"
          value={form.jobFunctions}
          placeholder={m.alertManager_rolesPlaceholder()}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              jobFunctions: event.target.value,
            }))
          }
        />
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{m.alertManager_remoteOptionsLegend()}</legend>
        <div className="flex flex-wrap gap-4">
          {REMOTE_OPTIONS.map((option) => {
            const optionId = `${id}-${option}`;
            return (
              <Label key={option} htmlFor={optionId} className="font-normal">
                <Checkbox
                  id={optionId}
                  name="remoteOptions"
                  value={option}
                  checked={form.remoteOptions.includes(option)}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      remoteOptions: checked
                        ? [...prev.remoteOptions, option]
                        : prev.remoteOptions.filter((value) => value !== option),
                    }))
                  }
                />
                {REMOTE_LABEL[option]()}
              </Label>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={status === "saving"}>
          {status === "saving" ? m.alertManager_savingLabel() : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {m.alertManager_cancelLabel()}
          </Button>
        ) : null}
      </div>
      <CandidateActionFeedback state={status === "error" ? "error" : "idle"} />
    </form>
  );
}

export function AlertManager({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CandidateActionFeedbackState>("idle");

  return (
    <div className="space-y-4" data-test="alert-manager">
      {alerts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {m.alertManager_emptyText()}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) =>
            editing === alert.id ? (
              <li key={alert.id}>
                <AlertForm
                  initial={alert}
                  submitLabel={m.alertManager_saveChangesLabel()}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => {
                    setFeedback("idle");
                    await updateMyAlert({ data: { id: alert.id, body } });
                    setEditing(null);
                    await router.invalidate();
                    setFeedback("success");
                  }}
                />
              </li>
            ) : (
              <li
                key={alert.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.label ?? m.alertManager_allNewJobsLabel()}</p>
                    <Badge>
                      {alert.frequency === "daily"
                        ? m.alertManager_frequencyDaily()
                        : m.alertManager_frequencyWeekly()}
                    </Badge>
                    {!alert.isActive ? (
                      <Badge variant="secondary">{m.alertManager_pausedBadge()}</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.filters.jobFunctions.length
                      ? alert.filters.jobFunctions.join(", ")
                      : m.alertManager_anyRoleText()}
                    {alert.filters.remoteOptions.length
                      ? ` · ${alert.filters.remoteOptions
                          .map((option) => REMOTE_LABEL[option]?.() ?? option)
                          .join(", ")}`
                      : ""}
                  </p>
                  {alert.lastSentAt ? (
                    <p className="text-xs text-muted-foreground">
                      {m.alertManager_lastSentText({
                        date: new Date(alert.lastSentAt).toLocaleDateString(),
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(alert.id)}>
                    {m.alertManager_editLabel()}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-test="alert-delete"
                    disabled={pendingDeleteId !== null}
                    onClick={async () => {
                      setPendingDeleteId(alert.id);
                      setFeedback("idle");
                      try {
                        await deleteMyAlert({ data: { id: alert.id } });
                        await router.invalidate();
                        setFeedback("success");
                      } catch {
                        setFeedback("error");
                      } finally {
                        setPendingDeleteId(null);
                      }
                    }}
                  >
                    {m.alertManager_deleteLabel()}
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <CandidateActionFeedback state={feedback} />

      {creating ? (
        <AlertForm
          initial={null}
          submitLabel={m.alertManager_createAlertLabel()}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            setFeedback("idle");
            await createMyAlert({ data: body });
            setCreating(false);
            await router.invalidate();
            setFeedback("success");
          }}
        />
      ) : (
        <Button variant="outline" data-test="alert-create" onClick={() => setCreating(true)}>
          {m.alertManager_newAlertLabel()}
        </Button>
      )}
    </div>
  );
}
