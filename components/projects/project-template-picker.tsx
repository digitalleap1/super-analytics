"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_VALUE = "__default__";

type Props = {
  projectId: string;
  currentTemplateId: string | null;
  templates: { id: string; name: string; isDefault: boolean }[];
};

export function ProjectTemplatePicker({
  projectId,
  currentTemplateId,
  templates,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentTemplateId ?? DEFAULT_VALUE);
  const [isPending, startTransition] = useTransition();

  const isDirty = (currentTemplateId ?? DEFAULT_VALUE) !== value;

  function save() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: value === DEFAULT_VALUE ? null : value,
        }),
      });
      if (!res.ok) {
        toast.error("Could not change template");
        return;
      }
      toast.success("Template updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label>Report template</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>
              Use workspace default
            </SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
                {t.isDefault ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/settings/templates"
          className="text-xs text-primary hover:underline"
        >
          Manage templates →
        </Link>
        <Button onClick={save} disabled={!isDirty || isPending} size="sm">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save
        </Button>
      </div>
    </div>
  );
}
