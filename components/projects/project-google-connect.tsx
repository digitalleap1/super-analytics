"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google";

export type GoogleConn = {
  email: string | null;
  connectedAt: string;
  // which stored account backs this service: a dedicated one or a shared "all".
  via: "all" | "search_console" | "analytics";
} | null;

type Props = {
  projectId: string;
  gsc: GoogleConn;
  ga4: GoogleConn;
  canManage: boolean;
};

const viaToParam = {
  all: "all",
  search_console: "gsc",
  analytics: "ga4",
} as const;

function ServiceRow({
  projectId,
  label,
  hint,
  conn,
  connectParam,
  canManage,
}: {
  projectId: string;
  label: string;
  hint: string;
  conn: GoogleConn;
  connectParam: "gsc" | "ga4";
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function disconnect() {
    if (!conn) return;
    if (
      !confirm(
        `Disconnect ${label}? It will fall back to sample data until reconnected.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/google/disconnect?service=${viaToParam[conn.via]}`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Could not disconnect");
        return;
      }
      toast.success(`${label} disconnected`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex items-center gap-3">
        {conn ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <GoogleIcon className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {conn ? (
              <>
                Connected
                {conn.email ? (
                  <>
                    {" "}
                    as <span className="font-mono">{conn.email}</span>
                  </>
                ) : null}
                {conn.via === "all" ? " · shared account" : ""}
              </>
            ) : (
              hint
            )}
          </p>
        </div>
      </div>
      {canManage ? (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/projects/${projectId}/google/connect?service=${connectParam}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {conn ? "Re-authorise" : "Connect"}
            </a>
          </Button>
          {conn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectGoogleConnect({
  projectId,
  gsc,
  ga4,
  canManage,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <p className="text-sm font-medium">Google data sources for this project</p>
        <p className="text-xs text-muted-foreground">
          Connect Search Console and Analytics separately — useful when a
          client&apos;s GSC and GA4 live under different Google accounts. If
          they&apos;re on the <strong>same</strong> account, use{" "}
          <strong>Connect both</strong> below to authorise just once. The tokens
          are stored only for this project.
        </p>
      </div>

      <ServiceRow
        projectId={projectId}
        label="Search Console"
        hint="Not connected — sign in with the account that has GSC access."
        conn={gsc}
        connectParam="gsc"
        canManage={canManage}
      />
      <ServiceRow
        projectId={projectId}
        label="Google Analytics (GA4)"
        hint="Not connected — sign in with the account that has GA4 access."
        conn={ga4}
        connectParam="ga4"
        canManage={canManage}
      />

      {canManage && (!gsc || !ga4) ? (
        <div className="pt-1">
          <Button asChild>
            <a
              href={`/api/projects/${projectId}/google/connect?service=all`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Connect both with one account
            </a>
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Same Google account owns both Search Console and Analytics? Connect
            once here and it covers both.
          </p>
        </div>
      ) : null}
    </div>
  );
}
