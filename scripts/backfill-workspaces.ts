// Stage 2 of the workspace migration.
//
// For each existing User: create a Workspace, an owner Membership, and set
// Project.workspaceId for all projects they own. Idempotent — re-running is
// safe (skips users who already have a membership, projects with a workspaceId).
//
//   pnpm exec tsx scripts/backfill-workspaces.ts

import { prisma } from "../lib/prisma";

function slugify(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || "workspace";
  let n = 1;
  // try base, then base-2, base-3, ... until free
  // (slugs aren't user-visible yet, so collisions are very unlikely)
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    n++;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function main() {
  const users = await prisma.user.findMany({
    include: { memberships: true, projects: true },
  });

  let createdWorkspaces = 0;
  let createdMemberships = 0;
  let linkedProjects = 0;

  for (const user of users) {
    let workspaceId: string;

    if (user.memberships[0]) {
      workspaceId = user.memberships[0].workspaceId;
    } else {
      const baseSeed = user.name ?? user.email.split("@")[0] ?? "workspace";
      const slug = await uniqueSlug(slugify(baseSeed));
      const workspace = await prisma.workspace.create({
        data: {
          name: user.name ? `${user.name}'s workspace` : `${user.email}'s workspace`,
          slug,
          memberships: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
      });
      workspaceId = workspace.id;
      createdWorkspaces++;
      createdMemberships++;
      console.log(
        `  ✓ Workspace "${workspace.name}" (${workspace.slug}) for ${user.email}`,
      );
    }

    for (const project of user.projects) {
      if (project.workspaceId) continue;
      await prisma.project.update({
        where: { id: project.id },
        data: { workspaceId },
      });
      linkedProjects++;
    }
  }

  console.log(
    `\n✅ Backfill complete: ${createdWorkspaces} workspaces, ${createdMemberships} memberships, ${linkedProjects} projects linked`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
