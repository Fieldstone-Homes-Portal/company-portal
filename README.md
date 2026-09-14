This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Access and Requests (local redesign)

Access Studio uses searchable people/group/software selections and immediate grant/remove actions.
The group model extends Department with `source` and `externalId`; existing departments remain custom
groups. Microsoft 365 group metadata is read through Graph, and current membership is checked on each
session. Custom groups are edited in Access Studio. Graph pagination is restricted to Microsoft's origin.

`/requests` is available to all authenticated employees; Request Center enforces requester privacy and
category-manager permissions. Set `REQUEST_CENTER_URL` and the existing portal identity signing variables.
`CORNERSTONE_PREVIEW=1` labels a local preview and must be unset in production.

Required migration: `20260914193000_access_groups`. The existing `GRAPH_*` app credentials need read
permissions for group listing and user transitive memberships. No Microsoft directory writes are used.

### Request Center preview

Requests remains under Management at `/admin/request-center`, restricted to
ADMIN users. The former `/requests` link redirects admins there and sends
non-admins home. Request Center also enforces its production preview allowlist
so old iframe links cannot admit employees before launch.

### Access Studio administrators

Access Studio and its access-changing APIs are restricted to Tim (`tim@fieldstonehomes.com`) and Skyler (`skyler@fieldstonehomes.com`), each with the ADMIN role. The same restriction protects app policies, user roles, and access-group membership edits. Other administrators do not inherit these privileges. The allowlist lives in `src/lib/accessStudioPolicy.ts`.

### Global search and retained apps

The shared header provides instant access-scoped app search with an overlay, Cmd/Ctrl+K, arrow keys, Enter, Escape, and click-away dismissal. It does not debounce into the URL or depend on selected Toolbox tags. Historical `?q=` links still filter the Toolbox. Expanded embedded apps retain the header. Tim, while ADMIN, can discover/open inactive registered apps; other users keep the active-only catalog.

Run `node scripts/register-facilities-and-retained-apps.mjs` once after deploying the facilities routes. This registers Facilities Management for Tonya, Tim, and Skyler and adds missing retained app entries for Tim without enabling them for staff. No announcement is generated.
