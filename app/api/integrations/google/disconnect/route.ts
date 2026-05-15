import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { user, response } = await getApiUser();
  if (!user) return response;

  await prisma.account.deleteMany({
    where: { userId: user.id, provider: "google" },
  });

  return NextResponse.json({ ok: true });
}
