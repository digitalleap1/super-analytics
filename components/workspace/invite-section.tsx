"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "admin" | "member" | "viewer";

export function InviteSection({ canInvite }: { canInvite: boolean }) {
  const [role, setRole] = useState<Role>("member");
  const [link, setLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function generate() {
    startTransition(async () => {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not create invite");
        return;
      }
      const { invite } = (await res.json()) as { invite: { url: string } };
      setLink(invite.url);
      setCopied(false);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  if (!canInvite) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Only workspace owners and admins can create invites. Ask an owner to add
        you as an admin if you need to invite teammates.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label>Role for invited user</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                Admin — can manage members + projects
              </SelectItem>
              <SelectItem value="member">
                Member — can edit projects
              </SelectItem>
              <SelectItem value="viewer">Viewer — read-only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : link ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : null}
            {link ? "Generate new link" : "Generate invite link"}
          </Button>
        </div>
      </div>
      {link ? (
        <div className="space-y-2">
          <Label>Share this link</Label>
          <div className="flex gap-2">
            <Input value={link} readOnly className="font-mono text-xs" />
            <Button onClick={copy} variant="outline">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expires in 14 days. Single-use — once someone joins with it, it
            can&apos;t be reused.
          </p>
        </div>
      ) : null}
    </div>
  );
}
