# FoodFlow backend on Back4app Containers

Back4app Containers currently lists a $0 monthly Free container with no credit
card and no stated time limit. It allows one Dockerized web app with 0.25 shared
CPU, 256 MB RAM, and 100 GB transfer. This is the nearest fit for FoodFlow's
Express and Socket.IO backend while Vercel hosts the frontend and Neon hosts
PostgreSQL. Test memory use and reliability before accepting real orders.

## 1. Create the container app

1. Push the current commits to GitHub. Back4app builds from a connected GitHub
   branch; it cannot see commits that exist only on this laptop.
2. Sign in to Back4app Containers and connect the FoodFlow GitHub repository.
3. Create a new container app on the Free plan. Choose `main` as the branch and
   `/` as the project root. The root `Dockerfile` builds only `server/`, applies
   Prisma migrations on start, and exposes TCP port 4000.
4. Enable automatic deployment only after the initial smoke test. Save the
   generated HTTPS app URL for Vercel.

## 2. Set private variables in Back4app

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL |
| `DIRECT_URL` | Neon direct PostgreSQL URL for migrations |
| `JWT_ACCESS_SECRET` | A unique random secret with at least 32 characters |
| `FRONTEND_URL` | Exact Vercel production origin, no trailing slash |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `PORT` | `4000` |

Keep all secrets in Back4app's environment variable settings, never in Git or
chat. Set the app's exposed port to 4000 if prompted. `FRONTEND_URL` must match
the browser's frontend origin exactly because CORS and Socket.IO accept only
that origin.

## 3. Connect Vercel

Deploy `client/` as the Vercel project root. Set
`NEXT_PUBLIC_API_URL=https://YOUR-BACK4APP-APP-URL` in Vercel's environment
settings, then redeploy the frontend. Next.js embeds public environment values
in the client build.

FoodFlow's production authentication cookie uses `Secure; SameSite=None` across
separate Vercel and Back4app domains. Some browsers block cross-site cookies.
For reliable customer login, put both apps under one site, such as
`www.yourdomain.com` and `api.yourdomain.com`, then test Safari and Chrome with
third-party cookie blocking.

## 4. Check the API and grant owner access

1. Open `https://YOUR-BACK4APP-APP-URL/health/ready`. Success confirms the API
   and Neon connection. If startup fails, inspect container logs for missing
   variables, an invalid Neon `DIRECT_URL`, migration errors, or memory limits.
2. Register the restaurant owner's own account through the deployed frontend.
3. Set `SEED_OWNER_EMAIL` to that registered email and run
   `npm run db:seed:prod` once against the intended Neon database. Use a trusted
   local environment if the Free container has no shell facility; verify the
   database URLs before running it. This creates the menu and grants that user
   the `OWNER` restaurant role.
4. Sign in again. Use `/admin` for management and `/kitchen` to accept and
   advance orders.

The current prices and stock photos are provisional. Confirm the restaurant's
real menu and imagery before accepting customer orders.

## 5. Stage and measure

Use a separate Neon branch or database for staging. Place a customer test order,
confirm it appears in the kitchen queue, advance it, and check customer history
and live updates. Test login on browsers that block third-party cookies. Watch
the Back4app RAM and CPU metrics under load. If the server exceeds 256 MB,
the Free container is not sufficient for FoodFlow's real usage.
