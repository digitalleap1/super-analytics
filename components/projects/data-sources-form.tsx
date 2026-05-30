"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
};

export function DataSourcesForm({ projectId, initial }: Props) {
  const router = useRouter();
  const [sites, setSites] = useState<GscSite[] | null>(null);
  const [properties, setProperties] = useState<Ga4Property[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [gscSiteUrl, setGscSiteUrl] = useState(initial.gscSiteUrl ?? NONE);
  const [ga4PropertyId, setGa4PropertyId] = useState(
    initial.ga4PropertyId ?? NONE,
  );

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Project-scoped endpoints first — these use the project's own Google
        // connection if one's been set up; otherwise they fall back to the
        // viewing user's personal connection.
        const [sitesRes, propsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/integrations/sites`),
          fetch(`/api/projects/${projectId}/integrations/ga4-properties`),
        ]);
        if (!sitesRes.ok || !propsRes.ok) {
          throw new Error("Could not load Google data sources");
        }
        const { sites } = (await sitesRes.json()) as { sites: GscSite[] };
        const { properties } = (await propsRes.json()) as {
          properties: Ga4Property[];
        };
        if (!cancelled) {
          setSites(sites);
          setProperties(properties);
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
  }, []);

  const isDirty =
    (gscSiteUrl === NONE ? null : gscSiteUrl) !== initial.gscSiteUrl ||
    (ga4PropertyId === NONE ? null : ga4PropertyId) !== initial.ga4PropertyId;

  function save() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gscSiteUrl: gscSiteUrl === NONE ? null : gscSiteUrl,
          ga4PropertyId: ga4PropertyId === NONE ? null : ga4PropertyId,
        }),
      });
      if (!res.ok) {
        toast.error("Could not save data sources");
        return;
      }
      toast.success("Data sources updated");
      router.refresh();
    });
  }

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
          <Label>Search Console site</Label>
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
          <Label>GA4 property</Label>
          <SearchableSelect
            value={ga4PropertyId}
            onChange={setGa4PropertyId}
            options={propertyOptions}
            loading={properties === null}
            placeholder="Select a property"
            emptyMessage="No matching properties"
            noneOption={{ value: NONE, label: "Not connected" }}
          />
          <p className="text-xs text-muted-foreground">
            Type the account, property name, or numeric ID to find it fast.
          </p>
        </div>
      </div>
      <Button onClick={save} disabled={!isDirty || isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save data sources
      </Button>
    </div>
  );
}
