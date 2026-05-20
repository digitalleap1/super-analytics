import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  MousePointerClick,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNumber, formatPosition } from "@/lib/utils";
import type { ProjectListItem } from "@/lib/projects";

type ProjectStats = {
  clicks: number | null;
  impressions: number | null;
  position: number | null;
  users: number | null;
  gscSource: "live" | "stub" | null;
  ga4Source: "live" | "stub" | null;
};

type ProjectCardData = ProjectListItem & { stats?: ProjectStats };

function StatBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-primary/70" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="truncate text-sm font-semibold tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const isGscConnected = !!project.gscSiteUrl;
  const isGa4Connected = !!project.ga4PropertyId;
  const s = project.stats;

  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card className="relative h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative h-20 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,39,112,0.18),transparent_55%)]" />
          <ArrowUpRight className="absolute right-3 top-3 h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="relative -mt-7 px-5">
          {project.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logoUrl}
              alt=""
              className="h-14 w-14 rounded-xl border-2 border-card bg-card object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-card bg-gradient-to-br from-primary to-primary/70 text-lg font-bold uppercase text-primary-foreground shadow-sm">
              {project.name.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-3">
          <h3 className="truncate text-base font-semibold leading-tight">
            {project.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.domain}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatBlock
              label="Clicks"
              value={s?.clicks != null ? formatNumber(s.clicks) : "—"}
              icon={MousePointerClick}
            />
            <StatBlock
              label="Impressions"
              value={s?.impressions != null ? formatNumber(s.impressions) : "—"}
              icon={Eye}
            />
            <StatBlock
              label="Avg Position"
              value={s?.position != null ? formatPosition(s.position) : "—"}
              icon={TrendingUp}
            />
            <StatBlock
              label="Users"
              value={s?.users != null ? formatNumber(s.users) : "—"}
              icon={Users}
            />
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px]">
            {isGscConnected && isGa4Connected ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground">
                  GSC + GA4 connected · last 28 days
                </span>
              </>
            ) : isGscConnected || isGa4Connected ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">
                  {isGscConnected ? "GA4 not connected" : "GSC not connected"}
                </span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">
                  Connect GSC + GA4 for live stats
                </span>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NewProjectCard() {
  return (
    <Link
      href="/projects/new"
      className="group block h-full min-h-[260px] rounded-xl border-2 border-dashed border-muted-foreground/25 bg-card/30 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card hover:shadow-md"
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">New project</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add a client and connect data
          </p>
        </div>
      </div>
    </Link>
  );
}
