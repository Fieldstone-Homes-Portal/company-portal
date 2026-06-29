-- =========================================================================
-- Add RecentOpen table — per-user "recently opened" history for the Home page
-- =========================================================================
-- One row per (user, kind, target). Re-opening an item bumps `openedAt`
-- (the upsert in /api/track-open) so each user has at most one row per
-- distinct item. The Home page reads the newest few to build the
-- "Jump back in" row.
--   kind = "app"  → targetId = PortalApp.id (tile links to /apps/{targetId})
--   kind = "link" → targetId = external URL (also in `url`; opens in new tab)
-- =========================================================================

-- CreateTable: RecentOpen
CREATE TABLE "RecentOpen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "url" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentOpen_pkey" PRIMARY KEY ("id")
);

-- One row per distinct (user, kind, target): upserts bump openedAt instead of inserting dupes
CREATE UNIQUE INDEX "RecentOpen_userId_kind_targetId_key" ON "RecentOpen"("userId", "kind", "targetId");

-- Fast "newest N for this user" lookups
CREATE INDEX "RecentOpen_userId_openedAt_idx" ON "RecentOpen"("userId", "openedAt");

ALTER TABLE "RecentOpen" ADD CONSTRAINT "RecentOpen_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
