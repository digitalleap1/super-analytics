"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

type CandidateUser = {
  userId: string;
  email: string;
  name: string | null;
  role: string; // workspace role
};

type Props = {
  projectId: string;
  members: Member[];
  // Workspace members who could be added (not already on the project, not admins)
  candidates: CandidateUser[];
  // Workspace admins shown as "implicit" access (cannot be removed here)
  implicitAdmins: { userId: string; email: string; name: string | null }[];
  canManage: boolean;
};

export function TeamAccessSection({
  projectId,
  members,
  candidates,
  implicitAdmins,
  canManage,
}: Props) {
  const router = useRouter();
  const [pickUserId, setPickUserId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const sortedCandidates = useMemo(
    () =>
      [...candidates].sort((a, b) =>
        (a.name ?? a.email).localeCompare(b.name ?? b.email),
      ),
    [candidates],
  );

  function add() {
    if (!pickUserId) return;
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pickUserId, role: "viewer" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not grant access");
        return;
      }
      toast.success("Access granted");
      setPickUserId("");
      router.refresh();
    });
  }

  function remove(m: Member) {
    if (!confirm(`Revoke ${m.email}'s access to this project?`)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/members/${m.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not revoke");
        return;
      }
      toast.success(`Removed ${m.email}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {implicitAdmins.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace admins (automatic access)
          </p>
          <ul className="mt-2 space-y-1">
            {implicitAdmins.map((a) => (
              <li
                key={a.userId}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>{a.name ?? a.email}</span>
                <span className="font-mono text-xs">·  {a.email}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Direct members
        </p>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No regular members have access yet. Add teammates below.
          </p>
        ) : (
          <ul className="mt-2 divide-y rounded-md border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.name ?? m.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground font-mono">
                    {m.email}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(m)}
                    disabled={isPending}
                    aria-label="Remove"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage ? (
        sortedCandidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Every workspace member is already an admin or already has access to
            this project.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Grant access to
              </label>
              <Select value={pickUserId} onValueChange={setPickUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a workspace member..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedCandidates.map((c) => (
                    <SelectItem key={c.userId} value={c.userId}>
                      {c.name ?? c.email} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} disabled={!pickUserId || isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Grant access
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
