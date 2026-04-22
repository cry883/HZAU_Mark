import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createInviteCode } from "@/lib/inviteCode";
import { setAuthCookie, signToken } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  inviteCode: z.string().min(6)
});

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
    if (!invite) return NextResponse.json({ error: "邀请码无效" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) return NextResponse.json({ error: "用户名已存在" }, { status: 400 });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash,
        inviteCodeId: invite.id
      }
    });
    await createInviteCode(user.id);

    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
