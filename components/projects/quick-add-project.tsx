"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
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

// Fast path to spin up a project: name + domain only, then drop straight into
// the project's settings where the Connect Google + data-source pickers live
// (same UI as the full wizard's steps 2–3). For when you don't need the guided
// keyword flow.
export function QuickAddProject() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [isPending, startTransition] = useTransition();

  function create() {
    if (!name.trim() || !domain.trim()) {
      toast.error("Enter a project name and domain");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not create project");
        return;
      }
      const { project } = (await res.json()) as {
        project: { id: string; name: string };
      };
      toast.success(`Created ${project.name} — connect Google below`);
      setOpen(false);
      setName("");
      setDomain("");
      // Land on settings, anchored to the Data sources section.
      router.push(`/projects/${project.id}/settings`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Zap className="mr-2 h-4 w-4" />
          Quick add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick add project</DialogTitle>
          <DialogDescription>
            Create the project now and connect Search Console &amp; Analytics on
            the next screen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="qa-name">Project name</Label>
            <Input
              id="qa-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qa-domain">Primary domain</Label>
            <Input
              id="qa-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Without https:// — just the bare domain.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create &amp; connect Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
