import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { username: body.username } });
    if (!user) return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });

    const token = await signToken({ userId: user.id, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
    setAuthCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
