"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google";

type Props = {
  connectedEmail: string | null;
  currentUserEmail: string | null | undefined;
};

export function GoogleConnect({ connectedEmail, currentUserEmail }: Props) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function connect() {
    setIsConnecting(true);
    try {
      await signIn("google", { callbackUrl: "/settings?google=connected" });
    } catch {
      toast.error("Could not start Google sign-in");
      setIsConnecting(false);
    }
  }

  function disconnect() {
    if (!confirm("Disconnect your Google account? Reports will fall back to sample data.")) {
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Could not disconnect");
        return;
      }
      toast.success("Google account disconnected");
      router.refresh();
    });
  }

  if (connectedEmail) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium">Google connected</p>
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-mono">{connectedEmail}</span>
            </p>
          </div>
        </div>
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
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <GoogleIcon className="mt-0.5 h-5 w-5" />
        <div className="flex-1">
          <p className="text-sm font-medium">Google not connected</p>
          <p className="text-xs text-muted-foreground">
            Connect to read live data from Search Console and Analytics.
            {currentUserEmail ? (
              <>
                {" "}
                Pick the Google account that matches{" "}
                <span className="font-mono">{currentUserEmail}</span> so they
                link automatically.
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={connect} disabled={isConnecting} size="sm">
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Connect Google
        </Button>
      </div>
    </div>
  );
}
