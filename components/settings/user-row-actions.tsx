"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreVertical,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "owner" | "admin" | "member" | "viewer";

type Props = {
  userId: string;
  email: string;
  isInWorkspace: boolean;
  workspaceRole: Role | null;
  isYou: boolean;
};

function randomPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += chars[arr[i] % chars.length];
  return s;
}

export function UserRowActions(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pwOpen, setPwOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [pw, setPw] = useState(() => randomPassword());
  const [showPw, setShowPw] = useState(true);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<Role>(
    props.workspaceRole === "owner" ? "owner" : (props.workspaceRole ?? "member"),
  );

  function addToWorkspace() {
    startTransition(async () => {
      const res = await fetch(`/api/workspace/users/${props.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "member" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not add user");
        return;
      }
      toast.success(`Added ${props.email} to the workspace`);
      router.refresh();
    });
  }

  function changeRole() {
    startTransition(async () => {
      const res = await fetch(`/api/workspace/users/${props.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not change role");
        return;
      }
      toast.success(`Role updated to ${role}`);
      setRoleOpen(false);
      router.refresh();
    });
  }

  function resetPassword() {
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/workspace/users/${props.userId}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not reset password");
        return;
      }
      toast.success(`Password reset for ${props.email} — share it now`);
      // Leave the dialog open so the admin can still copy the password
    });
  }

  function remove() {
    if (
      !confirm(
        `Remove ${props.email} from this workspace? They keep their account but lose access to projects.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await fetch(`/api/workspace/users/${props.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not remove");
        return;
      }
      toast.success(`Removed ${props.email}`);
      router.refresh();
    });
  }

  async function copyPw() {
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      toast.success("Password copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="User actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!props.isInWorkspace ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                addToWorkspace();
              }}
              disabled={isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add to workspace
            </DropdownMenuItem>
          ) : null}
          {props.isInWorkspace ? (
            <>
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setPw(randomPassword());
                  setCopied(false);
                  setPwOpen(true);
                }}
                disabled={isPending}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setRoleOpen(true);
                }}
                disabled={isPending || props.isYou}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Change role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  remove();
                }}
                disabled={isPending || props.isYou}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from workspace
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {props.email}</DialogTitle>
            <DialogDescription>
              Sets a new password immediately. The user will need to sign in
              with it. <strong>Copy the password before closing</strong> — it
              won&apos;t be shown again (passwords are hashed in the database).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide" : "Show"}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPw(randomPassword())}
                aria-label="Regenerate"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPw}
                aria-label="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>
              Close
            </Button>
            <Button onClick={resetPassword} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role for {props.email}</DialogTitle>
            <DialogDescription>
              Owners and admins see every project in the workspace. Members and
              viewers only see projects they&apos;ve been explicitly added to
              from each project&apos;s Team access section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">
                  Owner — full control, can delete workspace
                </SelectItem>
                <SelectItem value="admin">
                  Admin — sees all projects, manages users
                </SelectItem>
                <SelectItem value="member">
                  Member — edits assigned projects
                </SelectItem>
                <SelectItem value="viewer">
                  Viewer — read-only, only assigned projects
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={changeRole} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
