// One-shot migration that converted the per-user schema to the workspace
// schema. Already executed on the dev database (3 users -> 3 workspaces ->
// 3 projects linked). Kept here so the migration history is reproducible and
// in case it's needed for a fresh checkout that still has the old schema.
//
// What it does (now): ensure every user has at least one workspace + owner
// membership. The "link Project.userId to workspaceId" half no longer applies
// because Project.userId was dropped in Stage 3.
//
//   pnpm exec tsx scripts/backfill-workspaces.ts

import { prisma } from "../lib/prisma";
import { ensureUserHasWorkspace } from "../lib/workspaces";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  let createdMissing = 0;
  for (const user of users) {
    const ws = await ensureUserHasWorkspace(user.id);
    console.log(`  ✓ ${user.email} -> workspace "${ws.name}" (${ws.slug}) as ${ws.role}`);
    createdMissing++;
  }
  console.log(`\n✅ Checked ${users.length} users; ensured workspaces for ${createdMissing}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
