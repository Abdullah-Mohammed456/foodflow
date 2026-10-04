# FoodFlow backend on Railway

Railway's Free plan currently allows sign-up without a credit card. It starts
with a 30-day trial and $5 of usage credit, then includes $1 of monthly usage.
This is useful for a staging deployment. Check the service's actual usage and
availability before accepting daily customer orders; a free allowance is not an
uptime guarantee.

## 1. Create the API service

1. Push the current repository commits to GitHub. Railway builds from the
   selected GitHub branch, not from files that exist only on this laptop.
2. In Railway, create a project, add a service from the FoodFlow GitHub repo,
   and select the intended branch.
3. Keep the service root directory at `/` because `server/Dockerfile` copies
   files from the root build context. In Build settings, set the Dockerfile path
   to `server/Dockerfile`. Do not set the root directory to `/server`.
4. Set the healthcheck path to `/health/ready`, then generate a public Railway
   domain under Networking. The Dockerfile starts the server after running
   `prisma migrate deploy`; the server reads Railway's `PORT` variable.

## 2. Set private variables in Railway

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection URL |
| `DIRECT_URL` | Neon direct PostgreSQL connection URL for migrations |
| `JWT_ACCESS_SECRET` | A unique random secret of at least 32 characters |
| `FRONTEND_URL` | Exact Vercel production origin, such as `https://foodflow.example.com`, without a trailing slash |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |

Keep all values in Railway's private Variables screen. Do not put them in Git,
screenshots, tickets, or chat. Railway supplies `PORT`; it does not need a
manually chosen value.

`FRONTEND_URL` must exactly match the browser's frontend origin. Preview URLs
on Vercel have different origins, so test with the configured production or
staging URL. The API permits only that origin for credentialed requests and
Socket.IO connections.

## 3. Connect Vercel

Deploy `client/` as the Vercel project root and set
`NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app` in Vercel's
environment settings. Redeploy the frontend after changing this value because
Next.js embeds public environment variables in the client build.

The current production authentication cookie uses `Secure; SameSite=None` to
work across separate Vercel and Railway domains. Some browsers block cross-site
cookies. For reliable customer logins, use a common custom domain such as
`www.yourdomain.com` for Vercel and `api.yourdomain.com` for Railway, then test
login and checkout in Safari and Chrome with third-party cookie blocking.

## 4. Confirm the API and create the owner account

1. Open `https://YOUR-RAILWAY-DOMAIN.up.railway.app/health/ready`. A successful
   response confirms both the API and Neon connection. A failed deployment may
   indicate an invalid `DIRECT_URL`, migration error, or missing variable.
2. Register the restaurant owner's own account on the deployed frontend.
3. Set `SEED_OWNER_EMAIL` on Railway to that registered address. Run the
   production catalog seed once from the running service using Railway's
   command/shell facility, if available: `npm run db:seed:prod`. If that
   facility is unavailable on the Free plan, run the same built-server command
   from a trusted local environment with the matching Neon URLs and the owner's
   email set. Verify the database target first. The seed also creates the menu
   and grants the registered user the `OWNER` role.
4. Log out and in again, open `/admin` to manage the menu and orders, and open
   `/kitchen` to advance order status.

The seed prices and current stock photos are provisional. Confirm the actual
restaurant menu, prices, products, and photos before accepting real orders.

## 5. Staging check

Use a separate Neon branch or database for staging. Register a customer and
owner, place a test order, confirm that it appears in `/kitchen`, advance it to
completion, and check customer order history. Repeat with a browser that blocks
third-party cookies. Watch Railway's usage panel for a week to see whether the
free allowance is sufficient for this backend.
