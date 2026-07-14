"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextDisplay } from "./rich-text-editor";
import {
  htmlToPlainText,
  parseOtherTasksValue,
  serializeOtherTasks,
  taskHref,
  type CustomTask,
} from "@/lib/other-tasks";

type Props = {
  projectId: string;
  title: string;
  helper?: string;
  initialValue: string | null;
  // Read-only renders (snapshot / share view) skip the edit affordances.
  readOnly?: boolean;
  icon: React.ReactNode;
  // Bubble the saved value up so the parent can put it in the PDF / snapshot
  // without waiting for a server refresh.
  onPersistedChange?: (value: string | null) => void;
};

const emptyTask = (): CustomTask => ({ title: "", url: "", notes: "" });

// A list of custom tasks — each with a name, an optional link and optional
// notes. Stored as JSON in Project.otherTasks (see lib/other-tasks.ts), and
// rendered in the report and the PDF.
export function OtherTasksSection({
  projectId,
  title,
  helper,
  initialValue,
  readOnly = false,
  icon,
  onPersistedChange,
}: Props) {
  const [value, setValue] = useState<string | null>(initialValue);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomTask[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-anchor when the parent's value changes (e.g. after Save Report clears
  // the live fields) — but never while the user is mid-edit.
  useEffect(() => {
    if (editing) return;
    setValue(initialValue);
  }, [initialValue, editing]);

  const parsed = parseOtherTasksValue(value);
  const filled = parsed.tasks.length > 0 || !!parsed.legacyHtml;

  function startEdit() {
    const p = parseOtherTasksValue(value);
    if (p.tasks.length) {
      setDraft(p.tasks.map((t) => ({ ...t })));
    } else if (p.legacyHtml) {
      // Carry the old free-text blob into a first task so nothing is lost.
      setDraft([
        { title: "Notes", url: "", notes: htmlToPlainText(p.legacyHtml) },
      ]);
    } else {
      setDraft([emptyTask()]);
    }
    setEditing(true);
  }

  function update(i: number, patch: Partial<CustomTask>) {
    setDraft((d) => d.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = serializeOtherTasks(draft);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherTasks: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Could not save");
        return;
      }
      setValue(payload);
      onPersistedChange?.(payload);
      setEditing(false);
      toast.success("Saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  // Keep shared client reports clean.
  if (readOnly && !filled) return null;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {helper ? (
              <p className="text-xs text-muted-foreground">{helper}</p>
            ) : null}
          </div>
        </div>
        {!readOnly && !editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 print:hidden"
            onClick={startEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            {filled ? "Edit" : "Add"}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          {draft.map((t, i) => (
            <div key={i} className="space-y-2 rounded-md border bg-card/40 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={t.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Task name — e.g. Fixed broken canonicals on /pricing"
                  className="h-9"
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDraft((d) => d.filter((_, x) => x !== i))}
                  disabled={saving}
                  title="Remove task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={t.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value })}
                placeholder="Link (optional) — e.g. https://docs.google.com/spreadsheets/…"
                className="h-9"
                disabled={saving}
              />
              <Textarea
                value={t.notes ?? ""}
                onChange={(e) => update(i, { notes: e.target.value })}
                placeholder="Description / notes (optional)"
                rows={2}
                disabled={saving}
              />
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDraft((d) => [...d, emptyTask()])}
            disabled={saving}
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Button>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : parsed.tasks.length ? (
        <ul className="space-y-2.5">
          {parsed.tasks.map((t, i) => (
            <li key={i} className="rounded-md border bg-card/40 p-3">
              {t.title ? (
                <p className="text-sm font-medium">{t.title}</p>
              ) : null}
              {t.notes ? (
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {t.notes}
                </p>
              ) : null}
              {t.url ? (
                <a
                  href={taskHref(t.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 break-all text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {t.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : parsed.legacyHtml ? (
        <RichTextDisplay html={parsed.legacyHtml} />
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          Add tasks with a name, an optional link and notes — they&apos;ll show
          in the report and the PDF.
        </div>
      )}
    </Card>
  );
}
