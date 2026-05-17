import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { parseTemplateConfig } from "@/lib/templates";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TemplateEditor } from "@/components/templates/template-editor";
import { ApplyToProjects } from "@/components/templates/apply-to-projects";

export const metadata = {
  title: "Edit template — SEO Dashboard",
};

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const { workspace } = await requireWorkspace();

  const template = await prisma.reportTemplate.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!template) notFound();

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, domain: true, templateId: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/settings/templates"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit template
        </h1>
        <p className="text-sm text-muted-foreground">
          Changes affect every project assigned to this template.
        </p>
      </div>

      <TemplateEditor
        mode="edit"
        templateId={template.id}
        initial={{
          name: template.name,
          description: template.description,
          isDefault: template.isDefault,
          config: parseTemplateConfig(template.config),
        }}
      />

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Apply to projects
        </h2>
        <Card className="p-5">
          <ApplyToProjects
            templateId={template.id}
            templateName={template.name}
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              domain: p.domain,
              currentTemplateId: p.templateId,
            }))}
          />
        </Card>
      </section>
    </div>
  );
}
