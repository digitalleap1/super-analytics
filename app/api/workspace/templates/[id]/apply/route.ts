import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  projectIds: z.array(z.string()).min(1).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  const template = await prisma.reportTemplate.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

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

  // Only touch projects within this workspace.
  const result = await prisma.project.updateMany({
    where: {
      id: { in: parsed.data.projectIds },
      workspaceId: workspace.id,
    },
    data: { templateId: template.id },
  });

  return NextResponse.json({ applied: result.count });
}
