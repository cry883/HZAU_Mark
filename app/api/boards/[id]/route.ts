import { NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const board = await prisma.board.findFirst({
    where: { id, status: ModerationStatus.APPROVED },
    include: {
      boardItems: {
        where: { boardItem: { status: ModerationStatus.APPROVED } },
        include: {
          boardItem: {
            include: {
              reviews: {
                include: { user: { select: { id: true, username: true } } },
                orderBy: { updatedAt: "desc" }
              }
            }
          }
        }
      }
    }
  });

  if (!board) return NextResponse.json({ error: "未找到榜单" }, { status: 404 });

  const items = board.boardItems.map((x) => {
    const avg =
      x.boardItem.reviews.length > 0
        ? x.boardItem.reviews.reduce((a, c) => a + c.rating, 0) / x.boardItem.reviews.length
        : 0;
    return {
      id: x.boardItem.id,
      name: x.boardItem.name,
      description: x.boardItem.description,
      imageUrl: x.boardItem.imageUrl,
      avgRating: Number(avg.toFixed(1)),
      reviewCount: x.boardItem.reviews.length,
      reviews: x.boardItem.reviews
    };
  });

  return NextResponse.json({
    board: {
      id: board.id,
      title: board.title,
      description: board.description
    },
    boardItems: items
  });
}
