# FoodFlow

Single-brand fast-food restaurant ordering platform (pizza, burgers, sandwiches, fries & sides, chicken, drinks, desserts, combos & deals). Specs live in `markdown-files/`
(`MASTER-PLAN.md`, `MILESTONES.md`, `IMPLEMENTATION-M*.md`). Any agent working in this repo must treat it as fast food — not generic restaurant food.

## Current progress

The backend implements authentication, catalog management, and M4 customer
ordering. The frontend remains the M1 connectivity page. Kitchen/realtime,
analytics, and production deployment are planned milestones. See
`server/README.md` for the customer order API, pricing policy, migration setup,
and integration test instructions.

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

## Checks (M1 exit criteria)

| Check     | Backend                                                     | Frontend                         |
| --------- | ----------------------------------------------------------- | -------------------------------- |
| Starts    | `npm run dev` (:4000)                                       | `npm run dev` (:3000)            |
| Health    | `GET /health` (live), `GET /health/ready` (live + DB)       | `/` shows server + client probes |
| Typecheck | `npm run typecheck`                                         | `npm run typecheck`              |
| Lint      | `npm run lint`                                              | `npm run lint`                   |
| DB        | `npx prisma validate` passes / live DB needs `DATABASE_URL` | —                                |

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
