"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google";

type Props = {
  projectId: string;
  connection: {
    email: string | null;
    connectedAt: string;
  } | null;
  canManage: boolean;
};

export function ProjectGoogleConnect({
  projectId,
  connection,
  canManage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function disconnect() {
    if (
      !confirm(
        "Disconnect this project's Google account? GSC + GA4 data will fall back to your personal Google connection (if any), otherwise to sample data.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/google/disconnect`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Could not disconnect");
        return;
      }
      toast.success("Project disconnected from Google");
      router.refresh();
    });
  }

  if (connection) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium">
              Connected to Google for this project
            </p>
            <p className="text-xs text-muted-foreground">
              {connection.email ? (
                <>
                  Using <span className="font-mono">{connection.email}</span> ·
                  connected {connection.connectedAt}
                </>
              ) : (
                <>Connected {connection.connectedAt}</>
              )}
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/projects/${projectId}/google/connect`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Re-authorise
              </a>
            </Button>
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
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <GoogleIcon className="mt-0.5 h-5 w-5" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Connect this project to its own Google account
          </p>
          <p className="text-xs text-muted-foreground">
            Each project can have its own Google connection — perfect for an
            agency where every client&apos;s Search Console + Analytics live
            under a different Google account. The token is stored just for
            this project; nothing leaks between projects.
          </p>
        </div>
      </div>
      <div className="mt-4">
        {canManage ? (
          <Button asChild>
            <a
              href={`/api/projects/${projectId}/google/connect`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Connect Google for this project
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ask a workspace admin to set up the Google connection for this
            project.
          </p>
        )}
      </div>
    </div>
  );
}
