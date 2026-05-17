import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@seo-dashboard.local";
const DEMO_PASSWORD = "demo1234";
const WORKSPACE_SLUG = "demo-workspace";

async function main() {
  console.log("🌱 Seeding demo data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: "Demo User" },
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash,
    },
  });
  console.log(`  ✓ User: ${user.email}`);

  const workspace = await prisma.workspace.upsert({
    where: { slug: WORKSPACE_SLUG },
    update: { name: "Demo Workspace" },
    create: {
      name: "Demo Workspace",
      slug: WORKSPACE_SLUG,
      memberships: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });
  // If the workspace already exists but the user lacks membership, add it.
  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: "owner" },
  });
  console.log(`  ✓ Workspace: ${workspace.name} (${workspace.slug})`);

  // Wipe existing demo project so re-seeding stays clean.
  await prisma.project.deleteMany({
    where: { workspaceId: workspace.id, domain: "acme-demo.com" },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Acme Demo Co",
      domain: "acme-demo.com",
    },
  });
  console.log(`  ✓ Project: ${project.name} (${project.id})`);

  const sampleKeywords = [
    { query: "acme widgets", country: "usa", device: "all", tag: "brand" },
    { query: "buy acme widgets online", country: "usa", device: "all", tag: "money" },
    { query: "acme widget reviews", country: "usa", device: "mobile", tag: "research" },
    { query: "best widget brands", country: "usa", device: "all", tag: "head" },
    { query: "widget repair near me", country: "usa", device: "mobile", tag: "local" },
    { query: "acme widgets vs competitor", country: "usa", device: "desktop", tag: "comparison" },
    { query: "widget pricing", country: "gbr", device: "all", tag: "money" },
    { query: "what is a widget", country: "usa", device: "all", tag: "informational" },
    { query: "widget alternatives", country: "can", device: "all", tag: "research" },
    { query: "industrial widgets", country: "deu", device: "desktop", tag: null },
  ];

  let kwCount = 0;
  for (const kw of sampleKeywords) {
    try {
      await prisma.keyword.create({
        data: { projectId: project.id, ...kw },
      });
      kwCount++;
    } catch (err) {
      // Unique constraint: skip dupes if re-seeding.
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err;
    }
  }
  console.log(`  ✓ Keywords: ${kwCount}`);

  console.log(`\n✅ Seed complete. Sign in at /login with:`);
  console.log(`     email:    ${DEMO_EMAIL}`);
  console.log(`     password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
