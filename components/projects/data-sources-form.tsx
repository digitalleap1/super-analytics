"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
        const [sitesRes, propsRes] = await Promise.all([
          fetch("/api/integrations/google/sites"),
          fetch("/api/integrations/google/ga4-properties"),
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

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Search Console site</Label>
          <Select value={gscSiteUrl} onValueChange={setGscSiteUrl}>
            <SelectTrigger>
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not connected</SelectItem>
              {sites === null ? (
                <SelectItem disabled value="__loading_sites__">
                  Loading…
                </SelectItem>
              ) : (
                sites.map((s) => (
                  <SelectItem key={s.siteUrl} value={s.siteUrl}>
                    {s.siteUrl}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Either a verified <span className="font-mono">sc-domain:</span>{" "}
            property or a specific URL prefix.
          </p>
        </div>
        <div className="space-y-2">
          <Label>GA4 property</Label>
          <Select value={ga4PropertyId} onValueChange={setGa4PropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not connected</SelectItem>
              {properties === null ? (
                <SelectItem disabled value="__loading_props__">
                  Loading…
                </SelectItem>
              ) : (
                properties.map((p) => (
                  <SelectItem key={p.propertyId} value={p.propertyId}>
                    {p.displayName}
                    <span className="ml-2 text-muted-foreground">
                      ({p.propertyId})
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The numeric property ID — no <span className="font-mono">properties/</span>{" "}
            prefix needed.
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
