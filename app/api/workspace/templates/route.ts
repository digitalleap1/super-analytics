import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiWorkspace } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATE_CONFIG,
  ensureWorkspaceDefaultTemplate,
} from "@/lib/templates";

export async function GET() {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  await ensureWorkspaceDefaultTemplate(workspace.id);

  const templates = await prisma.reportTemplate.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { projects: true } },
    },
  });

  return NextResponse.json({ templates });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  config: z.string().min(2),
  cloneFromId: z.string().optional(),
});

export async function POST(request: Request) {
  const { workspace, response } = await getApiWorkspace();
  if (!workspace) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let configString = parsed.data.config;
  if (parsed.data.cloneFromId) {
    const source = await prisma.reportTemplate.findFirst({
      where: { id: parsed.data.cloneFromId, workspaceId: workspace.id },
    });
    if (source) configString = source.config;
  }

  // Validate the JSON parses to a config-ish shape
  try {
    JSON.parse(configString);
  } catch {
    configString = JSON.stringify(DEFAULT_TEMPLATE_CONFIG);
  }

  const template = await prisma.reportTemplate.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      config: configString,
      isDefault: false,
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ template }, { status: 201 });
}
