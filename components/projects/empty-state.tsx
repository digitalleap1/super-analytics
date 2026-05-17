import Link from "next/link";
import { FolderPlus, BarChart3, LineChart, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyProjectsState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-16 text-center">
      {/* decorative floating icons */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <Search className="absolute left-[12%] top-8 h-6 w-6 -rotate-12 text-primary/30" />
        <LineChart className="absolute right-[15%] top-12 h-7 w-7 rotate-6 text-primary/30" />
        <BarChart3 className="absolute bottom-10 left-[18%] h-6 w-6 rotate-3 text-primary/25" />
        <Search className="absolute bottom-12 right-[12%] h-5 w-5 -rotate-12 text-primary/30" />
      </div>
      <div className="relative">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
          <FolderPlus className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">
          No projects yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Create your first project, then connect it to Google Search Console
          and Analytics to see unified reporting in one place.
        </p>
        <Button asChild className="mt-6 shadow-sm shadow-primary/20" size="lg">
          <Link href="/projects/new">Create your first project</Link>
        </Button>
      </div>
    </div>
  );
}
