import Link from "next/link";
import { ChevronLeft, FilePlus2 } from "lucide-react";

import { requireWorkspace } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceDefaultTemplate } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TemplateRowActions } from "@/components/templates/template-row-actions";

export const metadata = {
  title: "Report templates — SEO Dashboard",
};

export default async function TemplatesPage() {
  const { workspace } = await requireWorkspace();
  await ensureWorkspaceDefaultTemplate(workspace.id);

  const templates = await prisma.reportTemplate.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      _count: { select: { projects: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to settings
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Report templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Reusable layouts for project reports + PDF exports.
            </p>
          </div>
          <Button asChild>
            <Link href="/settings/templates/new">
              <FilePlus2 className="mr-2 h-4 w-4" />
              New template
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">
                  {t.name}
                  {t.isDefault ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      default
                    </span>
                  ) : null}
                </h3>
                {t.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}
              </div>
              <TemplateRowActions
                id={t.id}
                isDefault={t.isDefault}
                projectCount={t._count.projects}
              />
            </div>
            <p className="mt-auto pt-3 text-xs text-muted-foreground">
              Used by {t._count.projects} project
              {t._count.projects === 1 ? "" : "s"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/settings/templates/${t.id}`}>Edit</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
