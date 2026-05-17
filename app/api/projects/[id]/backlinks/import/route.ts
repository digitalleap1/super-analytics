import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiProject } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  extractSheetId,
  parseBacklinkCsv,
  sheetCsvExportUrl,
} from "@/lib/backlinks";

const bodySchema = z
  .object({
    csv: z.string().optional(),
    sheetUrl: z.string().optional(),
  })
  .refine((b) => !!b.csv || !!b.sheetUrl, {
    message: "Provide either csv or sheetUrl",
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

  // Resolve CSV text — either passed directly or fetched from a public Google Sheet.
  let csvText = parsed.data.csv;
  if (!csvText && parsed.data.sheetUrl) {
    const sheetId = extractSheetId(parsed.data.sheetUrl);
    if (!sheetId) {
      return NextResponse.json(
        {
          error:
            "Could not extract a Google Sheets ID from that URL. Make sure you pasted the share link.",
        },
        { status: 400 },
      );
    }
    try {
      const res = await fetch(sheetCsvExportUrl(sheetId), {
        redirect: "follow",
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error:
              "Couldn't fetch the sheet. Make sure it's shared as 'Anyone with the link can view'.",
          },
          { status: 400 },
        );
      }
      csvText = await res.text();
    } catch {
      return NextResponse.json(
        { error: "Network error fetching the sheet" },
        { status: 502 },
      );
    }
  }

  if (!csvText) {
    return NextResponse.json({ error: "No CSV data" }, { status: 400 });
  }

  let parseResult;
  try {
    parseResult = parseBacklinkCsv(csvText);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not parse CSV" },
      { status: 400 },
    );
  }

  if (parseResult.rows.length === 0) {
    return NextResponse.json(
      {
        error: "No valid backlink rows found",
        skipped: parseResult.skipped,
      },
      { status: 400 },
    );
  }

  // Bulk insert — SQLite + Prisma createMany works fine.
  const created = await prisma.backlink.createMany({
    data: parseResult.rows.map((r) => ({
      projectId: project.id,
      category: r.category,
      url: r.url,
      place: r.place,
      notes: r.notes,
      submittedAt: r.submittedAt,
    })),
  });

  return NextResponse.json(
    {
      imported: created.count,
      skipped: parseResult.skipped,
    },
    { status: 201 },
  );
}
