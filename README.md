# FoodFlow

Single-brand fast-food restaurant ordering platform (pizza, burgers, sandwiches, fries & sides, chicken, drinks, desserts, combos & deals). Specs live in `markdown-files/`
(`MASTER-PLAN.md`, `MILESTONES.md`, `IMPLEMENTATION-M*.md`). Any agent working in this repo must treat it as fast food — not generic restaurant food.

## Current progress

The MVP client now includes the photo-led FoodFlow landing page, public menu,
account registration and profile, cart, checkout, order history and live status,
kitchen queue, and manager analytics, catalog, staff, and settings. It uses the
M1–M7 backend APIs; prices, permissions, totals, and order state remain server
authoritative. Customer and kitchen screens refetch after Socket.IO events and
poll when disconnected. The M1 connectivity probe remains in the landing
page's “Connection status” disclosure. See `server/README.md` for API and
migration details.

Production rollout to Vercel, an API host, and Neon is pending. The database is
already on Neon; the repository owner will connect the real project URLs. For
a no-credit-card staging backend, see [Railway deployment](DEPLOY-RAILWAY.md).
Set `NEXT_PUBLIC_API_URL` on Vercel to the API origin, and `FRONTEND_URL` on the
API host to the Vercel origin. Keep Neon credentials and JWT secrets in the
platforms' secret managers, run migrations and the catalog seed, then perform
the production smoke test documented in `server/README.md`.

## Layout

```text
foodflow/
  client/                   # Next.js (App Router, TS strict, Tailwind v4, TanStack Query)
  server/                   # Express + TypeScript + Prisma 7 + Zod + PostgreSQL
  markdown-files/           # product / architecture / milestone docs
```

(`client/` ↔ `server/` implement the M1 `frontend/` ↔ `backend/` split.)

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
and `client/.env.example` to `client/.env.local`. Docker uses the local
PostgreSQL service by default. To use Neon with Docker, edit `server/.env`:
set `DATABASE_URL` to Neon's pooled URL and `DIRECT_URL` to its direct URL.
The optional `server/.env` overrides the local defaults in the example file.
For standalone local development, set both URLs to your database and use a
generated secret for `JWT_ACCESS_SECRET`.
```

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

The landing's photography is composed of user-supplied images in
`foodflow-mockups/` and real food photos from Pexels; local copies live in
`client/public/food/`. The interface copy is in English.
Additional menu photography: [Margherita pizza](https://www.pexels.com/photo/photo-of-margherita-pizza-14590497/),
[pepperoni pizza](https://www.pexels.com/photo/close-up-of-a-pepperoni-pizza-7813574/),
[loaded fries](https://www.pexels.com/photo/delicious-loaded-fries-with-cheese-and-sauces-29285460/),
[chicken nuggets](https://www.pexels.com/photo/close-up-shot-of-a-fried-food-11710531/), and
[milkshake](https://www.pexels.com/photo/refreshing-vanilla-milkshake-on-wooden-table-28525198/).
Distinct photos added for [club sandwich](https://www.pexels.com/photo/club-sandwich-with-bowl-of-fries-12469931/),
[crispy chicken sandwich](https://www.pexels.com/photo/close-up-of-a-chicken-sandwich-9211149/),
[cola](https://www.pexels.com/photo/a-glass-of-iced-cola-8879617/), and
[chocolate cake](https://www.pexels.com/photo/chocolate-cake-slice-1028711/).
These are real stock photographs, not photographs of FoodFlow's actual dishes.
Replace them with approved product photography before taking real orders.

The seed prices are provisional Egyptian market benchmarks, not confirmed
FoodFlow selling prices. They were checked against the published menus of
[Buffalo Burger](https://buffaloburger.com/branches/all/menu?lang=en) and
[Domino's Egypt](https://store.dominos.com.eg/en/giza/el-shikh-zaid/domnyoz-bytza-607)
in October 2026. Confirm each size, bundle, tax, and delivery charge with the
restaurant owner before production. The seed only creates missing items; it
does not overwrite the prices of an existing catalog when run again.

On the production API host, after migrations have succeeded, register the
restaurant owner's account, set `SEED_OWNER_EMAIL` to that email, and run
`npm run db:seed:prod` once from the built server directory. This creates the
catalog on a fresh database and grants that registered account `OWNER` access.
The production image includes `dist/seed.js` and does not need development
dependencies for this step.

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
