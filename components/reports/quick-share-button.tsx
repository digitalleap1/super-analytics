"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  projectId: string;
  defaultName: string;
  fromDate: string;
  toDate: string;
  buildSnapshot: () => unknown;
};

export function QuickShareButton({
  projectId,
  defaultName,
  fromDate,
  toDate,
  buildSnapshot,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function start() {
    startTransition(async () => {
      const snapshot = JSON.stringify(buildSnapshot());
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: defaultName,
          snapshot,
          fromDate,
          toDate,
          share: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not create share link");
        return;
      }
      const body = (await res.json()) as { shareUrl: string | null };
      if (!body.shareUrl) {
        toast.error("Snapshot saved but no share URL returned");
        return;
      }
      setShareUrl(body.shareUrl);
      // Auto-copy so the user gets the link instantly.
      try {
        await navigator.clipboard.writeText(body.shareUrl);
        setCopied(true);
        toast.success("Share link copied to clipboard");
      } catch {
        toast.success("Share link ready — copy it manually below");
      }
      router.refresh();
    });
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={start}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="mr-2 h-4 w-4" />
        )}
        Share
      </Button>
      <Dialog
        open={!!shareUrl}
        onOpenChange={(o) => {
          if (!o) {
            setShareUrl(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share link ready</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the report — KPIs, charts, top
              queries, top pages, GA4 channels, keywords, and backlinks. No
              sign-in required. Numbers are frozen at the moment you clicked
              Share, so the client always sees the same view.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-muted/30 pl-3">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                readOnly
                value={shareUrl ?? ""}
                className="h-9 border-0 bg-transparent px-2 font-mono text-xs focus-visible:ring-0"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <Button onClick={copy} variant="outline">
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Saved to{" "}
            <a
              href={`/projects/${projectId}/reports`}
              className="text-primary hover:underline"
            >
              this project&apos;s saved reports
            </a>{" "}
            — you can revoke the link from there at any time.
          </p>
          <DialogFooter>
            <Button onClick={() => setShareUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
