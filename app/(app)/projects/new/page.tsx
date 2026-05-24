import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { NewProjectWizard } from "@/components/projects/new-project-wizard";

export const metadata = {
  title: "New project — Super Analytics",
};

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New project
        </h1>
      </div>
      <NewProjectWizard />
    </div>
  );
}
