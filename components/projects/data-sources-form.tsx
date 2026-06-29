"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type GscSite = { siteUrl: string; permissionLevel: string };
type Ga4Property = {
  propertyId: string;
  displayName: string;
  accountDisplayName: string;
};

const NONE = "__none__";

type Props = {
  projectId: string;
  initial: {
    gscSiteUrl: string | null;
    ga4PropertyId: string | null;
  };
  // Connected account emails per service (from project settings). When the two
  // differ, GSC and GA4 are saved independently with two buttons.
  gscEmail?: string | null;
  ga4Email?: string | null;
};

export function DataSourcesForm({
  projectId,
  initial,
  gscEmail = null,
  ga4Email = null,
}: Props) {
  const router = useRouter();
  const [sites, setSites] = useState<GscSite[] | null>(null);
  const [properties, setProperties] = useState<Ga4Property[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Per-source status so we can surface clear messages when one works and
  // the other doesn't (the common case is GSC fine + GA4 Admin API disabled).
  const [ga4Status, setGa4Status] = useState<{
    source: "live" | "stub";
    error?: string;
  } | null>(null);

  const [gscSiteUrl, setGscSiteUrl] = useState(initial.gscSiteUrl ?? NONE);
  const [ga4PropertyId, setGa4PropertyId] = useState(
    initial.ga4PropertyId ?? NONE,
  );

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sitesRes, propsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/integrations/sites`),
          fetch(`/api/projects/${projectId}/integrations/ga4-properties`),
        ]);
        if (!sitesRes.ok || !propsRes.ok) {
          throw new Error("Could not load Google data sources");
        }
        const { sites } = (await sitesRes.json()) as { sites: GscSite[] };
        const ga4Body = (await propsRes.json()) as {
          properties: Ga4Property[];
          source?: "live" | "stub";
          error?: string;
        };
        if (!cancelled) {
          setSites(sites);
          setProperties(ga4Body.properties);
          setGa4Status({
            source: ga4Body.source ?? "live",
            error: ga4Body.error,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Could not load",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const gscValue = gscSiteUrl === NONE ? null : gscSiteUrl;
  const ga4Value = ga4PropertyId === NONE ? null : ga4PropertyId;
  const gscDirty = gscValue !== initial.gscSiteUrl;
  const ga4Dirty = ga4Value !== initial.ga4PropertyId;
  const isDirty = gscDirty || ga4Dirty;

  // GSC and GA4 live under different Google accounts → save each separately.
  const differentAccounts = !!gscEmail && !!ga4Email && gscEmail !== ga4Email;

  function patch(body: Record<string, unknown>, successMsg: string) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Could not save data sources");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  const saveBoth = () =>
    patch(
      { gscSiteUrl: gscValue, ga4PropertyId: ga4Value },
      "Data sources updated",
    );
  const saveGsc = () =>
    patch({ gscSiteUrl: gscValue }, "Search Console site saved");
  const saveGa4 = () => patch({ ga4PropertyId: ga4Value }, "GA4 property saved");

  const siteOptions = useMemo(
    () =>
      (sites ?? []).map((s) => ({
        value: s.siteUrl,
        label: s.siteUrl,
        helper: s.permissionLevel,
      })),
    [sites],
  );
  const propertyOptions = useMemo(
    () =>
      (properties ?? []).map((p) => ({
        value: p.propertyId,
        label: p.displayName,
        helper: `${p.accountDisplayName} · ${p.propertyId}`,
      })),
    [properties],
  );

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Search Console site
            {gscEmail ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {gscEmail}
              </span>
            ) : null}
          </Label>
          <SearchableSelect
            value={gscSiteUrl}
            onChange={setGscSiteUrl}
            options={siteOptions}
            loading={sites === null}
            placeholder="Select a site"
            emptyMessage="No matching sites"
            noneOption={{ value: NONE, label: "Not connected" }}
          />
          <p className="text-xs text-muted-foreground">
            Type to filter — works across hundreds of properties. Pick the{" "}
            <span className="font-mono">sc-domain:</span> property or a specific
            URL prefix.
          </p>
        </div>
        <div className="space-y-2">
          <Label>
            GA4 property
            {ga4Email ? (
              <span className="ml-1 font-normal text-muted-foreground">
                · {ga4Email}
              </span>
            ) : null}
          </Label>
          <SearchableSelect
            value={ga4PropertyId}
            onChange={setGa4PropertyId}
            options={propertyOptions}
            loading={properties === null}
            placeholder="Select a property"
            emptyMessage="No matching properties"
            noneOption={{ value: NONE, label: "Not connected" }}
          />
          {ga4Status?.source === "stub" && ga4Status.error ? (
            <Card className="border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Showing demo properties (real ones couldn&apos;t load)
                  </p>
                  <p className="leading-relaxed">{ga4Status.error}</p>
                </div>
              </div>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">
              Type the account, property name, or numeric ID to find it fast.
            </p>
          )}
        </div>
      </div>
      {differentAccounts ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveGsc} disabled={!gscDirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save GSC project
          </Button>
          <Button onClick={saveGa4} disabled={!ga4Dirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save GA4 project
          </Button>
        </div>
      ) : (
        <Button onClick={saveBoth} disabled={!isDirty || isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save data sources
        </Button>
      )}
    </div>
  );
}
