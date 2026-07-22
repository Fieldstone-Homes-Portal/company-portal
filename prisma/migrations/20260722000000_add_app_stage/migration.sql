-- =========================================================================
-- Add lifecycle stage to PortalApp — the app pipeline
-- =========================================================================
-- Every app moves through: IN_DEV → VALIDATION → MVP → DEPLOYED.
-- Purely informational: it drives the stage badge users see on app tiles,
-- never who can access what (that stays minRole + departments).
-- Existing apps are all live today, so they default to DEPLOYED.
-- =========================================================================

-- CreateEnum: AppStage
CREATE TYPE "AppStage" AS ENUM ('IN_DEV', 'VALIDATION', 'MVP', 'DEPLOYED');

-- AlterTable: PortalApp gains a stage, defaulting existing rows to DEPLOYED
ALTER TABLE "PortalApp" ADD COLUMN "stage" "AppStage" NOT NULL DEFAULT 'DEPLOYED';
