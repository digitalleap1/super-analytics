"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  projectId: string;
  reportId: string;
};

export function SavedReportRowActions({ projectId, reportId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function del() {
    if (!confirm("Delete this past report? Any public share link will stop working.")) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/reports/${reportId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Could not delete");
        return;
      }
      toast.success("Past report deleted");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Past report actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            del();
          }}
          disabled={isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
