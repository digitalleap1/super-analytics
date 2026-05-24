// One-shot migration: copies every row from the existing SQLite dev.db into
// the new Postgres database (Neon, or any other).
//
// PREREQUISITES — must be done BEFORE running this script:
//   1. Edit prisma/schema.prisma: provider = "postgresql"
//   2. Edit .env: DATABASE_URL = your Neon connection string
//   3. Run `pnpm prisma db push` — creates empty tables on Neon
//   4. Run `pnpm prisma generate` — regenerates client for Postgres
//
// Then run:
//   pnpm exec tsx scripts/migrate-sqlite-to-postgres.ts
//
// It reads SQLite via better-sqlite3 (independent of Prisma) and writes via
// the Prisma client (now configured for Postgres). Order respects foreign-key
// dependencies. Idempotent: re-running skips rows whose IDs already exist
// (so a partial migration can be safely resumed).

import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");

const sqlite = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
const prisma = new PrismaClient();

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function requireDate(v: unknown): Date {
  const d = parseDate(v);
  if (!d) throw new Error(`Expected date, got ${typeof v}: ${String(v)}`);
  return d;
}

function asBool(v: unknown): boolean {
  return v === 1 || v === "1" || v === true || v === "true";
}

function rowsFrom(table: string): Record<string, unknown>[] {
  try {
    return sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<
      string,
      unknown
    >[];
  } catch (err) {
    console.warn(`  ⚠ table "${table}" not present in SQLite — skipping`);
    return [];
  }
}

async function copy(
  label: string,
  fn: () => Promise<{ inserted: number; skipped: number }>,
) {
  const r = await fn();
  console.log(
    `  ✓ ${label}: inserted ${r.inserted}, skipped ${r.skipped} (already existed)`,
  );
}

