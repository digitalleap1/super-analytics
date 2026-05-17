import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const configSchema = z
  .object({
    sections: z.record(z.string(), z.boolean()),
    layout: z.object({
      kpiColumns: z.number().int().min(3).max(6),
      density: z.enum(["compact", "comfortable", "spacious"]),
      tableLimit: z.number().int().refine((n) => [10, 25, 50, 100].includes(n)),
    }),
    branding: z.object({
      headerText: z.string().nullable(),
      footerText: z.string().nullable(),
    }),
  })
  .passthrough();

const bodySchema = z.object({
  config: configSchema,
  // "in_place" — update the project's current template (create one if it has
  //              none yet); errors out if the template is shared by other
  //              projects and `force` isn't true.
  // "fork"     — always create a NEW template, assign to this project only.
  mode: z.enum(["in_place", "fork"]).default("in_place"),
  force: z.boolean().default(false),
  projectName: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { project, response } = await getApiProject(params.id);
  if (!project) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { config, mode, force, projectName } = parsed.data;
  const configString = JSON.stringify(config);

  // Path A — project already has a template assigned.
  if (project.templateId && mode === "in_place") {
    const tpl = await prisma.reportTemplate.findFirst({
      where: { id: project.templateId, workspaceId: project.workspaceId },
      include: { _count: { select: { projects: true } } },
    });
    if (tpl) {
      // Shared template guardrail.
      if (tpl._count.projects > 1 && !force) {
        return NextResponse.json(
          {
            error: "shared_template",
            message: `This template is also used by ${tpl._count.projects - 1} other project(s). Pick "Fork" to save changes only for this project, or re-submit with force:true to update all of them.`,
            sharedWith: tpl._count.projects - 1,
          },
          { status: 409 },
        );
      }
      const updated = await prisma.reportTemplate.update({
        where: { id: tpl.id },
        data: { config: configString },
      });
      return NextResponse.json({
        template: { id: updated.id, name: updated.name },
        mode: "updated_in_place",
      });
    }
  }

  // Path B — create a new template, assign only to this project.
  const name = (projectName ?? project.name).trim() || project.name;
  const created = await prisma.reportTemplate.create({
    data: {
      workspaceId: project.workspaceId,
      name: `${name} — custom`,
      description: `Layout customized in-place from the ${name} report.`,
      isDefault: false,
      config: configString,
    },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { templateId: created.id },
  });
  return NextResponse.json({
    template: { id: created.id, name: created.name },
    mode: "forked",
  });
}
