import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/api-auth";
import { listGa4Properties } from "@/lib/google/ga4";

export async function GET() {
  const { user, response } = await getApiUser();
  if (!user) return response;
  const properties = await listGa4Properties(user.id);
  return NextResponse.json({ properties });
}
