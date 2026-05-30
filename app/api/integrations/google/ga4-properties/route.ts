import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/api-auth";
import { listGa4Properties } from "@/lib/google/ga4";

export async function GET() {
  const { user, response } = await getApiUser();
  if (!user) return response;
  const result = await listGa4Properties({ userId: user.id });
  return NextResponse.json({
    properties: result.properties,
    source: result.source,
    error: result.error,
  });
}
