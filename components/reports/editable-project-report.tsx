"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Settings,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { DownloadPdfButton } from "@/components/reports/download-pdf-button";
import { KpiCard } from "@/components/reports/kpi-card";
import { ClicksImpressionsChart } from "@/components/charts/clicks-impressions-chart";
import { PositionTrendChart } from "@/components/charts/position-trend-chart";
import { ReportTables } from "@/components/reports/report-tables";
import { KeywordsSummary } from "@/components/reports/keywords-summary";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Density,
  type KpiColumns,
  type ReportTemplateConfig,
  type SectionKey,
  type TableLimit,
  densityClass,
  kpiGridClass,
} from "@/lib/templates";
import { cn, formatNumber, formatPosition } from "@/lib/utils";
import type { KeywordRow } from "@/lib/keywords";
import type { BacklinkRow } from "@/lib/backlinks";
import { BacklinksSection } from "@/components/backlinks/backlinks-section";
import type {
  Ga4ChannelRow,
  Ga4Overview,
  GscOverview,
  GscPageRow,
  GscQueryRow,
} from "@/lib/google/types";

type Props = {
  project: {
    id: string;
    name: string;
    domain: string;
  };
  template: { id: string; name: string } | null;
  initialConfig: ReportTemplateConfig;
  rangeLabel: string;
  compare: boolean;
  isStub: boolean;
  pdfFilename: string;
  overview: GscOverview;
  prevOverview: GscOverview | null;
  ga4Overview: Ga4Overview;
  prevGa4: Ga4Overview | null;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  channels: Ga4ChannelRow[];
  keywords: KeywordRow[];
  backlinks: BacklinkRow[];
};

