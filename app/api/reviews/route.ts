import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

const reviewSchema = z.object({
  boardItemId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

function isHalfStep(value: number) {
  return Math.round(value * 2) === value * 2;
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();

  try {
    const body = reviewSchema.parse(await req.json());
    if (!isHalfStep(body.rating)) {
      return NextResponse.json({ error: "评分需为0.5的倍数" }, { status: 400 });
    }

    const item = await prisma.boardItem.findFirst({
      where: {
        id: body.boardItemId,
        status: ModerationStatus.APPROVED,
        boards: {
          some: {
            board: { status: ModerationStatus.APPROVED }
          }
        }
      }
    });
    if (!item) return NextResponse.json({ error: "对象不可见或未通过审核" }, { status: 403 });

    const review = await prisma.review.upsert({
      where: {
        userId_boardItemId: {
          userId: auth.userId,
          boardItemId: body.boardItemId
        }
      },
      create: {
        userId: auth.userId,
        boardItemId: body.boardItemId,
        rating: body.rating,
        comment: body.comment
      },
      update: {
        rating: body.rating,
        comment: body.comment
      }
    });

    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  const boardItemId = req.nextUrl.searchParams.get("boardItemId");
  if (!boardItemId) return NextResponse.json({ error: "缺少 boardItemId" }, { status: 400 });

  const item = await prisma.boardItem.findFirst({
    where: {
      id: boardItemId,
      status: ModerationStatus.APPROVED,
      boards: { some: { board: { status: ModerationStatus.APPROVED } } }
    }
  });
  if (!item) return NextResponse.json({ error: "对象不可见" }, { status: 403 });

  const reviews = await prisma.review.findMany({
    where: { boardItemId },
    include: {
      user: { select: { id: true, username: true } },
      _count: { select: { likes: true } },
      likes: auth ? { where: { userId: auth.userId }, select: { id: true } } : false
    },
    orderBy: { updatedAt: "desc" }
  });
  const avg = reviews.length ? reviews.reduce((a, c) => a + c.rating, 0) / reviews.length : 0;
  return NextResponse.json({
    reviews: reviews.map((review) => {
      const { _count, likes, ...rest } = review;
      return {
        ...rest,
        likeCount: _count.likes,
        likedByMe: auth ? likes.length > 0 : false
      };
    }),
    avgRating: Number(avg.toFixed(1)),
    reviewCount: reviews.length
  });
}
