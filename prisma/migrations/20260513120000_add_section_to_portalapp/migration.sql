-- Add the `section` column to PortalApp. Splits apps into Toolbox vs
-- Dashboards. Default 'tool' so existing rows show up in Toolbox like
-- they always did.
--
-- IF NOT EXISTS makes this safe to run against any DB state, including
-- ones where `section` was already added out-of-band via `db push`.
ALTER TABLE "PortalApp"
  ADD COLUMN IF NOT EXISTS "section" TEXT NOT NULL DEFAULT 'tool';
