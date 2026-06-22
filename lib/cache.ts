import { prisma } from "@/lib/prisma";

const TTL_MS = 6 * 60 * 60 * 1000;
// Sample/stub responses (Google not connected or token revoked) are cached only
// briefly so the UI stays fast instead of re-running failing Google calls on
// every page view — but they refresh quickly once a project reconnects.
const STUB_TTL_MS = 10 * 60 * 1000;

export type CacheType =
  | "gsc_overview"
  | "gsc_queries"
  | "gsc_pages"
  | "ga4_overview"
  | "ga4_channels";

export function buildCacheKey(
  type: CacheType,
  parts: Record<string, string | undefined | null>,
): string {
  const sorted = Object.entries(parts)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${type}|${sorted}`;
}

export async function readCache<T>(
  projectId: string,
  cacheKey: string,
): Promise<T | null> {
  const row = await prisma.reportCache.findUnique({
    where: { projectId_cacheKey: { projectId, cacheKey } },
  });
  if (!row) return null;
  if (Date.now() - row.fetchedAt.getTime() > TTL_MS) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function writeCache(
  projectId: string,
  cacheKey: string,
  type: CacheType,
  data: unknown,
): Promise<void> {
  await prisma.reportCache.upsert({
    where: { projectId_cacheKey: { projectId, cacheKey } },
    create: {
      projectId,
      cacheKey,
      type,
      payload: JSON.stringify(data),
    },
    update: {
      type,
      payload: JSON.stringify(data),
      fetchedAt: new Date(),
    },
  });
}

export async function withCache<T>(
  projectId: string,
  type: CacheType,
  keyParts: Record<string, string | undefined | null>,
  loader: () => Promise<T>,
): Promise<T> {
  const cacheKey = buildCacheKey(type, keyParts);
  const row = await prisma.reportCache.findUnique({
    where: { projectId_cacheKey: { projectId, cacheKey } },
  });
  if (row) {
    let data: T | null = null;
    try {
      data = JSON.parse(row.payload) as T;
    } catch {
      data = null;
    }
    if (data) {
      // Live data is cached for 6h; sample/stub data only briefly so it stays
      // fast but flips to live soon after a project reconnects.
      const isStub = (data as { source?: string })?.source === "stub";
      const ttl = isStub ? STUB_TTL_MS : TTL_MS;
      if (Date.now() - row.fetchedAt.getTime() <= ttl) return data;
    }
  }
  const fresh = await loader();
  await writeCache(projectId, cacheKey, type, fresh);
  return fresh;
}

export async function clearProjectCache(projectId: string): Promise<void> {
  await prisma.reportCache.deleteMany({ where: { projectId } });
}
