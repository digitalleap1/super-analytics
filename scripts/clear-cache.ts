import { prisma } from "../lib/prisma";

async function main() {
  const r = await prisma.reportCache.deleteMany();
  console.log(`Deleted ${r.count} ReportCache rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
