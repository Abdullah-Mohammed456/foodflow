# FoodFlow release checklist

## Hosting blocker

Back4app free container URLs expire 60 minutes after deployment. A permanent
backend host is required before taking real orders; redeploying every hour is
not a production solution. Neon data is hosted separately.

## Deployment after editing

- Commit and push to the connected branch. Confirm the same commit is Ready in Vercel and running in Back4app.
- Client-only changes require a Vercel deployment. Server-only changes require a Back4app deployment. This authentication update changes both and requires both deployments.
- Automatic deployment must be enabled on each host. If it is disabled, redeploy manually.
- Changing environment variables does not require a Git commit. Redeploy the affected host. Next.js rewrites and public environment variables are evaluated during the frontend build.
- Vercel project root: `client`. Build command: `npm run build`.
- Vercel `NEXT_PUBLIC_API_URL`: current Back4app origin. Optional `API_INTERNAL_URL` overrides the rewrite destination; do not leave an obsolete local or Docker URL in production.
- Back4app `FRONTEND_URL`: `https://foodflow-eg.vercel.app`. Port: 4000. Set the production database URLs, JWT secret, `NODE_ENV=production`, and `TRUST_PROXY=true` privately.
- Browser HTTP and Socket.IO polling requests use same-origin `/api` rewrites. Cookies remain HttpOnly, Secure in production, SameSite=Lax, and scoped to `/api`. Authentication no longer depends on accepting third-party cookies.
- Backend migrations run at startup through the Docker command. Database changes require a committed Prisma migration; editing the schema alone does not update Neon.

## Actual food photography

Provide 27 distinct still photographs of the restaurant's actual food. Do not use generated or unrelated stock photography as evidence of what a customer will receive.

- Pizza: 5 (2 menu products and 3 editorial views).
- Burgers: 4 (2 menu products and 2 editorial views).
- Sandwiches: 3 (2 menu products and 1 editorial view).
- Fries & Sides: 4 (2 menu products and 2 editorial views).
- Chicken: 3 (nuggets product and 2 editorial views).
- Drinks: 3 (cola and milkshake products and 1 editorial view).
- Desserts: 2 (cake product and 1 editorial view).
- Combos & Deals: 3 (complete combo product and 2 editorial views).

The 13 minimum menu photos should correspond exactly to these product slugs:

- `margherita-pizza`
- `pepperoni-pizza`
- `classic-cheeseburger`
- `double-smash-burger`
- `crispy-chicken-sandwich`
- `club-sandwich`
- `french-fries`
- `loaded-fries`
- `chicken-nuggets`
- `cola`
- `milkshake`
- `chocolate-cake`
- `burger-fries-drink-combo`

Supply menu shots with room for square and 4:3 crops, ideally at least 1600 pixels on the long edge. Supply editorial shots in landscape with space for copy; include a 1920-by-1080 or larger hero background. Keep lighting and presentation consistent and provide approved final EGP prices for every size.

For the burger film, provide one real 4-to-6-second shot at 1080p and 30 or 60 fps: fixed camera, fixed lighting and background, slow continuous turntable rotation of the same assembled burger, no cuts or zooms. The existing Gemini film remains a prototype. Its 120-frame canvas rendering improves playback but cannot create physical rotation absent from the source video.

## First owner account

1. Register a normal account through `/register`.
2. In a trusted backend environment connected to the intended Neon database, set `SEED_OWNER_EMAIL` to that registered email.
3. Run `npm run db:seed:prod` from `server/` after the server build and migrations. This grants restaurant OWNER membership to the existing account; it does not create a password or a public admin signup.
4. Sign in again and open `/admin` and `/kitchen`. Kitchen/Manage navigation appears after the membership check succeeds.
5. From Admin > Staff, add other registered accounts as MANAGER or KITCHEN. Do not give normal customers OWNER access.

If Back4app has no terminal, run the same seed from a trusted local environment with the production database URL supplied privately. Do not commit the URL. Merely setting `SEED_OWNER_EMAIL` does not execute the seed.

## Verification completed locally

- Backend typecheck, lint and compilation passed during this update.
- Frontend typecheck, lint and production build passed during this update.
- 56 backend tests passed against a disposable local PostgreSQL database, with zero failures and zero skips. Coverage includes authentication, order prices and idempotency, permission denial, admin roles, kitchen transitions and realtime events.
- Added realtime regression coverage for same-origin polling with a trusted Referer and rejection of a malicious Origin even when the Referer is trusted.
- Local browser checks passed: menu loading, cart addition, login returning to checkout, session surviving reload, order submission, owner kitchen access, and all kitchen status transitions. Desktop hero and full-screen horizontal scrolling were visually checked; mobile hero and native horizontal overflow were checked at 390px. This does not replace deployed browser coverage.
- The existing production deployment has not been verified with this code. At the last check, the old Back4app URL returned 404 on readiness; inspect the current container status and URL before testing customer flows.

## Required staging and production smoke tests

Use a separate Neon branch/database and visibly named test accounts for staging. Do not point the destructive backend integration suite at production.

1. Confirm `/health/ready` succeeds and all eight categories load.
2. Register, sign in, reload `/account`, navigate to `/checkout`, and verify the session survives with third-party cookies blocked.
3. Add items, change sizes and quantities, reload the cart, filter/search the menu, and verify out-of-stock items cannot be ordered.
4. Place takeaway, dine-in and delivery orders; delivery must require an address. Verify server totals and safe retry without duplicate orders.
5. Confirm the owner sees the order in `/kitchen`; advance every state and verify the customer's tracking updates. Test reconnection and polling fallback.
6. Confirm an ordinary customer cannot open staff APIs or another customer's order. Confirm kitchen staff cannot manage owners or change menu prices.
7. Test menu creation/editing, availability, restaurant closure, staff addition/removal, analytics and the last-owner protection.
8. Sign out; account/orders must become protected and another login must not display cached data from the prior account.
9. Check 390px and desktop layouts, keyboard navigation, reduced-motion mode, hero hover reset and smooth sequence scrolling. Check browser console errors.
10. Repeat the critical customer and kitchen journey on the deployed release, identify test orders clearly, and cancel any pending test order after verification.

## Remaining before taking real orders

- Complete the browser and deployed smoke tests above.
- Confirm actual prices, taxes/fees, delivery coverage, opening hours and customer contact/support procedures with the restaurant.
- Supply authentic photos and film.
- Resolve the reported build-tool dependency advisory: the current audit reports five high findings propagated from `braces` through ESLint tooling. No compatible patched `braces` version was available in the registry checked during this update. Do not blindly run `npm audit fix --force`, which proposes a Next ESLint configuration downgrade.
- Measure the 256MB backend limit under realistic concurrent requests and monitor errors, backups and recovery. Free hosting is not a measured uptime guarantee.
- AI-assisted testing tools such as mabl can exercise configured browser journeys; they do not guarantee the absence of bugs. Keep the API regression suite and repeatable browser tests alongside exploratory testing.

A one-time owner creator is available as `npm run owner:bootstrap:prod`; see README. The requested production owner has not been created because privileged Neon access has not been provided.
