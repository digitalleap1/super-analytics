"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  FolderPlus,
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
  type TaskGroup,
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
const emptyGroup = (): TaskGroup => ({ title: "", tasks: [emptyTask()] });

// Two-level "Other tasks": categories (e.g. "On-Page Tasks") each holding
// multiple tasks (name + optional link + notes). Stored as JSON in
// Project.otherTasks — see lib/other-tasks.ts.
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
  const [draft, setDraft] = useState<TaskGroup[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-anchor when the parent's value changes — but never mid-edit.
  useEffect(() => {
    if (editing) return;
    setValue(initialValue);
  }, [initialValue, editing]);

  const parsed = parseOtherTasksValue(value);
  const filled = parsed.groups.length > 0 || !!parsed.legacyHtml;

  function startEdit() {
    const p = parseOtherTasksValue(value);
    if (p.groups.length) {
      setDraft(p.groups.map((g) => ({ ...g, tasks: g.tasks.map((t) => ({ ...t })) })));
    } else if (p.legacyHtml) {
      // Carry the old free-text blob in so nothing is lost.
      setDraft([
        {
          title: "Notes",
          tasks: [
            { title: "", url: "", notes: htmlToPlainText(p.legacyHtml) },
          ],
        },
      ]);
    } else {
      setDraft([emptyGroup()]);
    }
    setEditing(true);
  }

  function setGroup(gi: number, patch: Partial<TaskGroup>) {
    setDraft((d) => d.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }

  function setTask(gi: number, ti: number, patch: Partial<CustomTask>) {
    setDraft((d) =>
      d.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              tasks: g.tasks.map((t, j) => (j === ti ? { ...t, ...patch } : t)),
            },
      ),
    );
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
        <div className="space-y-4">
          {draft.map((g, gi) => (
            <div key={gi} className="rounded-lg border bg-muted/20 p-3">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <Input
                  value={g.title}
                  onChange={(e) => setGroup(gi, { title: e.target.value })}
                  placeholder="Category — e.g. On-Page Tasks"
                  className="h-9 font-medium"
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDraft((d) => d.filter((_, i) => i !== gi))}
                  disabled={saving}
                  title="Remove category"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Tasks inside this category */}
              <div className="mt-2.5 space-y-2 border-l-2 border-primary/20 pl-3">
                {g.tasks.map((t, ti) => (
                  <div
                    key={ti}
                    className="space-y-2 rounded-md border bg-card p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={t.title}
                        onChange={(e) =>
                          setTask(gi, ti, { title: e.target.value })
                        }
                        placeholder="Task name — e.g. Keyword Ranking"
                        className="h-8"
                        disabled={saving}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDraft((d) =>
                            d.map((gr, i) =>
                              i !== gi
                                ? gr
                                : {
                                    ...gr,
                                    tasks: gr.tasks.filter((_, j) => j !== ti),
                                  },
                            ),
                          )
                        }
                        disabled={saving}
                        title="Remove task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={t.url ?? ""}
                      onChange={(e) => setTask(gi, ti, { url: e.target.value })}
                      placeholder="Link (optional)"
                      className="h-8"
                      disabled={saving}
                    />
                    <Textarea
                      value={t.notes ?? ""}
                      onChange={(e) =>
                        setTask(gi, ti, { notes: e.target.value })
                      }
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
                  onClick={() =>
                    setDraft((d) =>
                      d.map((gr, i) =>
                        i !== gi ? gr : { ...gr, tasks: [...gr.tasks, emptyTask()] },
                      ),
                    )
                  }
                  disabled={saving}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDraft((d) => [...d, emptyGroup()])}
            disabled={saving}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Add category
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
      ) : parsed.groups.length ? (
        <div className="space-y-4">
          {parsed.groups.map((g, gi) => (
            <div key={gi}>
              {g.title ? (
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  {g.title}
                </h4>
              ) : null}
              <ul className="space-y-2 border-l-2 border-primary/20 pl-3">
                {g.tasks.map((t, ti) => (
                  <li key={ti} className="rounded-md border bg-card/40 p-2.5">
                    {t.title ? (
                      <p className="text-sm font-medium">{t.title}</p>
                    ) : null}
                    {t.notes ? (
                      <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
                        {t.notes}
                      </p>
                    ) : null}
                    {t.url ? (
                      <a
                        href={taskHref(t.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 break-all text-xs font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {t.url}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : parsed.legacyHtml ? (
        <RichTextDisplay html={parsed.legacyHtml} />
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          Create a category (e.g. On-Page Tasks) and add tasks under it — each
          with a name, an optional link and notes. They&apos;ll show in the
          report and the PDF.
        </div>
      )}
    </Card>
  );
}
