import { NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();

  const { id } = await ctx.params;
  const review = await prisma.review.findFirst({
    where: {
      id,
      boardItem: {
        status: ModerationStatus.APPROVED,
        boards: { some: { board: { status: ModerationStatus.APPROVED } } }
      }
    },
    select: { id: true, userId: true }
  });
  if (!review) return NextResponse.json({ error: "评论不可见" }, { status: 404 });

  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId: review.id, userId: auth.userId } }
  });

  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({
      data: { reviewId: review.id, userId: auth.userId }
    });
  }

  const likeCount = await prisma.reviewLike.count({ where: { reviewId: review.id } });
  return NextResponse.json({ liked: !existing, likeCount });
}
