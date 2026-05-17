"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  projectId: string;
  defaultName: string;
  fromDate: string;
  toDate: string;
  buildSnapshot: () => unknown; // called only on submit so the JSON stays fresh
};

export function SaveReportDialog({
  projectId,
  defaultName,
  fromDate,
  toDate,
  buildSnapshot,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      const snapshot = JSON.stringify(buildSnapshot());
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          snapshot,
          fromDate,
          toDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not save");
        return;
      }
      const { report } = (await res.json()) as {
        report: { id: string; name: string };
      };
      toast.success(`Saved "${report.name}"`);
      setOpen(false);
      router.push(`/projects/${projectId}/reports/${report.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setName(defaultName)}
        >
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Save report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save report</DialogTitle>
          <DialogDescription>
            Freezes the current view — KPIs, charts, tables, keywords, and
            backlinks — into a snapshot you can revisit or share with clients
            anytime. Live data keeps updating in the background; the saved
            version stays exactly as it is now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="report-name">Name</Label>
          <Input
            id="report-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="May 2026 client report"
          />
          <p className="text-xs text-muted-foreground">
            Range: <span className="font-mono">{fromDate}</span> →{" "}
            <span className="font-mono">{toDate}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
