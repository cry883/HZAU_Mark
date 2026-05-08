import { NextResponse } from "next/server";
import { getAuthUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuthUserFromCookie();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const codes = await prisma.inviteCode.findMany({
      where: { issuerId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        code: true,
        isActive: true,
        usedCount: true,
        maxUses: true,
        expiresAt: true,
        createdAt: true
      }
    });

    const now = Date.now();
    const items = codes.map((c) => {
      const expiresAt = c.expiresAt;
      const expired = expiresAt ? expiresAt.getTime() <= now : true;
      const usedCount = c.usedCount ?? 0;
      const maxUses = c.maxUses ?? 0;
      const remaining = Math.max(0, maxUses - usedCount);
      return {
        id: c.id,
        code: c.code,
        isActive: c.isActive,
        usedCount,
        maxUses,
        remainingUses: remaining,
        expiresAt: expiresAt ? expiresAt.toISOString() : "",
        expired,
        createdAt: c.createdAt.toISOString()
      };
    });

    const totalSignups = items.reduce((a, c) => a + c.usedCount, 0);

    return NextResponse.json({
      summary: {
        codeCount: items.length,
        totalSignupsViaMyCodes: totalSignups
      },
      codes: items
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json(
      {
        error:
          "加载邀请数据失败。若刚升级过代码，请在项目根执行：npx prisma db push && npx prisma generate（并重启 dev）。",
        detail: process.env.NODE_ENV === "development" ? message : undefined
      },
      { status: 500 }
    );
  }
}
