# FoodFlow

Fast-food ordering platform for a single-brand restaurant in Egypt — pizza, burgers, sandwiches, fries & sides, chicken, drinks, desserts, and combo deals. Customers order dine-in, takeaway, or delivery with live status; kitchen runs a prep-urgency queue; managers run catalog, staff, and rush-hour analytics.

Live: https://foodflow-eg.vercel.app

## What is inside

Customer: landing page, public menu with 8 categories, search and size selection, cart, checkout with order-type selector, order confirmation, order history, live order tracking, account registration and profile.

Kitchen: prep-deadline queue for active orders, status transitions PENDING to CONFIRMED to PREPARING to READY to COMPLETED, Socket.IO live updates with HTTP refetch fallback.

Manager: revenue and order analytics, popular items, rush-hour breakdown, menu and category CRUD, availability toggles, staff list and role management, restaurant open and closed settings.

Platform: Next.js App Router with TypeScript strict and Tailwind v4 on Vercel; Express with TypeScript, Prisma 7, Zod, and Socket.IO on the API host; PostgreSQL on Neon. Prices, permissions, totals, and order state are server authoritative. Auth uses HttpOnly cookies. Combo prices are server-defined bundles.

## Repository layout

```text
foodflow/
  client/                   # Next.js (App Router, TS strict, Tailwind v4, TanStack Query)
  server/                   # Express + TypeScript + Prisma 7 + Zod + PostgreSQL
  markdown-files/           # product and milestone specs (M1-M7)
```

`client/` and `server/` implement the M1 `frontend/` and `backend/` split. Product specs live in `markdown-files/` (`MASTER-PLAN.md`, `MILESTONES.md`, `IMPLEMENTATION-M*.md`). Any agent working in this repo must treat it as fast food, not generic restaurant food.

## Production deployment

Frontend: `client/` on Vercel, project root `client/`. Set `NEXT_PUBLIC_API_URL` to the API origin (for example `https://YOUR-BACK4APP-APP-URL`). Browser traffic uses same-origin `/api/*` and `/health/*` rewrites, so auth cookies stay first-party.

Backend: `server/` on Back4app Containers from the repo root `Dockerfile`, exposed port 4000. See [Back4app deployment](DEPLOY-BACK4APP.md). Set `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct), `JWT_ACCESS_SECRET` (32+ random characters), `FRONTEND_URL` (exact Vercel origin, no trailing slash), `NODE_ENV=production`, `TRUST_PROXY=true`, `PORT=4000`.

Database: Neon PostgreSQL. Run migrations on the API host at startup (`prisma migrate deploy`), then seed once:

```sh
npm run db:seed:prod
```

with `SEED_OWNER_EMAIL` set to the registered owner account. The seed creates the restaurant, the 8 canonical categories, the menu, and grants that account `OWNER`.

Current status, October 2026: the Vercel frontend is live and the Neon database is reachable, but the Back4app container is returning 404 on `/health` and `/health/ready`. Until the container is restarted with the variables above, the production menu, checkout, kitchen, and admin screens cannot reach the API. After redeploying the commits in this branch, restart the Back4app app, open `https://YOUR-BACK4APP-APP-URL/health/ready`, and expect `{"success":true}`.

## Quickstart with Docker

From the repository root, start PostgreSQL, the API, and the web app together:

```sh
npm run dev
```

Open <http://localhost:3000>. The API is available at <http://localhost:4000>;
`/health` checks that it is running and `/health/ready` also checks PostgreSQL.
Compose starts the API without changing the database schema. On first setup,
apply migrations and seed the catalog explicitly:

```sh
docker compose run --rm server npx prisma migrate deploy
docker compose run --rm server npm run db:seed
```

To grant the seeded restaurant's `OWNER` role to an existing account, set
`SEED_OWNER_EMAIL` in `server/.env` to that account's registered email before
running the seed command. The seed creates the public restaurant and its menu
even when no owner email is configured.

