import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

function isValidImageRef(value: string) {
  if (value.startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const schema = z.object({
  name: z.string().trim().min(1, "名称必填"),
  description: z.string().trim().min(1, "描述必填"),
  imageUrl: z.string().trim().min(1, "图片必填").refine(isValidImageRef, "图片格式错误")
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const board = await prisma.board.findFirst({
    where: { id, status: ModerationStatus.APPROVED },
    select: { id: true }
  });
  if (!board) return NextResponse.json({ error: "榜单不可用" }, { status: 404 });

  try {
    const body = schema.parse(await req.json());
    const item = await prisma.boardItem.create({
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        creatorId: auth.userId,
        status: ModerationStatus.PENDING
      }
    });

    await prisma.boardBoardItem.create({
      data: { boardId: board.id, boardItemId: item.id }
    });

    return NextResponse.json({
      itemId: item.id,
      status: item.status,
      message: "对象已提交，等待管理员审核后展示"
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
