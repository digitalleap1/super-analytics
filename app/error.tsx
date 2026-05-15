"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message ||
            "The page hit an unexpected error. Try again, or refresh the browser."}
        </p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
