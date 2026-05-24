"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WorkspaceRole = "admin" | "member" | "viewer";

type Project = {
  id: string;
  name: string;
  domain: string;
};

function randomPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const len = 14;
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

export function CreateUserForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => randomPassword());
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function regen() {
    setPassword(randomPassword());
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Password copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  function toggleProject(id: string) {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setName("");
    setEmail("");
    setPassword(randomPassword());
    setRole("member");
    setSelectedProjects(new Set());
    setFilter("");
  }

  function save() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("Name, email, and password (8+ chars) required");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/workspace/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          workspaceRole: role,
          projectIds: Array.from(selectedProjects),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not create user");
        return;
      }
      const body = (await res.json()) as { createdNew: boolean };
      toast.success(
        body.createdNew
          ? `User ${email} created — share the password with them`
          : `Existing user ${email} added to workspace`,
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const filteredProjects = projects.filter((p) => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return p.name.toLowerCase().includes(f) || p.domain.toLowerCase().includes(f);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a teammate</DialogTitle>
          <DialogDescription>
            Creates an account immediately. Share the password with them — they
            can change it later from their settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cu-name">Name</Label>
              <Input
                id="cu-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Kumar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-email">Email</Label>
              <Input
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@agency.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-password">Temporary password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="cu-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? (
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
                onClick={regen}
                aria-label="Regenerate"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPassword}
                aria-label="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They&apos;ll use this password to sign in the first time. You can
              regenerate or type your own.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Workspace role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as WorkspaceRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  Admin — sees all projects, can manage users
                </SelectItem>
                <SelectItem value="member">
                  Member — sees only assigned projects (pick below)
                </SelectItem>
                <SelectItem value="viewer">
                  Viewer — read-only, only assigned projects
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role !== "admin" ? (
            <div className="space-y-2">
              <Label>Project access</Label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search projects..."
              />
              <div className="max-h-44 overflow-y-auto rounded-md border">
                {filteredProjects.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    No projects match.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filteredProjects.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(p.id)}
                            onChange={() => toggleProject(p.id)}
                            className="accent-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.domain}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedProjects.size} of {projects.length} project
                {projects.length === 1 ? "" : "s"} selected. They&apos;ll only
                see these on their dashboard.
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
