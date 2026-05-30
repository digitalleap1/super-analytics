"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  // Stable identifier for the section, e.g. "analysisNotes" / "otherTasks".
  fieldKey: "analysisNotes" | "otherTasks";
  projectId: string;
  title: string;
  helper?: string;
  placeholder: string;
  initialValue: string | null;
  // Read-only renders (snapshot / share view) skip the edit affordances.
  readOnly?: boolean;
  // Icon for the section header.
  icon: React.ReactNode;
};

// Free-text section the user fills in (e.g. "Analysis", "Other tasks").
// - Click "Edit" → textarea with Save/Cancel
// - Empty state renders a friendly placeholder so the section never looks broken
// - Save persists to PATCH /api/projects/[id]
// - Hidden entirely in read-only / snapshot mode when there's no content
export function EditableTextSection({
  fieldKey,
  projectId,
  title,
  helper,
  placeholder,
  initialValue,
  readOnly = false,
  icon,
}: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      // Autofocus + select end of text
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      });
    }
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldKey]: draft.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Could not save");
        return;
      }
      setValue(draft);
      setEditing(false);
      toast.success("Saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  // In snapshot/read-only mode, skip rendering if there's no content. Keeps
  // shared reports clean.
  if (readOnly && !value.trim()) return null;

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
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {value ? "Edit" : "Add"}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="min-h-[140px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={saving}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
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
      ) : value ? (
        <div
          className={cn(
            "whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed",
          )}
        >
          {value}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          {placeholder}
        </div>
      )}
    </Card>
  );
}
