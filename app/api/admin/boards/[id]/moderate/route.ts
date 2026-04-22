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
  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) return NextResponse.json({ error: "未找到榜单" }, { status: 404 });

  const body = schema.parse(await req.json());
  const status = body.action === "approve" ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;

  const updated = await prisma.board.update({
    where: { id },
    data: { status, isLocked: status === ModerationStatus.APPROVED }
  });

  await prisma.moderationLog.create({
    data: {
      targetType: "Board",
      targetId: id,
      status,
      reason: body.reason,
      adminId: auth.userId,
      boardId: id
    }
  });
  return NextResponse.json({ board: updated });
}
