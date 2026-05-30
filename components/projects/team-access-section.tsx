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
import { SearchableSelect } from "@/components/ui/searchable-select";

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

const ROLE_LABEL: Record<string, string> = {
  viewer: "Viewer",
  editor: "Editor",
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
  const [pickRole, setPickRole] = useState<string>("viewer");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  const sortedCandidates = useMemo(
    () =>
      [...candidates]
        .sort((a, b) =>
          (a.name ?? a.email).localeCompare(b.name ?? b.email),
        )
        .map((c) => ({
          value: c.userId,
          label: c.name ?? c.email,
          helper: c.email,
        })),
    [candidates],
  );

  function add() {
    if (!pickUserId) return;
    startAdding(async () => {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pickUserId, role: pickRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not grant access");
        return;
      }
      toast.success("Access granted");
      setPickUserId("");
      setPickRole("viewer");
      router.refresh();
    });
  }

  async function changeRole(m: Member, newRole: string) {
    if (newRole === m.role) return;
    setBusyMemberId(m.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${m.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not update role");
        return;
      }
      toast.success(
        `${m.name ?? m.email} is now a ${ROLE_LABEL[newRole] ?? newRole}`,
      );
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyMemberId(null);
    }
  }

  async function remove(m: Member) {
    if (!confirm(`Revoke ${m.email}'s access to this project?`)) return;
    setBusyMemberId(m.id);
    try {
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
    } catch {
      toast.error("Network error");
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
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
            {members.map((m) => {
              const busy = busyMemberId === m.id;
              return (
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
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => changeRole(m, v)}
                        disabled={busy}
                      >
                        <SelectTrigger className="h-8 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    )}
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(m)}
                        disabled={busy}
                        aria-label="Remove"
                        className="h-8 w-8"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {canManage && members.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>Viewer</strong> can open the project and read everything.{" "}
            <strong>Editor</strong> can also add backlinks, save reports, and
            edit the analysis/other-tasks text.
          </p>
        ) : null}
      </div>

      {canManage ? (
        sortedCandidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Every workspace member is already an admin or already has access to
            this project.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Grant access to
              </label>
              <SearchableSelect
                value={pickUserId}
                onChange={setPickUserId}
                options={sortedCandidates}
                placeholder="Pick a workspace member…"
                emptyMessage="No matching members"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Role
              </label>
              <Select value={pickRole} onValueChange={setPickRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:pt-5">
              <Button
                onClick={add}
                disabled={!pickUserId || isAdding}
                className="w-full sm:w-auto"
              >
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Grant
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
