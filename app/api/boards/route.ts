import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";
import { pickTopLikedCommentSnippet } from "@/lib/reviewQuote";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  newItems: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().url()
      })
    )
    .default([]),
  existingItemIds: z.array(z.string()).default([])
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const boards = await prisma.board.findMany({
    where: {
      status: ModerationStatus.APPROVED,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      boardItems: {
        where: { boardItem: { status: ModerationStatus.APPROVED } },
        include: {
          boardItem: {
            include: {
              reviews: {
                include: { _count: { select: { likes: true } } }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const mapped = boards.map((b) => {
    const ratings = b.boardItems.flatMap((bi) => bi.boardItem.reviews.map((r) => r.rating));
    const avg = ratings.length ? ratings.reduce((a, c) => a + c, 0) / ratings.length : 0;
    const topItems = b.boardItems
      .map((bi) => {
        const itemRatings = bi.boardItem.reviews.map((r) => r.rating);
        const itemAvg = itemRatings.length ? itemRatings.reduce((a, c) => a + c, 0) / itemRatings.length : 0;
        return {
          id: bi.boardItem.id,
          name: bi.boardItem.name,
          quoteSnippet: pickTopLikedCommentSnippet(bi.boardItem.reviews),
          imageUrl: bi.boardItem.imageUrl,
          avgRating: itemAvg,
          reviewCount: bi.boardItem.reviews.length
        };
      })
      .sort((a, c) => c.avgRating - a.avgRating)
      .slice(0, 3);
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      approvedItemCount: b.boardItems.length,
      /** 总评分条数，与首页卡片徽章一致 */
      participantCount: ratings.length,
      avgRating: Number(avg.toFixed(1)),
      topItems
    };
  });

  return NextResponse.json({ boards: mapped });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();

  try {
    const body = createSchema.parse(await req.json());
    const uniqueExistingItemIds = [...new Set(body.existingItemIds)];
    if (uniqueExistingItemIds.length !== body.existingItemIds.length) {
      return NextResponse.json({ error: "existingItemIds 不能包含重复对象" }, { status: 400 });
    }

    if (body.newItems.length + uniqueExistingItemIds.length < 3) {
      return NextResponse.json({ error: "至少需要3个对象" }, { status: 400 });
    }

    if (uniqueExistingItemIds.length) {
      const count = await prisma.boardItem.count({
        where: {
          id: { in: uniqueExistingItemIds },
          status: ModerationStatus.APPROVED
        }
      });
      if (count !== uniqueExistingItemIds.length) {
        return NextResponse.json({ error: "existingItemIds 包含不可引用对象" }, { status: 400 });
      }
    }

    const boardId = await prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          title: body.title,
          description: body.description,
          creatorId: auth.userId,
          status: ModerationStatus.PENDING
        }
      });

      const createdItems = await Promise.all(
        body.newItems.map((item) =>
          tx.boardItem.create({
            data: {
              ...item,
              creatorId: auth.userId,
              status: ModerationStatus.PENDING
            }
          })
        )
      );

      const allItemIds = [...uniqueExistingItemIds, ...createdItems.map((i) => i.id)];
      await tx.boardBoardItem.createMany({
        data: allItemIds.map((boardItemId) => ({ boardId: board.id, boardItemId }))
      });

      return board.id;
    });

    return NextResponse.json({ boardId });
  } catch {
    return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
  }
}
