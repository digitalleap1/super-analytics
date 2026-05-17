import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/templates";
import { TemplateEditor } from "@/components/templates/template-editor";

export const metadata = {
  title: "New template — SEO Dashboard",
};

export default async function NewTemplatePage() {
  await requireWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/templates"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New template
        </h1>
        <p className="text-sm text-muted-foreground">
          Define what the report looks like; assign it to projects after saving.
        </p>
      </div>
      <TemplateEditor
        mode="create"
        initial={{
          name: "",
          description: null,
          isDefault: false,
          config: DEFAULT_TEMPLATE_CONFIG,
        }}
      />
    </div>
  );
}
