import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  config: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const template = await prisma.reportTemplate.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const existing = await prisma.reportTemplate.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Setting isDefault=true: clear flag on all other templates in the workspace.
  if (parsed.data.isDefault === true) {
    await prisma.reportTemplate.updateMany({
      where: { workspaceId: workspace.id, isDefault: true, id: { not: existing.id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.reportTemplate.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description,
      }),
      ...(parsed.data.config !== undefined && { config: parsed.data.config }),
      ...(parsed.data.isDefault !== undefined && {
        isDefault: parsed.data.isDefault,
      }),
    },
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const template = await prisma.reportTemplate.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (template.isDefault) {
    return NextResponse.json(
      {
        error:
          "Can't delete the default template. Mark another template as default first.",
      },
      { status: 400 },
    );
  }

  // Projects using this template fall back to the workspace default (FK is
  // SetNull on delete).
  await prisma.reportTemplate.delete({ where: { id: template.id } });
  return NextResponse.json({ ok: true });
}
