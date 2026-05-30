"use client";

import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RichTextDisplay, RichTextEditor } from "./rich-text-editor";

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

function hasContent(html: string): boolean {
  // TipTap empty doc is "<p></p>" — treat as no content.
  const stripped = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length > 0;
}

// Free-text section the user fills in (e.g. "Analysis", "Other tasks").
// - Edit mode: rich-text editor (bold, italic, lists, quote)
// - Read mode: rendered HTML
// - Saves via PATCH /api/projects/[id]
// - Hidden entirely in read-only / snapshot mode when empty
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

  async function save() {
    setSaving(true);
    try {
      const payload = hasContent(draft) ? draft : null;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldKey]: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Could not save");
        return;
      }
      setValue(payload ?? "");
      setEditing(false);
      toast.success("Saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const filled = hasContent(value);

  // Hide entirely in snapshot/share view when empty — keeps shared client
  // reports clean.
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
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {filled ? "Edit" : "Add"}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <RichTextEditor
            value={draft}
            onChange={setDraft}
            placeholder={placeholder}
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
      ) : filled ? (
        <RichTextDisplay html={value} />
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          {placeholder}
        </div>
      )}
    </Card>
  );
}
