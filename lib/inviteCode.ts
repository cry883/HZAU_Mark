import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, USER_INVITE_MAX_USES, USER_INVITE_VALID_DAYS } from "@/lib/inviteConstants";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

type InviteDelegate = Pick<PrismaClient, "inviteCode">;

export async function createInviteCode(issuerId: string, db: InviteDelegate = prisma) {
  const expiresAt = addDays(new Date(), USER_INVITE_VALID_DAYS);
  for (let i = 0; i < 5; i += 1) {
    const code = randomCode();
    try {
      return await db.inviteCode.create({
        data: {
          code,
          issuerId,
          maxUses: USER_INVITE_MAX_USES,
          usedCount: 0,
          expiresAt
        }
      });
    } catch {
      // retry on collision
    }
  }
  throw new Error("Failed to create invite code");
}
