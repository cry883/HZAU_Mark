import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = (req.nextUrl.searchParams.get("status") as ModerationStatus | null) ?? ModerationStatus.PENDING;
  const relatedBoardStatus = req.nextUrl.searchParams.get("relatedBoardStatus") as ModerationStatus | null;
  const items = await prisma.boardItem.findMany({
    where: {
      status,
      ...(relatedBoardStatus
        ? {
            boards: {
              some: {
                board: { status: relatedBoardStatus }
              }
            }
          }
        : {})
    },
    include: {
      boards: {
        include: {
          board: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      status: item.status,
      relatedBoards: item.boards.map((link) => ({
        id: link.board.id,
        title: link.board.title,
        status: link.board.status
      }))
    }))
  });
}
