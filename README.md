# FoodFlow (M1 — Foundation)

Full-stack restaurant ordering platform. Specs live in `reports-markdown-files/`
(`MASTER-PLAN.md`, `MILESTONES.md`, `IMPLEMENTATION-M*.md`).

## Layout

```text
foodflow/
  client/                   # Next.js (App Router, TS strict, Tailwind v4, TanStack Query)
  server/                   # Express + TypeScript + Prisma 7 + Zod + PostgreSQL
  reports-markdown-files/   # product / architecture / milestone docs
```

(`client/` ↔ `server/` implement the M1 `frontend/` ↔ `backend/` split.)

## Quickstart with Docker

From the repository root, start PostgreSQL, the API, and the web app together:

```sh
npm run dev
```

Open <http://localhost:3000>. The API is available at <http://localhost:4000>;
`/health` checks that it is running and `/health/ready` also checks PostgreSQL.
Compose applies the Prisma migrations before starting the API.

Stop the services with `Ctrl+C`, or run `npm run dev:down` in another terminal.
The PostgreSQL data remains in a Docker volume between runs.

For standalone local development, copy `server/.env.example` to `server/.env`
and `client/.env.example` to `client/.env.local`. Set `DATABASE_URL` to the
Neon pooled URL and `DIRECT_URL` to the direct URL before starting each service
from its own directory. Use a generated secret for `JWT_ACCESS_SECRET`.
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

## Known M1 deviations

- **Prisma 7 stable** instead of Prisma 8: Prisma 8 has no stable/coherent
  `@prisma/client` release on npm yet (CLI is `8.0.0-rc.19`, client `latest`
  is `7.10.0`). Upgrade path: bump `prisma` + `@prisma/client` to 8 when the
  client ships. Prisma 7 config style is already in place (`prisma.config.ts`,
  driver adapter via `@prisma/adapter-pg`).
- **Live DB not wired**: `/health` responds, `/health/ready` correctly returns
  `DATABASE_ERROR` until a Neon `DATABASE_URL` is provided, then run
  `npx prisma migrate dev`.