async function main() {
  console.log(`📦 Reading from ${SQLITE_PATH}`);
  console.log(`🐘 Writing via Prisma (current DATABASE_URL)`);

  // 1. Users
  await copy("User", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("User")) {
      const id = String(r.id);
      const existing = await prisma.user.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.user.create({
        data: {
          id,
          email: String(r.email),
          passwordHash: (r.passwordHash as string) ?? null,
          name: (r.name as string) ?? null,
          image: (r.image as string) ?? null,
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 2. Accounts
  await copy("Account", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Account")) {
      const id = String(r.id);
      const existing = await prisma.account.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.account.create({
        data: {
          id,
          userId: String(r.userId),
          type: String(r.type),
          provider: String(r.provider),
          providerAccountId: String(r.providerAccountId),
          refresh_token: (r.refresh_token as string) ?? null,
          access_token: (r.access_token as string) ?? null,
          expires_at: r.expires_at as number | null,
          token_type: (r.token_type as string) ?? null,
          scope: (r.scope as string) ?? null,
          id_token: (r.id_token as string) ?? null,
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 3. Sessions
  await copy("Session", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Session")) {
      const id = String(r.id);
      const existing = await prisma.session.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.session.create({
        data: {
          id,
          sessionToken: String(r.sessionToken),
          userId: String(r.userId),
          expires: requireDate(r.expires),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 4. Workspaces
  await copy("Workspace", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Workspace")) {
      const id = String(r.id);
      const existing = await prisma.workspace.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.workspace.create({
        data: {
          id,
          name: String(r.name),
          slug: String(r.slug),
          createdAt: requireDate(r.createdAt),
          updatedAt: requireDate(r.updatedAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 5. Memberships
  await copy("Membership", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Membership")) {
      const id = String(r.id);
      const existing = await prisma.membership.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.membership.create({
        data: {
          id,
          userId: String(r.userId),
          workspaceId: String(r.workspaceId),
          role: String(r.role),
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 6. WorkspaceInvites
  await copy("WorkspaceInvite", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("WorkspaceInvite")) {
      const id = String(r.id);
      const existing = await prisma.workspaceInvite.findUnique({
        where: { id },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.workspaceInvite.create({
        data: {
          id,
          workspaceId: String(r.workspaceId),
          token: String(r.token),
          role: String(r.role),
          createdBy: String(r.createdBy),
          expiresAt: parseDate(r.expiresAt),
          usedAt: parseDate(r.usedAt),
          usedBy: (r.usedBy as string) ?? null,
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 7. ReportTemplates (Project FK depends on this)
  await copy("ReportTemplate", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("ReportTemplate")) {
      const id = String(r.id);
      const existing = await prisma.reportTemplate.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.reportTemplate.create({
        data: {
          id,
          workspaceId: String(r.workspaceId),
          name: String(r.name),
          description: (r.description as string) ?? null,
          config: String(r.config),
          isDefault: asBool(r.isDefault),
          createdAt: requireDate(r.createdAt),
          updatedAt: requireDate(r.updatedAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 8. Projects
  await copy("Project", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Project")) {
      const id = String(r.id);
      const existing = await prisma.project.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.project.create({
        data: {
          id,
          workspaceId: String(r.workspaceId),
          templateId: (r.templateId as string) ?? null,
          name: String(r.name),
          domain: String(r.domain),
          logoUrl: (r.logoUrl as string) ?? null,
          gscSiteUrl: (r.gscSiteUrl as string) ?? null,
          ga4PropertyId: (r.ga4PropertyId as string) ?? null,
          createdAt: requireDate(r.createdAt),
          updatedAt: requireDate(r.updatedAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 9. ProjectAccounts (per-project Google connections)
  await copy("ProjectAccount", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("ProjectAccount")) {
      const id = String(r.id);
      const existing = await prisma.projectAccount.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.projectAccount.create({
        data: {
          id,
          projectId: String(r.projectId),
          provider: String(r.provider),
          providerAccountId: String(r.providerAccountId),
          email: (r.email as string) ?? null,
          access_token: (r.access_token as string) ?? null,
          refresh_token: (r.refresh_token as string) ?? null,
          expires_at: r.expires_at as number | null,
          token_type: (r.token_type as string) ?? null,
          scope: (r.scope as string) ?? null,
          connectedById: String(r.connectedById),
          connectedAt: requireDate(r.connectedAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 10. ProjectMembers
  await copy("ProjectMember", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("ProjectMember")) {
      const id = String(r.id);
      const existing = await prisma.projectMember.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.projectMember.create({
        data: {
          id,
          projectId: String(r.projectId),
          userId: String(r.userId),
          role: String(r.role),
          addedById: String(r.addedById),
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 11. Keywords
  await copy("Keyword", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Keyword")) {
      const id = String(r.id);
      const existing = await prisma.keyword.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.keyword.create({
        data: {
          id,
          projectId: String(r.projectId),
          query: String(r.query),
          country: String(r.country),
          device: String(r.device),
          tag: (r.tag as string) ?? null,
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 12. KeywordRankings
  await copy("KeywordRanking", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("KeywordRanking")) {
      const id = String(r.id);
      const existing = await prisma.keywordRanking.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.keywordRanking.create({
        data: {
          id,
          keywordId: String(r.keywordId),
          date: requireDate(r.date),
          position: r.position as number,
          clicks: r.clicks as number,
          impressions: r.impressions as number,
          ctr: r.ctr as number,
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 13. ReportCaches
  await copy("ReportCache", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("ReportCache")) {
      const id = String(r.id);
      const existing = await prisma.reportCache.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.reportCache.create({
        data: {
          id,
          projectId: String(r.projectId),
          cacheKey: String(r.cacheKey),
          type: String(r.type),
          payload: String(r.payload),
          fetchedAt: requireDate(r.fetchedAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 14. Backlinks
  await copy("Backlink", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("Backlink")) {
      const id = String(r.id);
      const existing = await prisma.backlink.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.backlink.create({
        data: {
          id,
          projectId: String(r.projectId),
          category: String(r.category),
          url: String(r.url),
          place: (r.place as string) ?? null,
          notes: (r.notes as string) ?? null,
          submittedAt: requireDate(r.submittedAt),
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  // 15. SavedReports
  await copy("SavedReport", async () => {
    let inserted = 0;
    let skipped = 0;
    for (const r of rowsFrom("SavedReport")) {
      const id = String(r.id);
      const existing = await prisma.savedReport.findUnique({ where: { id } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.savedReport.create({
        data: {
          id,
          projectId: String(r.projectId),
          name: String(r.name),
          fromDate: requireDate(r.fromDate),
          toDate: requireDate(r.toDate),
          snapshot: String(r.snapshot),
          shareToken: (r.shareToken as string) ?? null,
          createdById: String(r.createdById),
          createdAt: requireDate(r.createdAt),
        },
      });
      inserted++;
    }
    return { inserted, skipped };
  });

  console.log(`\n✅ Migration complete. SQLite db unchanged; you can delete prisma/dev.db whenever you're confident the Neon copy looks right.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqlite.close();
  });
