"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Member = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isYou: boolean;
};

type Props = {
  members: Member[];
  canManage: boolean;
};

function initials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function roleColor(role: string): string {
  switch (role) {
    case "owner":
      return "bg-primary/10 text-primary";
    case "admin":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "viewer":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export function MembersList({ members, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove(m: Member) {
    const verb = m.isYou ? "Leave the workspace?" : `Remove ${m.email}?`;
    if (!confirm(verb)) return;
    startTransition(async () => {
      const res = await fetch(`/api/workspace/members/${m.membershipId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not remove");
        return;
      }
      toast.success(m.isYou ? "You left the workspace" : `Removed ${m.email}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      <ul className="divide-y">
        {members.map((m) => {
          const canRemove = m.isYou || (canManage && m.role !== "owner");
          return (
            <li key={m.membershipId} className="flex items-center gap-3 p-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name ?? m.email}
                  {m.isYou ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground font-mono">
                  {m.email}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColor(m.role)}`}
              >
                {m.role}
              </span>
              {canRemove ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(m)}
                  disabled={isPending}
                  aria-label={m.isYou ? "Leave workspace" : "Remove member"}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
