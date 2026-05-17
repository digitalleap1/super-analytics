"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  projectId: string;
  reportId: string;
  initialToken: string | null;
};

export function SavedReportShare({
  projectId,
  reportId,
  initialToken,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = token ? `${baseUrl}/r/${token}` : null;

  function generate() {
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/reports/${reportId}/share`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Could not create share link");
        return;
      }
      const body = (await res.json()) as { token: string };
      setToken(body.token);
      toast.success("Share link ready");
      router.refresh();
    });
  }

  function revoke() {
    if (!confirm("Revoke the share link? The current URL stops working.")) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/reports/${reportId}/share`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Could not revoke");
        return;
      }
      setToken(null);
      toast.success("Share link revoked");
      router.refresh();
    });
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  if (!token) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Globe className="mr-2 h-4 w-4" />
        )}
        Create share link
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex w-full min-w-[260px] max-w-md items-center gap-1.5 rounded-md border bg-muted/30 pl-3 sm:w-auto">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          readOnly
          value={shareUrl ?? ""}
          className="h-9 border-0 bg-transparent px-2 font-mono text-xs focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={copy}
          aria-label="Copy share link"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={revoke}
        disabled={isPending}
      >
        <ShieldOff className="mr-2 h-4 w-4" />
        Revoke
      </Button>
    </div>
  );
}