Stop the services with `Ctrl+C`, or run `npm run dev:down` in another terminal.
The PostgreSQL data remains in a Docker volume between runs.

For standalone local development, copy `server/.env.example` to `server/.env`
and `client/.env.example` to `client/.env.local`. Never put production Neon
credentials or the production JWT secret into `server/.env`; those belong only
in the hosting platforms' secret managers.

## Admin account

Register the owner account through the deployed frontend (`/register`), then set `SEED_OWNER_EMAIL` to that email and run `npm run db:seed:prod` once against the production database. Sign in again: `/admin` manages catalog, analytics, staff, and settings; `/kitchen` accepts and advances orders. The last `OWNER` cannot be demoted or removed. Rotate `JWT_ACCESS_SECRET` if it was ever copied outside the secret manager.

## Checks

| Check     | Backend                                                     | Frontend                         |
| --------- | ----------------------------------------------------------- | -------------------------------- |
| Starts    | `npm run dev` (:4000)                                       | `npm run dev` (:3000)            |
| Health    | `GET /health` (live), `GET /health/ready` (live + DB)       | `/` has a connection disclosure |
| Typecheck | `npm run typecheck`                                         | `npm run typecheck`              |
| Lint      | `npm run lint`                                              | `npm run lint`                   |
| DB        | `npx prisma validate` passes / live DB needs `DATABASE_URL` | —                                |

With the isolated local database `foodflow_m4_test`, run the backend integration
suite using `TEST_DATABASE_URL`. These tests rebuild its `public` schema and
must never point to a database containing valuable data. The client production
build uses `npm run build` with webpack on hosts where Turbopack workers cannot
bind a local port.

```sh
TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/foodflow_m4_test npm test
```

Production smoke test, after the API host is healthy: register, login, browse the fast-food menu, place a takeaway combo order, confirm the kitchen receives it, advance it to READY, confirm the customer sees the update, logout, and confirm unauthorized admin access is denied. The backend-only script covers health, register, login, public menu, admin denial, origin denial, and security headers:

```sh
./server/scripts/smoke.sh https://YOUR-BACK4APP-APP-URL
```

## Images and photography

The landing photography uses local copies in `client/public/food/`, including the category tiles, menu item photos, the combo banner, and the 120-frame scroll-driven burger film in `client/public/food/burger-sequence/`. The site icon is `client/app/icon.svg` and social sharing uses `/food/combo.jpg` through Open Graph and Twitter metadata.

The menu photos are real stock photographs, not photographs of FoodFlow's actual dishes. Replace them with approved product photography before taking real orders. The burger film is generated media with subtle movement, so replace it with a real shoot of the restaurant's burger before using it as authentic product photography.

The seed prices are provisional Egyptian market benchmarks, not confirmed FoodFlow selling prices. They were checked against published Egyptian menus in October 2026. Confirm each size, bundle, tax, and delivery charge with the restaurant owner before production. The seed only creates missing items; it does not overwrite the prices of an existing catalog when run again.

## Search and social

The app ships `sitemap.xml` and `robots.txt` from the App Router, canonical URLs, Open Graph and Twitter cards, a web manifest, and Restaurant JSON-LD pointing at `https://foodflow-eg.vercel.app`. New domains are not indexed automatically: verify the property in Google Search Console, submit `/sitemap.xml`, and wait for the first crawl. Ranking depends on real content, reviews, and links, not on metadata alone.

## Architecture (M1 proof)

`Route → Controller (thin) → Service → Repository → Prisma → PostgreSQL`,
demonstrated by `server/src/modules/health/` (`PrismaHealthRepository`
behind `IHealthRepository`). Shared error envelope:
`{ success, data }` / `{ success: false, error: { code, message, details? } }`.

## Database setup

Prisma is configured with the Prisma 7 config file and PostgreSQL driver
adapter. Keep `DATABASE_URL` for application queries and `DIRECT_URL` for
migrations. `server/.env` overrides the local Docker defaults, so verify which
database those URLs target before applying migrations.
