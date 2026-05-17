"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  name: string;
  domain: string;
  currentTemplateId: string | null;
};

type Props = {
  templateId: string;
  templateName: string;
  projects: ProjectOption[];
};

export function ApplyToProjects({ templateId, templateName, projects }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(
      projects.filter((p) => p.currentTemplateId === templateId).map((p) => p.id),
    );
  });
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = projects.filter((p) => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return (
      p.name.toLowerCase().includes(f) || p.domain.toLowerCase().includes(f)
    );
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allFilteredSelected = filtered.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) {
        if (allFilteredSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  function apply() {
    if (selected.size === 0) {
      toast.error("Pick at least one project");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/workspace/templates/${templateId}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectIds: Array.from(selected) }),
        },
      );
      if (!res.ok) {
        toast.error("Could not apply template");
        return;
      }
      const body = (await res.json()) as { applied: number };
      toast.success(
        `Applied "${templateName}" to ${body.applied} project${body.applied === 1 ? "" : "s"}`,
      );
      router.refresh();
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search projects by name or domain..."
          className="flex-1 min-w-[200px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleAll}
          disabled={filtered.length === 0}
        >
          {allFilteredSelected ? "Deselect all" : "Select all"}
        </Button>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No projects match.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((p) => {
              const isSelected = selected.has(p.id);
              const isCurrent = p.currentTemplateId === templateId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent",
                      isSelected && "bg-accent/40",
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.domain}
                      </p>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        current
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected.size} of {projects.length} project{projects.length === 1 ? "" : "s"} selected
        </p>
        <Button onClick={apply} disabled={isPending || selected.size === 0}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply to {selected.size} project{selected.size === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
