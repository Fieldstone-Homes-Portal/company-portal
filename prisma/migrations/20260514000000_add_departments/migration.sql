-- =========================================================================
-- Add Department table + many-to-many relations to User and PortalApp
-- =========================================================================
-- A Department is a unit of the company (Construction, Sales, Land, etc.).
-- Used to restrict app access for EMPLOYEEs — MANAGERs and ADMINs bypass
-- department gates (see src/lib/roles.ts).
--
-- Prisma uses implicit many-to-many via auto-named join tables:
--   _UserDepartments — links User.departments ↔ Department.users
--   _AppDepartments  — links PortalApp.departments ↔ Department.apps
-- =========================================================================

-- CreateTable: Department
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on name so we don't end up with "Sales" and "sales"
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateTable: join table for User ↔ Department
CREATE TABLE "_UserDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_UserDepartments_B_index" ON "_UserDepartments"("B");

ALTER TABLE "_UserDepartments" ADD CONSTRAINT "_UserDepartments_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Department"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UserDepartments" ADD CONSTRAINT "_UserDepartments_B_fkey"
  FOREIGN KEY ("B") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: join table for PortalApp ↔ Department
CREATE TABLE "_AppDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AppDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_AppDepartments_B_index" ON "_AppDepartments"("B");

ALTER TABLE "_AppDepartments" ADD CONSTRAINT "_AppDepartments_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Department"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AppDepartments" ADD CONSTRAINT "_AppDepartments_B_fkey"
  FOREIGN KEY ("B") REFERENCES "PortalApp"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
