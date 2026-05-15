import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/api-auth";
import { listGscSites } from "@/lib/google/gsc";

export async function GET() {
  const { user, response } = await getApiUser();
  if (!user) return response;
  const sites = await listGscSites(user.id);
  return NextResponse.json({ sites });
}
