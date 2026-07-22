-- =========================================================================
-- Add ReleaseNote table — "What's New" feed for the Home page and /whats-new
-- =========================================================================
-- One row per announcement. Rows are auto-seeded when a manager registers a
-- new app in Manage Apps (kind = 'new-app') and written by hand in
-- /admin/releases (kind = 'update').
--   appId       → optional FK to PortalApp; ON DELETE SET NULL so removing
--                 an app keeps its history in the feed.
--   publishedAt → feed sort key; future-dated notes stay hidden until then.
--   createdBy   → email of the manager/admin who created the note.
-- =========================================================================

-- CreateTable: ReleaseNote
CREATE TABLE "ReleaseNote" (
    "id" TEXT NOT NULL,
    "appId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'update',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- Fast "newest N" feed queries
CREATE INDEX "ReleaseNote_publishedAt_idx" ON "ReleaseNote"("publishedAt");

-- Keep the note when its app is deleted — history survives as a general note
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "PortalApp"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
