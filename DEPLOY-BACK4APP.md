# FoodFlow backend on Back4app Containers

Back4app's free container URL is temporary: it expires 60 minutes after a
deployment starts. Redeploying restarts the window. A permanent container URL
requires a paid plan. The free plan is unsuitable for continuous ordering.
This was verified against [Back4app's September 2026 update](https://www.back4app.com/blog/deploy-node-app-dockerfile-back4app).
Neon is separate; expiry of the API container does not delete the Neon database.

The instructions below apply to a container with a working URL. Do not treat a
successful one-hour preview as an ongoing production deployment.

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

The frontend proxies `/api/*` and `/health/*` to the configured backend through
Next.js rewrites. Browser requests remain on the Vercel origin, so the
HttpOnly production cookie uses `Secure; SameSite=Lax` without relying on
third-party cookies. Socket.IO uses same-origin HTTP polling through the same
proxy. Deploy both client and server for this authentication update, then test
Safari and Chrome with third-party cookie blocking. Keep any `API_INTERNAL_URL`
override pointed at the correct backend because it takes precedence for rewrites.

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
