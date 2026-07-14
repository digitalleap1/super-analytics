"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bookmark,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MousePointerClick,
  Pencil,
  Save,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { ExportMenu } from "@/components/reports/export-menu";
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
import { Input } from "@/components/ui/input";
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
  type LimitedSection,
  type ReportTemplateConfig,
  type SectionKey,
  densityClass,
  kpiGridClass,
  limitFor,
} from "@/lib/templates";
import { cn, formatNumber, formatPosition } from "@/lib/utils";
import type { KeywordRow } from "@/lib/keywords";
import {
  categoryMeta,
  type BacklinkMonthBucket,
  type BacklinkRow,
} from "@/lib/backlinks";
import { BacklinksSection } from "@/components/backlinks/backlinks-section";
import { SaveReportDialog } from "@/components/reports/save-report-dialog";
import { QuickShareButton } from "@/components/reports/quick-share-button";
import { ReportLogoHeader } from "@/components/reports/report-logo-header";
import { ReportSummaryCard } from "@/components/reports/report-summary-card";
import { EditableTextSection } from "@/components/reports/editable-text-section";
import { OtherTasksSection } from "@/components/reports/other-tasks-section";
import { QuickTemplateSwitcher } from "@/components/reports/quick-template-switcher";
import { formatBulletValue, type ReportSummary } from "@/lib/report-summary";
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
    logoUrl?: string | null;
  };
  template: { id: string; name: string } | null;
  initialConfig: ReportTemplateConfig;
  rangeLabel: string;
  compare: boolean;
  isStub: boolean;
  hasGsc?: boolean;
  hasGa4?: boolean;
  pdfFilename: string;
  overview: GscOverview;
  prevOverview: GscOverview | null;
  ga4Overview: Ga4Overview;
  prevGa4: Ga4Overview | null;
  queries: GscQueryRow[];
  prevQueries?: GscQueryRow[] | null;
  pages: GscPageRow[];
  prevPages?: GscPageRow[] | null;
  channels: Ga4ChannelRow[];
  prevChannels?: Ga4ChannelRow[] | null;
  keywords: KeywordRow[];
  backlinks: BacklinkRow[];
  // Every backlink regardless of the report range, so out-of-range entries stay
  // manageable. Absent in snapshot / share views.
  allBacklinks?: BacklinkRow[];
  backlinkMonthly: BacklinkMonthBucket[];
  fromDate: string; // YYYY-MM-DD; used by the Save report dialog
  toDate: string;
  reportPeriodLabel: string; // "Weekly report" / "Monthly report" / ...
  mode?: "live" | "snapshot";
  snapshotMeta?: {
    name: string;
    createdAt: string;
  };
  // Top-of-report executive summary, generated server-side from current vs
  // previous period metrics.
  summary?: ReportSummary;
  // Free-text fields (per-project), shown as toggleable sections.
  analysisNotes?: string | null;
  otherTasks?: string | null;
  // List of workspace templates so the user can switch from the toolbar
  // without going to project settings.
  availableTemplates?: { id: string; name: string; isDefault: boolean }[];
  currentTemplateId?: string | null;
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

  function setSectionLimit(section: LimitedSection, value: number | null) {
    setConfig((c) => {
      const sl: Partial<Record<LimitedSection, number>> = {
        ...(c.layout.sectionLimits ?? {}),
      };
      if (value == null || Number.isNaN(value)) delete sl[section];
      else sl[section] = Math.max(1, Math.round(value));
      return { ...c, layout: { ...c.layout, sectionLimits: sl } };
    });
  }

  // A small number input for one section's row cap. Blank = use the global
  // default (shown as the placeholder). Any positive integer is allowed.
  const limitControl = (section: LimitedSection, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        min={1}
        className="h-8 w-20"
        value={cfg.layout.sectionLimits?.[section] ?? ""}
        placeholder={`${cfg.layout.tableLimit}`}
        onChange={(e) => {
          const v = e.target.value.trim();
          setSectionLimit(section, v === "" ? null : Number(v));
        }}
      />
    </div>
  );

  const tableLimitControls = (
    <div className="flex flex-wrap items-end gap-3">
      {limitControl("topQueries", "Queries")}
      {limitControl("topPages", "Pages")}
      {limitControl("ga4Channels", "Channels")}
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

  // Live drafts of the two free-text sections. We initialise from props so the
  // first render shows what the server sent, then keep them in sync with the
  // EditableTextSection components below — that way "Save report" snapshots the
  // text the user just typed, not the stale value from page load.
  const [analysisDraft, setAnalysisDraft] = useState<string | null>(
    props.analysisNotes ?? null,
  );
  const [otherTasksDraft, setOtherTasksDraft] = useState<string | null>(
    props.otherTasks ?? null,
  );
  // Re-sync with props when the server-rendered values change — e.g. after
  // Save Report calls router.refresh() and the server returns null because the
  // backend cleared the live fields for the next reporting period.
  useEffect(() => {
    setAnalysisDraft(props.analysisNotes ?? null);
  }, [props.analysisNotes]);
  useEffect(() => {
    setOtherTasksDraft(props.otherTasks ?? null);
  }, [props.otherTasks]);

  function buildSnapshotData() {
    return {
      version: 1 as const,
      projectName: props.project.name,
      projectDomain: props.project.domain,
      projectLogoUrl: props.project.logoUrl ?? null,
      rangeLabel: props.rangeLabel,
      fromDate: props.fromDate,
      toDate: props.toDate,
      compare: props.compare,
      isStub: props.isStub,
      pdfFilename: props.pdfFilename,
      config,
      template: props.template,
      overview: props.overview,
      prevOverview: props.prevOverview,
      ga4Overview: props.ga4Overview,
      prevGa4: props.prevGa4,
      queries: props.queries,
      prevQueries: props.prevQueries ?? null,
      pages: props.pages,
      prevPages: props.prevPages ?? null,
      channels: props.channels,
      prevChannels: props.prevChannels ?? null,
      keywords: props.keywords,
      backlinks: props.backlinks,
      backlinkMonthly: props.backlinkMonthly,
      summary: props.summary,
      analysisNotes: analysisDraft,
      otherTasks: otherTasksDraft,
    };
  }

  return (
    <div className="space-y-6">
      {/* Toolbar.
          - Logo / project name / period live inside #report-pdf (below).
          - The toolbar is purely action controls: view changers on the left
            (date + template), output actions in the middle (export, share,
            save), navigation/mode on the right (past reports, edit, settings).
          - Grouped with subtle separators so it reads at a glance on desktop
            and wraps cleanly on mobile. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 print:hidden">
        {!editing ? (
          <>
            {/* Group 1: View — what date / template am I looking at? */}
            <div className="flex flex-wrap items-center gap-2">
              {props.mode === "snapshot" ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/projects/${props.project.id}/reports`}>
                    ← Back to past reports
                  </Link>
                </Button>
              ) : (
                <DateRangePicker />
              )}
              {props.mode !== "snapshot" && props.availableTemplates ? (
                <QuickTemplateSwitcher
                  projectId={props.project.id}
                  currentTemplateId={props.currentTemplateId ?? null}
                  templates={props.availableTemplates}
                />
              ) : null}
            </div>

            {props.mode !== "snapshot" ? (
              <div
                aria-hidden
                className="hidden h-6 w-px bg-border sm:block"
              />
            ) : null}

            {/* Group 2: Output — what do I do with this report? */}
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu
                targetId="report-pdf"
                filename={props.pdfFilename}
                projectName={props.project.name}
                projectDomain={props.project.domain}
                periodLabel={props.reportPeriodLabel}
                rangeLabel={props.rangeLabel}
                branding={cfg.branding.headerText}
                reportData={{
                  filename: props.pdfFilename,
                  projectName: props.project.name,
                  projectDomain: props.project.domain,
                  periodLabel: props.reportPeriodLabel,
                  rangeLabel: props.rangeLabel,
                  brandingHeader: cfg.branding.headerText,
                  logoUrl: props.project.logoUrl ?? null,
                  agencyName: cfg.branding.headerText ?? null,
                  summaryNarrative:
                    cfg.sections.summary && props.summary
                      ? props.summary.narrative
                      : null,
                  metrics:
                    cfg.sections.kpis && props.summary
                      ? props.summary.bullets.map((b) => ({
                          label: b.label,
                          value: formatBulletValue(b),
                          change:
                            b.changePct == null
                              ? "—"
                              : `${b.changePct >= 0 ? "+" : ""}${b.changePct.toFixed(1)}%`,
                          direction: b.direction,
                        }))
                      : [],
                  topQueries: cfg.sections.topQueries
                    ? props.queries.slice(0, limitFor(cfg, "topQueries"))
                    : undefined,
                  topPages: cfg.sections.topPages
                    ? props.pages.slice(0, limitFor(cfg, "topPages"))
                    : undefined,
                  channels: cfg.sections.ga4Channels
                    ? props.channels.slice(0, limitFor(cfg, "ga4Channels"))
                    : undefined,
                  keywords: cfg.sections.keywords
                    ? props.keywords.slice(0, limitFor(cfg, "keywords"))
                    : undefined,
                  backlinks: cfg.sections.backlinks
                    ? [...props.backlinks]
                        .sort((a, b) =>
                          b.submittedAt.localeCompare(a.submittedAt),
                        )
                        .slice(0, limitFor(cfg, "backlinks"))
                        .map((row) => ({
                          row,
                          categoryLabel: categoryMeta(row.category).label,
                        }))
                    : undefined,
                  dailySeries:
                    cfg.sections.chartClicksImpressions ||
                    cfg.sections.chartPositionTrend
                      ? props.overview.series
                      : undefined,
                  // Use the live drafts, not props: the editors persist via
                  // PATCH and bubble the saved value up, so props stays stale
                  // until a server refresh — which used to export an empty
                  // Analysis / Other tasks section.
                  analysisNotes: cfg.sections.analysis ? analysisDraft : null,
                  otherTasks: cfg.sections.otherTasks ? otherTasksDraft : null,
                }}
              />
              {props.mode !== "snapshot" ? (
                <>
                  <QuickShareButton
                    projectId={props.project.id}
                    defaultName={`${props.project.name} — ${props.rangeLabel}`}
                    fromDate={props.fromDate}
                    toDate={props.toDate}
                    buildSnapshot={buildSnapshotData}
                  />
                  <SaveReportDialog
                    projectId={props.project.id}
                    defaultName={`${props.project.name} — ${props.rangeLabel}`}
                    fromDate={props.fromDate}
                    toDate={props.toDate}
                    buildSnapshot={buildSnapshotData}
                  />
                </>
              ) : null}
            </div>

            {props.mode !== "snapshot" ? (
              <>
                <div
                  aria-hidden
                  className="hidden h-6 w-px bg-border sm:block"
                />
                {/* Group 3: Nav — pushed to the right so the primary actions
                    above stay visually dominant. */}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/projects/${props.project.id}/reports`}>
                      <Bookmark className="mr-1.5 h-4 w-4" />
                      Past
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link
                      href={`/projects/${props.project.id}/settings`}
                      aria-label="Project settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!isDirty || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save layout
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Card className="border-primary/40 bg-primary/5 p-3 text-sm text-primary print:hidden">
          <strong>Editing layout.</strong> Toggle sections on/off, change column
          counts, table sizes and density. Hit <em>Save layout</em> to persist;
          <em> Cancel</em> discards your changes.
        </Card>
      ) : null}

      {props.mode === "snapshot" && props.snapshotMeta ? (
        <Card className="border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 print:hidden">
          <strong>Saved snapshot:</strong> &ldquo;{props.snapshotMeta.name}&rdquo;
          — frozen on{" "}
          <span className="font-mono">{props.snapshotMeta.createdAt}</span>.
          Numbers reflect what was live at save time, not today.
        </Card>
      ) : null}

      <div
        id="report-pdf"
        className={cn("bg-background", density.gap, "space-y-6")}
      >
        {/* Branded header (logo + name + period) — always visible, always
            captured in PDF/PPT/PNG exports and shared snapshots. */}
        <section data-pptx-slide>
          <ReportLogoHeader
            name={props.project.name}
            domain={props.project.domain}
            logoUrl={props.project.logoUrl}
            rangeLabel={props.rangeLabel}
            reportPeriodLabel={props.reportPeriodLabel}
          />
          {cfg.branding.headerText ? (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {cfg.branding.headerText}
            </p>
          ) : null}
        </section>

        {/* Auto-generated executive summary */}
        {cfg.sections.summary && props.summary ? (
          <section data-pptx-slide>
            <SectionHeader
              title=""
              editing={editing}
              onHide={() => setSection("summary", false)}
            />
            <ReportSummaryCard summary={props.summary} />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Executive summary"
            onShow={() => setSection("summary", true)}
          />
        ) : null}

        {(() => {
          // Detect *mismatch* banners: a data source is "connected" (the
          // project has the site/property ID set) but the actual API call
          // returned stub data. That almost always means the corresponding
          // Google Cloud API isn't enabled, or the OAuth account lacks
          // access — and the user needs clear instructions to fix it.
          const gscMismatch =
            props.hasGsc && props.overview.source === "stub";
          const ga4Mismatch =
            props.hasGa4 && props.ga4Overview.source === "stub";

          if (props.isStub) {
            return (
              <Card className="border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 print:hidden">
                Showing <strong>sample data</strong> — connect this project to
                Google Search Console and Analytics in project settings to load
                live numbers.
              </Card>
            );
          }
          if (gscMismatch || ga4Mismatch) {
            const ga4Err = props.ga4Overview.error;
            const gscErr = props.overview.error;
            return (
              <Card className="border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 print:hidden">
                <p className="font-semibold">
                  {ga4Mismatch && gscMismatch
                    ? "Search Console & Analytics calls failed — showing sample numbers."
                    : ga4Mismatch
                      ? "Analytics is connected, but the data call failed — sessions, users and channels below are sample numbers."
                      : "Search Console is connected, but the data call failed — clicks, impressions and queries below are sample numbers."}
                </p>
                {ga4Mismatch && ga4Err ? (
                  <p className="mt-1.5 leading-relaxed">
                    <strong>GA4 says:</strong> {ga4Err}
                  </p>
                ) : null}
                {gscMismatch && gscErr ? (
                  <p className="mt-1.5 leading-relaxed">
                    <strong>GSC says:</strong> {gscErr}
                  </p>
                ) : null}
                {!ga4Err && !gscErr ? (
                  <p className="mt-1 leading-relaxed text-xs">
                    Reload once; if it persists, open the project in an
                    incognito tab while signed into the same Google account, or
                    check Vercel runtime logs (prefix &quot;[ga4]&quot; or
                    &quot;[gsc]&quot;) for the underlying Google error.
                  </p>
                ) : null}
              </Card>
            );
          }
          if (props.hasGsc === false) {
            return (
              <Card className="border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 print:hidden">
                Search Console isn&apos;t connected — clicks, impressions and
                positions are sample. Connect in project settings to load real
                numbers.
              </Card>
            );
          }
          if (props.hasGa4 === false) {
            return (
              <Card className="border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 print:hidden">
                Analytics isn&apos;t connected — users, sessions and key events
                are sample. Connect a GA4 property in project settings to load
                real numbers.
              </Card>
            );
          }
          return null;
        })()}

        {/* KPI section */}
        {cfg.sections.kpis ? (
          <section data-pptx-slide id="report-section-kpis">
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
                icon={MousePointerClick}
                accent="primary"
              />
              <KpiCard
                label="Impressions"
                value={formatNumber(props.overview.totals.impressions)}
                current={props.overview.totals.impressions}
                previous={props.prevOverview?.totals.impressions}
                icon={Eye}
                accent="navy"
              />
              <KpiCard
                label="Avg position"
                value={formatPosition(props.overview.totals.position)}
                current={props.overview.totals.position}
                previous={props.prevOverview?.totals.position}
                invertDelta
                icon={TrendingUp}
                accent="primary"
              />
              <KpiCard
                label="Users"
                value={formatNumber(props.ga4Overview.totals.totalUsers)}
                current={props.ga4Overview.totals.totalUsers}
                previous={props.prevGa4?.totals.totalUsers}
                icon={Users}
                accent="navy"
              />
            </div>
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Key metrics"
            onShow={() => setSection("kpis", true)}
          />
        ) : null}

        {/* Analysis (free text — what the team observed in the metrics) */}
        {cfg.sections.analysis ? (
          <section data-pptx-slide>
            <EditableTextSection
              fieldKey="analysisNotes"
              projectId={props.project.id}
              title="Analysis"
              helper="What you observed in this period — trends, wins, concerns, next steps."
              placeholder="Add a short narrative analysing what the metrics above show. Paste links, screenshot URLs, or whatever helps the client understand the data."
              initialValue={analysisDraft}
              readOnly={props.mode === "snapshot"}
              icon={<FileText className="h-3.5 w-3.5" />}
              onPersistedChange={setAnalysisDraft}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Analysis (free-text)"
            onShow={() => setSection("analysis", true)}
          />
        ) : null}

        {/* Charts section */}
        {cfg.sections.chartClicksImpressions ||
        cfg.sections.chartPositionTrend ? (
          <div
            data-pptx-slide
            className={cn(
              "grid grid-cols-1 lg:grid-cols-2 print:!grid-cols-1",
              density.gap,
            )}
          >
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
          <section data-pptx-slide>
            <SectionHeader
              title=""
              editing={editing}
              onHide={() => setSection("keywords", false)}
              controls={limitControl("keywords", "Rows")}
            />
            <KeywordsSummary
              projectId={props.project.id}
              projectName={props.project.name}
              rows={props.keywords}
              limit={limitFor(cfg, "keywords")}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Tracked keywords"
            onShow={() => setSection("keywords", true)}
          />
        ) : null}

        {/* Report tables */}
        {showAnyTable ? (
          <section data-pptx-slide>
            <SectionHeader
              title="Search & analytics tables"
              editing={editing}
              controls={
                <>
                  {tableLimitControls}
                  {tablesSubsections}
                </>
              }
            />
            <ReportTables
              projectName={props.project.name}
              rangeLabel={`${props.reportPeriodLabel} · ${props.rangeLabel}`}
              queries={
                cfg.sections.topQueries
                  ? props.queries.slice(0, limitFor(cfg, "topQueries"))
                  : []
              }
              prevQueries={props.prevQueries}
              pages={
                cfg.sections.topPages
                  ? props.pages.slice(0, limitFor(cfg, "topPages"))
                  : []
              }
              prevPages={props.prevPages}
              channels={
                cfg.sections.ga4Channels
                  ? props.channels.slice(0, limitFor(cfg, "ga4Channels"))
                  : []
              }
              prevChannels={props.prevChannels}
              showQueries={cfg.sections.topQueries}
              showPages={cfg.sections.topPages}
              showChannels={cfg.sections.ga4Channels}
              rowLimit={100}
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

        {/* Backlinks (placed after the GSC/GA4 tables) */}
        {cfg.sections.backlinks ? (
          <section data-pptx-slide>
            {editing ? (
              <SectionHeader
                title=""
                editing={editing}
                onHide={() => setSection("backlinks", false)}
                controls={limitControl("backlinks", "Rows")}
              />
            ) : null}
            <BacklinksSection
              projectId={props.project.id}
              projectName={props.project.name}
              rangeLabel={props.rangeLabel}
              rows={props.backlinks}
              allRows={props.allBacklinks}
              monthly={props.backlinkMonthly}
              readOnly={props.mode === "snapshot"}
              limit={limitFor(cfg, "backlinks")}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Backlinks (pie chart + table)"
            onShow={() => setSection("backlinks", true)}
          />
        ) : null}

        {/* Other tasks — custom tasks, each with a name, link and notes. */}
        {cfg.sections.otherTasks ? (
          <section data-pptx-slide>
            <OtherTasksSection
              projectId={props.project.id}
              title="Other tasks"
              helper="On-page changes, technical fixes, content updates, outreach — add a task with a name, an optional link and notes."
              initialValue={otherTasksDraft}
              readOnly={props.mode === "snapshot"}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              onPersistedChange={setOtherTasksDraft}
            />
          </section>
        ) : editing ? (
          <HiddenSectionStub
            name="Other tasks"
            onShow={() => setSection("otherTasks", true)}
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
