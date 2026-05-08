import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createInviteCode } from "@/lib/inviteCode";
import { getAuthUserFromCookie, setAuthCookie, signToken } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  inviteCode: z.string().min(6)
});

class InviteRegisterError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const parsed = schema.safeParse({
      username: String(payload.username ?? "").trim(),
      password: String(payload.password ?? ""),
      inviteCode: String(payload.inviteCode ?? "").trim().toUpperCase()
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "参数格式错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const body = parsed.data;

    const invite = await prisma.inviteCode.findFirst({
      where: { code: body.inviteCode, isActive: true }
    });
    if (!invite) {
      return NextResponse.json({ error: "邀请码无效或已停用" }, { status: 400 });
    }

    const auth = await getAuthUserFromCookie();
    if (auth && invite.issuerId === auth.userId) {
      return NextResponse.json({ error: "不能使用自己生成的邀请码注册" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) return NextResponse.json({ error: "用户名已存在" }, { status: 400 });

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "InviteCode"
        SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${invite.id}
          AND "isActive" = true
          AND "expiresAt" > NOW()
          AND "usedCount" < "maxUses"
        RETURNING "id"
      `;
      if (!rows.length) {
        throw new InviteRegisterError("邀请码已用尽、已过期或已停用");
      }

      let created: { id: string; username: string; role: "USER" | "ADMIN" } | null = null;
      try {
        created = await tx.user.create({
          data: {
            username: body.username,
            passwordHash,
            inviteCodeId: invite.id
          }
        });
        await createInviteCode(created.id, tx);
        return created;
      } catch (e) {
        if (created) {
          await tx.user.delete({ where: { id: created.id } });
        }
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { usedCount: { decrement: 1 } }
        });
        throw e;
      }
    });

    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    if (err instanceof InviteRegisterError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
