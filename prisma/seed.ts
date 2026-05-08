import bcrypt from "bcryptjs";
import { ModerationStatus, PrismaClient, Role } from "@prisma/client";
import {
  addDays,
  BOOTSTRAP_INVITE_CODE,
  BOOTSTRAP_INVITE_MAX_USES,
  BOOTSTRAP_INVITE_VALID_DAYS,
  USER_INVITE_MAX_USES,
  USER_INVITE_VALID_DAYS
} from "../lib/inviteConstants";

const prisma = new PrismaClient();

async function main() {
  await prisma.review.deleteMany();
  await prisma.boardBoardItem.deleteMany();
  await prisma.moderationLog.deleteMany();
  await prisma.boardItem.deleteMany();
  await prisma.board.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: Role.ADMIN
    }
  });

  const userA = await prisma.user.create({
    data: {
      username: "alice",
      passwordHash: await bcrypt.hash("123456", 10),
      role: Role.USER
    }
  });

  const bootstrapExpires = addDays(new Date(), BOOTSTRAP_INVITE_VALID_DAYS);
  await prisma.inviteCode.create({
    data: {
      code: BOOTSTRAP_INVITE_CODE,
      issuerId: admin.id,
      isActive: true,
      maxUses: BOOTSTRAP_INVITE_MAX_USES,
      usedCount: 0,
      expiresAt: bootstrapExpires
    }
  });
  await prisma.inviteCode.create({
    data: {
      code: "ALICE888",
      issuerId: userA.id,
      isActive: true,
      maxUses: USER_INVITE_MAX_USES,
      usedCount: 0,
      expiresAt: addDays(new Date(), USER_INVITE_VALID_DAYS)
    }
  });

  const board = await prisma.board.create({
    data: {
      title: "校园风景榜",
      description: "欢迎打分",
      creatorId: admin.id,
      status: ModerationStatus.APPROVED,
      isLocked: true
    }
  });

  const item1 = await prisma.boardItem.create({
    data: {
      name: "樱花大道",
      description: "春天非常漂亮",
      imageUrl: "https://images.unsplash.com/photo-1495567720989-cebdbdd97913",
      creatorId: admin.id,
      status: ModerationStatus.APPROVED,
      isLocked: true
    }
  });
  const item2 = await prisma.boardItem.create({
    data: {
      name: "图书馆前草坪",
      description: "适合散步",
      imageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e",
      creatorId: admin.id,
      status: ModerationStatus.APPROVED,
      isLocked: true
    }
  });
  const item3 = await prisma.boardItem.create({
    data: {
      name: "东门湖畔",
      description: "傍晚风景不错",
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      creatorId: admin.id,
      status: ModerationStatus.APPROVED,
      isLocked: true
    }
  });

  await prisma.boardBoardItem.createMany({
    data: [
      { boardId: board.id, boardItemId: item1.id },
      { boardId: board.id, boardItemId: item2.id },
      { boardId: board.id, boardItemId: item3.id }
    ]
  });

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
