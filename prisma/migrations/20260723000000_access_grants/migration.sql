-- Access grants: replace the minRole access axis with an explicit policy
-- (allStaff flag + department links + per-user AppGrant rows) so Access
-- Studio can manage access directly. Role becomes portal privilege only
-- (ADMIN = manage the portal); it no longer gates individual apps.
--
-- Data conversion preserves today's EFFECTIVE access exactly:
--   * minRole=EMPLOYEE + no dept restriction  → allStaff = true
--   * minRole=EMPLOYEE + dept restriction     → dept links stay as-is
--   * minRole>EMPLOYEE → the old rule was role AND department, which union
--     semantics can't express — so freeze the current qualifying users as
--     individual grants and clear the dept links (otherwise every dept
--     member would gain access regardless of role). Admins are skipped:
--     they bypass gating at runtime.

-- CreateTable
CREATE TABLE "AppGrant" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppGrant_userId_idx" ON "AppGrant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppGrant_appId_userId_key" ON "AppGrant"("appId", "userId");

-- AddForeignKey
ALTER TABLE "AppGrant" ADD CONSTRAINT "AppGrant_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PortalApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppGrant" ADD CONSTRAINT "AppGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "PortalApp" ADD COLUMN "allStaff" BOOLEAN NOT NULL DEFAULT false;

-- Data conversion (before minRole is dropped).
-- 1. Employee-open apps with no department restriction become all-staff.
--    (_AppDepartments: "A" = Department.id, "B" = PortalApp.id)
UPDATE "PortalApp" a
SET "allStaff" = true
WHERE a."minRole" = 'EMPLOYEE'
  AND NOT EXISTS (SELECT 1 FROM "_AppDepartments" ad WHERE ad."B" = a."id");

-- 2. Role-gated apps: freeze the current qualifying non-admin users as
--    individual grants. Old rule = role >= minRole AND (no dept restriction
--    OR member of a restricted dept). Only MANAGER can qualify non-admin
--    for minRole=MANAGER; nobody non-admin qualifies for minRole=ADMIN.
INSERT INTO "AppGrant" ("id", "appId", "userId", "grantedBy")
SELECT gen_random_uuid()::text, a."id", u."id", 'migration:minRole'
FROM "PortalApp" a
JOIN "User" u
  ON a."minRole" = 'MANAGER' AND u."role" = 'MANAGER'
WHERE (
    NOT EXISTS (SELECT 1 FROM "_AppDepartments" ad WHERE ad."B" = a."id")
    OR EXISTS (
      SELECT 1
      FROM "_AppDepartments" ad
      JOIN "_UserDepartments" ud ON ud."A" = ad."A"
      WHERE ad."B" = a."id" AND ud."B" = u."id"
    )
  )
ON CONFLICT ("appId", "userId") DO NOTHING;

-- 3. Clear department links on role-gated apps so union semantics don't
--    widen access to dept members who lacked the role.
DELETE FROM "_AppDepartments" ad
USING "PortalApp" a
WHERE ad."B" = a."id" AND a."minRole" <> 'EMPLOYEE';

-- 4. Retire the legacy column.
ALTER TABLE "PortalApp" DROP COLUMN "minRole";
