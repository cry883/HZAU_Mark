import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";
import { addDays } from "@/lib/inviteConstants";

const postSchema = z.object({
  code: z.string().min(6).max(32).optional(),
  maxUses: z.number().int().min(1).max(100000).optional(),
  validDays: z.number().int().min(1).max(3650).optional(),
  issuerId: z.string().min(1).optional()
});

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export async function GET() {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      issuer: { select: { id: true, username: true } }
    }
  });

  return NextResponse.json({
    inviteCodes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      isActive: c.isActive,
      usedCount: c.usedCount,
      maxUses: c.maxUses,
      expiresAt: c.expiresAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      issuer: c.issuer
    }))
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = postSchema.parse(await req.json());
    const maxUses = body.maxUses ?? 10;
    const validDays = body.validDays ?? 30;
    const issuerId = body.issuerId ?? auth.userId;
    const issuer = await prisma.user.findUnique({ where: { id: issuerId } });
    if (!issuer) return NextResponse.json({ error: "发行人不存在" }, { status: 400 });

    const expiresAt = addDays(new Date(), validDays);
    const desiredCode = body.code?.trim().toUpperCase();

    if (desiredCode) {
      const created = await prisma.inviteCode.create({
        data: {
          code: desiredCode,
          issuerId,
          maxUses,
          usedCount: 0,
          expiresAt,
          isActive: true
        }
      });
      return NextResponse.json({ inviteCode: created });
    }

    for (let i = 0; i < 8; i += 1) {
      const code = randomCode();
      try {
        const created = await prisma.inviteCode.create({
          data: {
            code,
            issuerId,
            maxUses,
            usedCount: 0,
            expiresAt,
            isActive: true
          }
        });
        return NextResponse.json({ inviteCode: created });
      } catch {
        // collision
      }
    }
    return NextResponse.json({ error: "生成邀请码失败，请重试" }, { status: 500 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "邀请码已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