function SectionHeader({
  title,
  hint,
  editing,
  onHide,
  controls,
}: {
  title: string;
  hint?: string;
  editing: boolean;
  onHide?: () => void;
  controls?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {editing ? (
        <div className="flex items-center gap-1 print:hidden">
          {controls ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                {controls}
              </PopoverContent>
            </Popover>
          ) : null}
          {onHide ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onHide}
              aria-label="Hide section"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HiddenSectionStub({
  name,
  onShow,
}: {
  name: string;
  onShow: () => void;
}) {
  return (
    <Card className="flex items-center justify-between border-dashed bg-card/40 p-3 print:hidden">
      <p className="text-xs text-muted-foreground">
        Hidden in edit: <span className="font-medium">{name}</span>
      </p>
      <Button variant="ghost" size="sm" onClick={onShow}>
        <Eye className="mr-1 h-3.5 w-3.5" />
        Show
      </Button>
    </Card>
  );
}

export function EditableProjectReport(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState<ReportTemplateConfig>(props.initialConfig);
  const [isSaving, startSaving] = useTransition();
  const [confirmShared, setConfirmShared] = useState<{
    sharedWith: number;
  } | null>(null);

  const isDirty =
    JSON.stringify(config) !== JSON.stringify(props.initialConfig);

  function setSection(key: SectionKey, value: boolean) {
    setConfig((c) => ({
      ...c,
      sections: { ...c.sections, [key]: value },
    }));
  }
  function setLayout<K extends keyof ReportTemplateConfig["layout"]>(
    key: K,
    value: ReportTemplateConfig["layout"][K],
  ) {
    setConfig((c) => ({ ...c, layout: { ...c.layout, [key]: value } }));
  }

  function cancel() {
    setConfig(props.initialConfig);
    setEditing(false);
  }

  async function callSave(opts: { mode: "in_place" | "fork"; force?: boolean }) {
    const res = await fetch(`/api/projects/${props.project.id}/template/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config,
        mode: opts.mode,
        force: opts.force ?? false,
        projectName: props.project.name,
      }),
    });
    if (res.status === 409) {
      const body = (await res.json()) as { sharedWith: number };
      setConfirmShared({ sharedWith: body.sharedWith });
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not save layout");
      return;
    }
    const body = (await res.json()) as {
      template: { id: string; name: string };
      mode: "updated_in_place" | "forked";
    };
    toast.success(
      body.mode === "forked"
        ? `Saved as new template "${body.template.name}"`
        : "Layout saved",
    );
    setEditing(false);
    setConfirmShared(null);
    router.refresh();
  }

  function save() {
    startSaving(async () => {
      await callSave({ mode: "in_place" });
    });
  }

  const density = densityClass(config.layout.density);
  const cfg = config;
  const showAnyTable =
    cfg.sections.topQueries ||
    cfg.sections.topPages ||
    cfg.sections.ga4Channels;

  const kpiControls = (
    <>
      <div className="space-y-2">
        <Label>KPI columns</Label>
        <Select
          value={String(cfg.layout.kpiColumns)}
          onValueChange={(v) =>
            setLayout("kpiColumns", Number(v) as KpiColumns)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 columns</SelectItem>
            <SelectItem value="4">4 columns</SelectItem>
            <SelectItem value="5">5 columns</SelectItem>
            <SelectItem value="6">6 columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Density</Label>
        <Select
          value={cfg.layout.density}
          onValueChange={(v) => setLayout("density", v as Density)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="comfortable">Comfortable</SelectItem>
            <SelectItem value="spacious">Spacious</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const tableControls = (
    <div className="space-y-2">
      <Label>Rows per table</Label>
      <Select
        value={String(cfg.layout.tableLimit)}
        onValueChange={(v) =>
          setLayout("tableLimit", Number(v) as TableLimit)
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">Top 10</SelectItem>
          <SelectItem value="25">Top 25</SelectItem>
          <SelectItem value="50">Top 50</SelectItem>
          <SelectItem value="100">Top 100</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const tablesSubsections = (
    <div className="space-y-2">
      <Label>Visible tabs</Label>
      <div className="space-y-2">
        {(
          [
            ["topQueries", "Top queries"],
            ["topPages", "Top pages"],
            ["ga4Channels", "GA4 channels"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between text-sm"
          >
            <span>{label}</span>
            <Switch
              checked={cfg.sections[key]}
              onCheckedChange={(v) => setSection(key, v)}
            />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {props.project.name}
          </h1>
          <a
            href={`https://${props.project.domain}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {props.project.domain}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {props.template ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Template:{" "}
              <Link
                href={`/settings/templates/${props.template.id}`}
                className="text-primary hover:underline"
              >
                {props.template.name}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <>
              <DateRangePicker />
              <DownloadPdfButton
                filename={props.pdfFilename}
                targetId="report-pdf"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit layout
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${props.project.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save layout
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <Card className="border-primary/40 bg-primary/5 p-3 text-sm text-primary print:hidden">
          <strong>Editing layout.</strong> Toggle sections on/off, change column
          counts, table sizes and density. Hit <em>Save layout</em> to persist;
          <em> Cancel</em> discards your changes.
        </Card>
      ) : null}

      <div
        id="report-pdf"
        className={cn("bg-background", density.gap, "space-y-6")}
      >
        <div className="hidden border-b pb-3 print:block">
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.project.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {props.project.domain} · {props.rangeLabel}
            {props.compare ? " · vs. previous period" : ""}
          </p>
          {cfg.branding.headerText ? (
            <p className="mt-1 text-sm">{cfg.branding.headerText}</p>
          ) : null}
        </div>

        {props.isStub ? (
          <Card className="border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 print:hidden">
            Showing <strong>sample data</strong> — connect this project to
            Google Search Console and Analytics in project settings to load
            live numbers.
          </Card>
        ) : null}

        {/* KPI section */}
        {cfg.sections.kpis ? (
          <section>
            <SectionHeader
              title="Key metrics"
              editing={editing}
              onHide={() => setSection("kpis", false)}
              controls={kpiControls}
            />
            <div
              className={cn(kpiGridClass(cfg.layout.kpiColumns), density.gap)}
            >
              <KpiCard
                label="Clicks"
                value={formatNumber(props.overview.totals.clicks)}
                current={props.overview.totals.clicks}
                previous={props.prevOverview?.totals.clicks}
              />
              <KpiCard
                label="Impressions"
                value={formatNumber(props.overview.totals.impressions)}
                current={props.overview.totals.impressions}
                previous={props.prevOverview?.totals.impressions}
              />
              <KpiCard
                label="Avg position"
                value={formatPosition(props.overview.totals.position)}
                current={props.overview.totals.position}
                previous={props.prevOverview?.totals.position}
                invertDelta
              />
              <KpiCard
                label="Users"
                value={formatNumber(props.ga4Overview.totals.totalUsers)}
                current={props.ga4Overview.totals.totalUsers}
                previous={props.prevGa4?.totals.totalUsers}
              />
              <KpiCard
                label="Key events"
                value={formatNumber(props.ga4Overview.totals.keyEvents)}
                current={props.ga4Overview.totals.keyEvents}
                previous={props.prevGa4?.totals.keyEvents}
              />
            </div>
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Key metrics"
            onShow={() => setSection("kpis", true)}
          />
        ) : null}

        {/* Charts section */}
        {cfg.sections.chartClicksImpressions ||
        cfg.sections.chartPositionTrend ? (
          <div className={cn("grid grid-cols-1 lg:grid-cols-2", density.gap)}>
            {cfg.sections.chartClicksImpressions ? (
              <Card className={density.card}>
                <SectionHeader
                  title="Clicks & impressions"
                  hint="Daily totals across the selected range."
                  editing={editing}
                  onHide={() => setSection("chartClicksImpressions", false)}
                />
                <div className="mt-2">
                  <ClicksImpressionsChart data={props.overview.series} />
                </div>
              </Card>
            ) : null}
            {cfg.sections.chartPositionTrend ? (
              <Card className={density.card}>
                <SectionHeader
                  title="Position trend"
                  hint="Average position — lower is better."
                  editing={editing}
                  onHide={() => setSection("chartPositionTrend", false)}
                />
                <div className="mt-2">
                  <PositionTrendChart data={props.overview.series} />
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
        {editing &&
        !cfg.sections.chartClicksImpressions &&
        !cfg.sections.chartPositionTrend ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 print:hidden">
            <HiddenSectionStub
              name="Clicks & impressions chart"
              onShow={() => setSection("chartClicksImpressions", true)}
            />
            <HiddenSectionStub
              name="Position trend chart"
              onShow={() => setSection("chartPositionTrend", true)}
            />
          </div>
        ) : editing ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 print:hidden">
            {!cfg.sections.chartClicksImpressions ? (
              <HiddenSectionStub
                name="Clicks & impressions chart"
                onShow={() => setSection("chartClicksImpressions", true)}
              />
            ) : null}
            {!cfg.sections.chartPositionTrend ? (
              <HiddenSectionStub
                name="Position trend chart"
                onShow={() => setSection("chartPositionTrend", true)}
              />
            ) : null}
          </div>
        ) : null}

        {/* Keywords */}
        {cfg.sections.keywords ? (
          <section>
            <SectionHeader
              title=""
              editing={editing}
              onHide={() => setSection("keywords", false)}
              controls={tableControls}
            />
            <KeywordsSummary
              projectId={props.project.id}
              projectName={props.project.name}
              rows={props.keywords}
              limit={cfg.layout.tableLimit}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Tracked keywords"
            onShow={() => setSection("keywords", true)}
          />
        ) : null}

        {/* Backlinks */}
        {cfg.sections.backlinks ? (
          <section>
            {editing ? (
              <SectionHeader
                title=""
                editing={editing}
                onHide={() => setSection("backlinks", false)}
              />
            ) : null}
            <BacklinksSection
              projectId={props.project.id}
              projectName={props.project.name}
              rangeLabel={props.rangeLabel}
              rows={props.backlinks}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Backlinks (pie chart + table)"
            onShow={() => setSection("backlinks", true)}
          />
        ) : null}

        {/* Report tables */}
        {showAnyTable ? (
          <section>
            <SectionHeader
              title="Search & analytics tables"
              editing={editing}
              controls={
                <>
                  {tableControls}
                  {tablesSubsections}
                </>
              }
            />
            <ReportTables
              projectName={props.project.name}
              queries={cfg.sections.topQueries ? props.queries : []}
              pages={cfg.sections.topPages ? props.pages : []}
              channels={cfg.sections.ga4Channels ? props.channels : []}
              showQueries={cfg.sections.topQueries}
              showPages={cfg.sections.topPages}
              showChannels={cfg.sections.ga4Channels}
              rowLimit={cfg.layout.tableLimit}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Search & analytics tables"
            onShow={() => {
              setSection("topQueries", true);
              setSection("topPages", true);
              setSection("ga4Channels", true);
            }}
          />
        ) : null}

        {cfg.branding.footerText ? (
          <p className="border-t pt-4 text-center text-xs text-muted-foreground">
            {cfg.branding.footerText}
          </p>
        ) : null}
      </div>

      <Dialog
        open={!!confirmShared}
        onOpenChange={(o) => {
          if (!o) setConfirmShared(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template is shared</DialogTitle>
            <DialogDescription>
              {props.template?.name ?? "This template"} is also used by{" "}
              {confirmShared?.sharedWith} other project
              {confirmShared?.sharedWith === 1 ? "" : "s"}. Saving in place
              updates the layout for all of them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmShared(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={isSaving}
              onClick={() => {
                startSaving(async () => {
                  await callSave({ mode: "fork" });
                });
              }}
            >
              Save just for this project
            </Button>
            <Button
              disabled={isSaving}
              onClick={() => {
                startSaving(async () => {
                  await callSave({ mode: "in_place", force: true });
                });
              }}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update for all projects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
