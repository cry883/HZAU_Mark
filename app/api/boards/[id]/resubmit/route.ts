import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) return NextResponse.json({ error: "未找到榜单" }, { status: 404 });
  if (board.creatorId !== auth.userId) return NextResponse.json({ error: "无权限" }, { status: 403 });
  if (board.status !== ModerationStatus.REJECTED) {
    return NextResponse.json({ error: "仅可重提已驳回榜单" }, { status: 400 });
  }
  if (board.isLocked) return NextResponse.json({ error: "榜单已锁定" }, { status: 403 });

  const payload = (await req.json()) as { title?: string; description?: string };

  await prisma.board.update({
    where: { id },
    data: {
      title: payload.title ?? board.title,
      description: payload.description ?? board.description ?? undefined,
      status: ModerationStatus.PENDING
    }
  });

  return NextResponse.json({ ok: true });
}
