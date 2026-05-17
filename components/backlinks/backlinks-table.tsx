"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import { categoryMeta, type BacklinkRow } from "@/lib/backlinks";

type Props = {
  projectId: string;
  projectName: string;
  rows: BacklinkRow[];
};

export function BacklinksTable({ projectId, projectName, rows }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function del() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} backlink(s)?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/backlinks?ids=${Array.from(selected).join(",")}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Could not delete");
        return;
      }
      const body = (await res.json()) as { deleted: number };
      toast.success(`Deleted ${body.deleted} backlink${body.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground">
        No backlinks logged in this date range yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={del}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {rows.length} backlink{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <CsvExportButton
          filename={`${projectName}-backlinks`}
          rows={
            rows.map((r) => ({
              category: categoryMeta(r.category).label,
              url: r.url,
              place: r.place ?? "",
              date: r.submittedAt,
              notes: r.notes ?? "",
            })) as Record<string, unknown>[]
          }
          columns={[
            { key: "category", header: "Category" },
            { key: "url", header: "URL" },
            { key: "place", header: "Place" },
            { key: "date", header: "Date of submission" },
            { key: "notes", header: "Notes" },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="accent-primary"
                />
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                URL
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Place
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = categoryMeta(r.category);
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-md">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 truncate text-primary hover:underline"
                    >
                      <span className="truncate">
                        {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.place ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {r.submittedAt}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
