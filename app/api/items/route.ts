import { NextRequest, NextResponse } from "next/server";
import { ModerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await prisma.boardItem.findMany({
    where: {
      status: ModerationStatus.APPROVED,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { reviews: true },
    take: 30,
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    items: items.map((item) => {
      const avg =
        item.reviews.length > 0
          ? item.reviews.reduce((a, c) => a + c.rating, 0) / item.reviews.length
          : 0;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        avgRating: Number(avg.toFixed(1))
      };
    })
  });
}
