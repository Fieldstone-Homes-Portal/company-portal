# Prisma migrations workflow

This portal uses `prisma migrate deploy` on every Railway deploy. Schema
changes ship as migration files in `prisma/migrations/`, and only changes
that have a corresponding migration file get applied to production.

## TL;DR — when you change `schema.prisma`

1. Edit `prisma/schema.prisma` locally.
2. Generate a migration:
   ```bash
   npx prisma migrate dev --name short_description
   ```
   Replace `short_description` with something like `add_phone_to_user` or
   `index_envelopes_by_status`.
3. Eyeball the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`.
4. Commit both the schema change AND the migration directory:
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "Add phone field to User"
   git push
   ```
5. Railway runs `prisma migrate deploy` during the build — your migration
   gets applied to prod. Done.

## Why this exists

The old build ran `prisma db push --accept-data-loss` on every deploy.
That "worked" but had one really bad failure mode: any schema change a
developer made — including renaming or dropping a column — would silently
delete data on the next push. There was no way to review the SQL before
it ran, and no recovery if something went wrong.

Migrations fix that by making schema changes:

- **Reviewable** — the generated SQL is right there in git, in a PR diff.
- **Safe** — `migrate deploy` refuses to run anything that would lose
  data unless you write the SQL by hand and acknowledge it.
- **Auditable** — `_prisma_migrations` in the DB records exactly when
  each migration ran. If something breaks, you can see what changed.

## The baseline migration

`prisma/migrations/20260513000000_init/migration.sql` captures the
schema as of the switch. It's intentionally **idempotent** (every
statement uses `IF NOT EXISTS` or a `DO $$ BEGIN … EXCEPTION` block) so
it cleanly applies whether the database is empty (fresh local dev) or
already has every table (production, which was created via the old
`db push` workflow).

You only need to think about this if you're reviewing it. Future
migrations don't need to be idempotent — Prisma tracks what's been
applied, so each migration runs at most once.

## If a migration fails

`prisma migrate deploy` is conservative: if anything goes wrong, it
stops and leaves the DB in its last-known-good state. You'll see the
error in the Railway build logs. Common causes:

| Symptom | Cause | Fix |
|---|---|---|
| `P3009: migrate found failed migrations` | A previous migration failed mid-run | Open Railway shell → `npx prisma migrate resolve --rolled-back <name>` → fix the SQL → redeploy |
| `Drift detected` | Someone changed prod DB manually (outside of migrations) | Bring `schema.prisma` in line with reality OR write a corrective migration |
| `ECONNREFUSED` or similar | Database is down | Wait, redeploy |

When in doubt, the Railway shell has full Prisma CLI access via
`npx prisma <command>`.

## Local development

For local iteration, `prisma migrate dev` works against your local
`DATABASE_URL`. If you don't have a local Postgres, you can still
develop against prod (be careful) — or set up a free Supabase /
Neon / local docker Postgres for safety.

## Don't do this

- **Don't** run `prisma db push` against prod after this point. It
  bypasses the migration history and creates drift.
- **Don't** hand-edit migration files after they've been committed
  and applied to prod. Write a new migration that corrects whatever
  you wanted to change.
- **Don't** delete migration files from `prisma/migrations/`. Prisma
  needs the full history to apply changes correctly.
