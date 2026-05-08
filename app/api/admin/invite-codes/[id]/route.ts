import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).max(100000).optional(),
  expiresAt: z.string().min(1).optional()
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.inviteCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "未找到邀请码" }, { status: 404 });

  try {
    const body = patchSchema.parse(await req.json());
    if (body.maxUses !== undefined && body.maxUses < existing.usedCount) {
      return NextResponse.json({ error: "maxUses 不能小于已使用次数" }, { status: 400 });
    }

    let nextExpires: Date | undefined;
    if (body.expiresAt !== undefined) {
      nextExpires = new Date(body.expiresAt);
      if (Number.isNaN(nextExpires.getTime())) {
        return NextResponse.json({ error: "expiresAt 格式无效" }, { status: 400 });
      }
    }

    const updated = await prisma.inviteCode.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
        ...(nextExpires !== undefined ? { expiresAt: nextExpires } : {})
      }
    });

    return NextResponse.json({ inviteCode: updated });
  } catch {
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
