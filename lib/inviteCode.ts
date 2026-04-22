import { prisma } from "@/lib/prisma";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export async function createInviteCode(issuerId: string) {
  for (let i = 0; i < 5; i += 1) {
    const code = randomCode();
    try {
      return await prisma.inviteCode.create({ data: { code, issuerId } });
    } catch {
      // retry on collision
    }
  }
  throw new Error("Failed to create invite code");
}
