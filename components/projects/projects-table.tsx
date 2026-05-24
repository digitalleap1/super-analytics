"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronsUpDown,
  Circle,
  Columns3,
  ExternalLink,
  FileText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  googleConnected: boolean;
  templateName: string | null;
  keywordCount: number;
  backlinkCount: number;
  memberCount: number;
  isImplicitAdmin: boolean; // current user has access via workspace admin role
  createdAt: string; // YYYY-MM-DD
  updatedAt: string;
};

type ColumnKey =
  | "name"
  | "connections"
  | "members"
  | "keywords"
  | "backlinks"
  | "template"
  | "created"
  | "updated";

const COLUMNS: { key: ColumnKey; label: string; default: boolean }[] = [
  { key: "name", label: "Project", default: true },
  { key: "connections", label: "Connections", default: true },
  { key: "members", label: "Users", default: true },
  { key: "keywords", label: "Keywords", default: true },
  { key: "backlinks", label: "Backlinks", default: false },
  { key: "template", label: "Template", default: false },
  { key: "created", label: "Created", default: true },
  { key: "updated", label: "Updated", default: false },
];

const STORAGE_KEY = "projects-table-columns-v1";

type SortKey = Exclude<ColumnKey, "connections">;
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

export function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "updated", dir: "desc" });
  const [visible, setVisible] = useState<Set<ColumnKey>>(() => {
    if (typeof window === "undefined") {
      return new Set(COLUMNS.filter((c) => c.default).map((c) => c.key));
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as ColumnKey[];
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      /* ignore */
    }
    return new Set(COLUMNS.filter((c) => c.default).map((c) => c.key));
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visible)));
    } catch {
      /* ignore */
    }
  }, [visible]);

  function toggleColumn(key: ColumnKey) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding the name column — it's the row identifier.
        if (key === "name") return prev;
        next.delete(key);
      } else next.add(key);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = !q
      ? projects
      : projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.domain.toLowerCase().includes(q),
        );
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        if (va < vb) return sort.dir === "asc" ? -1 : 1;
        if (va > vb) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [projects, filter, sort]);

  const cols = COLUMNS.filter((c) => visible.has(c.key));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or domain..."
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={visible.has(c.key)}
                onCheckedChange={() => toggleColumn(c.key)}
                disabled={c.key === "name"}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {projects.length} project
          {projects.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {c.key === "connections" ? (
                    <span>{c.label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key as SortKey)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {c.label}
                      {sort?.key === c.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={cols.length}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  No projects match.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="group border-t transition-colors hover:bg-accent/40"
                >
                  {cols.map((c) => (
                    <td key={c.key} className="px-3 py-3 align-middle">
                      {renderCell(c.key, p)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sortValue(p: ProjectRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return p.name.toLowerCase();
    case "members":
      return p.memberCount;
    case "keywords":
      return p.keywordCount;
    case "backlinks":
      return p.backlinkCount;
    case "template":
      return (p.templateName ?? "").toLowerCase();
    case "created":
      return p.createdAt;
    case "updated":
      return p.updatedAt;
  }
}

function renderCell(key: ColumnKey, p: ProjectRow) {
  switch (key) {
    case "name":
      return (
        <Link
          href={`/projects/${p.id}`}
          className="flex items-center gap-3 min-w-0"
        >
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-xs font-bold uppercase text-primary-foreground">
              {p.name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium group-hover:text-primary">
              {p.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.domain}
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      );
    case "connections":
      return (
        <div className="flex items-center gap-1.5">
          <Pill on={!!p.gscSiteUrl} label="GSC" />
          <Pill on={!!p.ga4PropertyId} label="GA4" />
          {p.googleConnected ? (
            <Pill on label="Google" tone="primary" />
          ) : null}
        </div>
      );
    case "members":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm">
          {p.isImplicitAdmin ? (
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {p.memberCount}
        </span>
      );
    case "keywords":
      return <span className="tabular-nums">{p.keywordCount}</span>;
    case "backlinks":
      return <span className="tabular-nums">{p.backlinkCount}</span>;
    case "template":
      return p.templateName ? (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <FileText className="h-3 w-3 text-muted-foreground" />
          {p.templateName}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">default</span>
      );
    case "created":
      return <span className="text-xs tabular-nums">{p.createdAt}</span>;
    case "updated":
      return <span className="text-xs tabular-nums">{p.updatedAt}</span>;
  }
}

function Pill({
  on,
  label,
  tone = "muted",
}: {
  on: boolean;
  label: string;
  tone?: "primary" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        on
          ? tone === "primary"
            ? "bg-primary/10 text-primary"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      {on ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : (
        <Circle className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}
