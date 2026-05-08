-- InviteCode: usage limits + expiry (safe for existing rows)

ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "InviteCode" SET "expiresAt" = "createdAt" + INTERVAL '30 days' WHERE "expiresAt" IS NULL;

UPDATE "InviteCode"
SET "maxUses" = 200,
    "expiresAt" = NOW() + INTERVAL '180 days'
WHERE UPPER(TRIM("code")) = 'HZAU2026';

UPDATE "InviteCode" AS ic
SET "usedCount" = COALESCE(u.cnt, 0)
FROM (
  SELECT "inviteCodeId" AS cid, COUNT(*)::int AS cnt
  FROM "User"
  WHERE "inviteCodeId" IS NOT NULL
  GROUP BY "inviteCodeId"
) AS u
WHERE ic."id" = u.cid;

ALTER TABLE "InviteCode" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "InviteCode_code_idx" ON "InviteCode"("code");
CREATE INDEX IF NOT EXISTS "InviteCode_expiresAt_idx" ON "InviteCode"("expiresAt");
