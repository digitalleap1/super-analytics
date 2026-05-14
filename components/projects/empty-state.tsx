import Link from "next/link";
import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyProjectsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FolderPlus className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first project, then connect it to Google Search Console and
        Analytics to see unified reporting.
      </p>
      <Button asChild className="mt-6">
        <Link href="/projects/new">Create your first project</Link>
      </Button>
    </div>
  );
}
