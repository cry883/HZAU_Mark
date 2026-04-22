import { NextResponse } from "next/server";
import { getAuthUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUserFromCookie();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      issuedCodes: { take: 1, orderBy: { createdAt: "desc" } }
    }
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    myInviteCode: user.issuedCodes[0]?.code ?? null
  });
}
