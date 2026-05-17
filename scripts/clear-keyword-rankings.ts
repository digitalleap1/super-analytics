// Wipes all KeywordRanking rows. Useful when the cron's storage rules have
// changed (e.g. we used to persist GSC stub data and now we don't) and you
// want to clear the slate before re-running the cron.
//
//   pnpm exec tsx scripts/clear-keyword-rankings.ts

import { prisma } from "../lib/prisma";

async function main() {
  const r = await prisma.keywordRanking.deleteMany();
  console.log(`Deleted ${r.count} KeywordRanking rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
