ALTER TABLE "Department" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'custom', ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "Department_externalId_key" ON "Department"("externalId");
