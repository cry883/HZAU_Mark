import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookie, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUserFromCookie();
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = (req.nextUrl.searchParams.get("status") as ModerationStatus | null) ?? ModerationStatus.PENDING;
  const boards = await prisma.board.findMany({
    where: { status },
    include: {
      boardItems: {
        include: {
          boardItem: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({
    boards: boards.map((board) => ({
      id: board.id,
      title: board.title,
      status: board.status,
      items: board.boardItems.map((link) => link.boardItem)
    }))
  });
}
