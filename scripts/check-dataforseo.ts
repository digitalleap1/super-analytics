// Verifies DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD work, and prints the account
// balance + rate limits. Free — does not consume credits.
//
//   pnpm exec tsx scripts/check-dataforseo.ts

import "dotenv/config";

const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;

if (!login || !password) {
  console.error(
    "❌ Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in .env",
  );
  process.exit(1);
}

const auth = Buffer.from(`${login}:${password}`).toString("base64");

async function main() {
  console.log(`→ Authenticating as: ${login}`);

  const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const json = (await res.json()) as {
    status_code?: number;
    status_message?: string;
    tasks?: Array<{
      result?: Array<{
        login?: string;
        money?: { balance?: number; total?: number; spent?: number };
        rates?: { limits?: Record<string, unknown> };
      }>;
    }>;
  };

  if (json.status_code !== 20000) {
    console.error(
      `❌ DataForSEO returned status ${json.status_code}: ${json.status_message}`,
    );
    process.exit(1);
  }

  const data = json.tasks?.[0]?.result?.[0];
  if (!data) {
    console.error("❌ Unexpected response shape");
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log(`✅ Authenticated`);
  console.log(`   Account login: ${data.login}`);
  if (data.money) {
    console.log(`   Balance:       $${data.money.balance?.toFixed(4) ?? "?"}`);
    console.log(`   Spent total:   $${data.money.spent?.toFixed(4) ?? "?"}`);
  }
  console.log(
    `\nNext: trigger the keyword cron once to start populating ranks:\n  curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/refresh-keywords`,
  );
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
