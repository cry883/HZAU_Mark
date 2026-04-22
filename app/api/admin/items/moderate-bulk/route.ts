import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["approve", "reject"])
});

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = schema.parse(await req.json());
    const uniqueIds = [...new Set(body.ids)];
    const status = body.action === "approve" ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;

    const existingCount = await prisma.boardItem.count({
      where: { id: { in: uniqueIds } }
    });
    if (existingCount !== uniqueIds.length) {
      return NextResponse.json({ error: "包含不存在的对象" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.boardItem.updateMany({
        where: { id: { in: uniqueIds } },
        data: { status, isLocked: status === ModerationStatus.APPROVED }
      });
      await tx.moderationLog.createMany({
        data: uniqueIds.map((id) => ({
          targetType: "BoardItem",
          targetId: id,
          status,
          adminId: auth.userId,
          boardItemId: id
        }))
      });
    });

    return NextResponse.json({ ok: true, count: uniqueIds.length });
  } catch {
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
