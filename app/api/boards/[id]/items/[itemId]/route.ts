import { NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await getAuthUserFromCookie();
  const { id, itemId } = await ctx.params;

  const board = await prisma.board.findFirst({
    where: { id, status: ModerationStatus.APPROVED },
    select: { id: true, title: true }
  });
  if (!board) return NextResponse.json({ error: "未找到榜单" }, { status: 404 });

  const item = await prisma.boardItem.findFirst({
    where: {
      id: itemId,
      status: ModerationStatus.APPROVED,
      boards: { some: { boardId: id, board: { status: ModerationStatus.APPROVED } } }
    },
    include: {
      reviews: {
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { likes: true } },
          likes: auth ? { where: { userId: auth.userId }, select: { id: true } } : false
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });
  if (!item) return NextResponse.json({ error: "未找到对象" }, { status: 404 });

  const avg = item.reviews.length
    ? item.reviews.reduce((sum, review) => sum + review.rating, 0) / item.reviews.length
    : 0;
  const myReview = auth ? item.reviews.find((review) => review.userId === auth.userId) ?? null : null;

  return NextResponse.json({
    viewerId: auth?.userId ?? null,
    board,
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl
    },
    avgRating: Number(avg.toFixed(1)),
    reviewCount: item.reviews.length,
    myReview: myReview
      ? {
          id: myReview.id,
          rating: myReview.rating,
          comment: myReview.comment
        }
      : null,
    comments: item.reviews
      .filter((review) => Boolean(review.comment?.trim()))
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        updatedAt: review.updatedAt,
        user: review.user,
        likeCount: review._count.likes,
        likedByMe: auth ? review.likes.length > 0 : false,
        isMine: auth ? review.userId === auth.userId : false
      }))
  });
}
