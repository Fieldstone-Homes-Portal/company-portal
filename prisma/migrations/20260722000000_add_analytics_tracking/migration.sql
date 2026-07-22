-- =========================================================================
-- Add analytics tracking tables — AppOpenEvent + AppUsageSession
-- =========================================================================
-- AppOpenEvent: append-only log of every app/link open (RecentOpen upserts,
-- so it can't answer "how many opens last month" — this table can).
-- AppUsageSession: time-on-app for iframe-embedded apps, accumulated from
-- 60s visibility heartbeats sent by AppEmbed.
--
-- Both power the admin-only /admin/analytics page. Data collection starts
-- when this migration deploys — there is no historical backfill (RecentOpen
-- only kept each user's latest open per app).
--
-- Privacy: app-level only — who opened which app and when, plus embed time.
-- Never URLs inside apps, page views within them, or any in-app activity.
-- =========================================================================

-- CreateTable: AppOpenEvent
CREATE TABLE "AppOpenEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppOpenEvent_pkey" PRIMARY KEY ("id")
);

-- "Opens over time" queries scan by date across all apps
CREATE INDEX "AppOpenEvent_openedAt_idx" ON "AppOpenEvent"("openedAt");

-- Per-app counts / distinct users within a time window
CREATE INDEX "AppOpenEvent_kind_targetId_openedAt_idx"
  ON "AppOpenEvent"("kind", "targetId", "openedAt");

ALTER TABLE "AppOpenEvent" ADD CONSTRAINT "AppOpenEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AppUsageSession
CREATE TABLE "AppUsageSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppUsageSession_pkey" PRIMARY KEY ("id")
);

-- Heartbeats upsert by the client-generated session key
CREATE UNIQUE INDEX "AppUsageSession_sessionKey_key" ON "AppUsageSession"("sessionKey");

-- Window scans + per-app time-spent aggregation
CREATE INDEX "AppUsageSession_startedAt_idx" ON "AppUsageSession"("startedAt");
CREATE INDEX "AppUsageSession_kind_targetId_startedAt_idx"
  ON "AppUsageSession"("kind", "targetId", "startedAt");

ALTER TABLE "AppUsageSession" ADD CONSTRAINT "AppUsageSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
