"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Template = { id: string; name: string; isDefault?: boolean };

type Props = {
  projectId: string;
  currentTemplateId: string | null;
  templates: Template[];
};

const NULL_VALUE = "__default__";

// In-toolbar template picker: lets the user switch which report template the
// project uses without navigating to Settings. Hits the same PATCH endpoint
// as ProjectTemplatePicker. Hidden if there's only one template available.
export function QuickTemplateSwitcher({
  projectId,
  currentTemplateId,
  templates,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLabel =
    templates.find((t) => t.id === currentTemplateId)?.name ??
    (templates.find((t) => t.isDefault)?.name
      ? `${templates.find((t) => t.isDefault)!.name} (default)`
      : "Default");

  if (templates.length === 0) return null;

  function change(value: string) {
    const next = value === NULL_VALUE ? null : value;
    if (next === currentTemplateId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: next }),
      });
      if (!res.ok) {
        toast.error("Could not change template");
        return;
      }
      toast.success("Template updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Template:&nbsp;</span>
          <span className="max-w-[140px] truncate">{currentLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Switch template
        </p>
        <button
          type="button"
          onClick={() => change(NULL_VALUE)}
          disabled={isPending}
          className={cn(
            "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
            currentTemplateId === null && "bg-accent",
          )}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              currentTemplateId === null ? "opacity-100" : "opacity-0",
            )}
          />
          Workspace default
        </button>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => change(t.id)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
              currentTemplateId === t.id && "bg-accent",
            )}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                currentTemplateId === t.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="flex-1 truncate">{t.name}</span>
            {t.isDefault ? (
              <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                Default
              </span>
            ) : null}
          </button>
        ))}
        {isPending ? (
          <div className="flex items-center justify-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Switching…
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
