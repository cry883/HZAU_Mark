import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["approve", "reject"]), reason: z.string().optional() });

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const item = await prisma.boardItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "未找到对象" }, { status: 404 });

  const body = schema.parse(await req.json());
  const status = body.action === "approve" ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;

  const updated = await prisma.boardItem.update({
    where: { id },
    data: { status, isLocked: status === ModerationStatus.APPROVED }
  });

  await prisma.moderationLog.create({
    data: {
      targetType: "BoardItem",
      targetId: id,
      status,
      reason: body.reason,
      adminId: auth.userId,
      boardItemId: id
    }
  });
  return NextResponse.json({ item: updated });
}
