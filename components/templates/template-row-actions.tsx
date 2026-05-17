"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  id: string;
  isDefault: boolean;
  projectCount: number;
};

export function TemplateRowActions({ id, isDefault, projectCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setDefault() {
    startTransition(async () => {
      const res = await fetch(`/api/workspace/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        toast.error("Could not set as default");
        return;
      }
      toast.success("Marked as default");
      router.refresh();
    });
  }

  function del() {
    if (isDefault) {
      toast.error("Pick another default before deleting this one");
      return;
    }
    const msg =
      projectCount > 0
        ? `Delete this template? ${projectCount} project${projectCount === 1 ? "" : "s"} will fall back to the workspace default.`
        : "Delete this template?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await fetch(`/api/workspace/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not delete");
        return;
      }
      toast.success("Template deleted");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Template actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isDefault ? (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDefault();
            }}
            disabled={isPending}
          >
            <Star className="mr-2 h-4 w-4" />
            Set as default
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            del();
          }}
          disabled={isPending || isDefault}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
