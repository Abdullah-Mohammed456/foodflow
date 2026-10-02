# FoodFlow Backend

The API implements authentication, catalog management, M4 customer ordering,
and M5 kitchen operations with Socket.IO. The frontend remains at its foundation
stage. See [REALTIME.md](REALTIME.md) for the M5 implementation walkthrough,
socket authentication, event contracts, kitchen routes, and reconnection policy.

## Authentication limits

Registration is limited to five attempts per IP address each hour. Login is
limited to five failed attempts per IP address in 15 minutes; successful logins
do not consume that allowance. The API returns `429` with error code
`RATE_LIMITED` and standard `RateLimit` headers when a limit is reached.

Set `TRUST_PROXY="true"` only when the server is behind a trusted reverse proxy
that supplies the client IP. The default is `false` for local Docker. The four
`AUTH_*` environment variables in `.env.example` adjust the two windows and
limits without code changes. The default in-memory store applies per running
server process; production horizontal scaling needs a shared rate-limit store.

## M4 database setup

Generate the Prisma client and apply migrations from this directory:

```sh
npm run prisma:generate
npx prisma migrate deploy
```

Check `DIRECT_URL` before applying migrations. These commands target the database
configured in `server/.env`. Development schema changes should use migrations.
The M4 migrations create orders and order items, then add checkout deduplication,
delivery addresses, and database checks for financial consistency.

## Customer order endpoints

All endpoints require the existing `foodflow_access` HttpOnly authentication
cookie and the global `CUSTOMER` role. The server derives the customer identity
from authentication; the request cannot choose a customer.

- `POST /api/orders`: create an order, returning `201` and `{ order, replayed: false }`.
- `GET /api/orders?page=1&limit=20&status=PENDING`: list the customer's orders.
  The optional status filter accepts an `OrderStatus` enum value. Maximum limit
  is 100; results are newest first and include pagination metadata.
- `GET /api/orders/:publicId`: return the customer's order and purchased items.
- `POST /api/orders/:publicId/cancel`: cancel a pending order. Send `{}` or an
  empty body. Repeating cancellation of an already cancelled order succeeds.

Responses use the existing `{ success, data }` / `{ success: false, error }`
envelopes. Detail and cancellation return `data.order`; history returns
`data.items` and `data.pagination`. Unknown orders and orders owned by another
customer both return `404`. Unsupported cancellation states return `409`.

## Checkout request

Use menu item IDs and available sizes from the public catalog. Every size,
including unsized products using `REGULAR`, has a server-defined variant price.

```json
{
  "restaurantId": "restaurant-id-from-catalog",
  "checkoutKey": "9f96ad6e-2f16-4d39-b537-4d556643c2ac",
  "orderType": "TAKEAWAY",
  "items": [
    {
      "menuItemId": "burger-id-from-catalog",
      "size": "SINGLE",
      "quantity": 2
    },
    {
      "menuItemId": "combo-id-from-catalog",
      "size": "REGULAR",
      "quantity": 1
    }
  ],
  "notes": "No onions"
}
```

Order types are `DINE_IN`, `TAKEAWAY`, and `DELIVERY`. Delivery requires a
`deliveryAddress` string of 5–500 characters; other order types reject this
field. Notes are optional and limited to 1,000 characters. A checkout accepts
1–50 distinct item/size lines with integer quantities of 1–20. Merge duplicate
item/size lines before checkout. Unknown body fields, client prices, totals,
discounts, ownership, and order status are rejected.

Create one UUID `checkoutKey` for each intended order. Keep the same key when
retrying after a timeout or network failure. The same customer, key, and request
return the original order with `200` and `replayed: true`, even if the catalog
has subsequently changed. Item ordering does not change request identity.
Reusing that key with different order contents returns `409`. Another customer
has a separate key namespace. Internal checkout keys and request hashes are
excluded from responses.

## Pricing and persistence

Checkout rechecks the open restaurant, item branch, category activity, item
availability, selected size, and variant availability. Combo variants use their
stored bundle prices. Decimal arithmetic calculates line totals and subtotal;
monetary values are serialized as decimal strings. M4 applies no delivery fee,
tax, or discount: `deliveryFee = 0`, `discount = 0`, and `total = subtotal`.
Delivery zones, fee configuration, and promotions remain future work.

The catalog read, validation, pricing, and nested order/item insertion run in
one serializable transaction. Concurrent write conflicts are retried up to
three attempts. Reuse the same checkout key if the API returns a retryable
checkout conflict. A database uniqueness constraint prevents duplicate orders
for the same customer and checkout key.

Order items preserve name, description, size, combo status, unit price,
quantity, and line total at purchase time. Catalog edits do not change these
snapshots. Referenced menu items and variants cannot be deleted while orders
use them; use availability controls to retire them. Database checks enforce
positive quantities and unit prices, correct line totals, nonnegative order
amounts, and `total = subtotal + deliveryFee - discount`.

Customers can cancel only `PENDING` orders. The update checks customer ownership
and status atomically. Kitchen confirmation and later status transitions use the authenticated M5 kitchen API.

## Verification

```sh
npm run typecheck
npm run lint
npm run build
npm test
```

Schema tests run without a database. The API integration suite is skipped unless
`TEST_DATABASE_URL` is set. Integration tests require a local PostgreSQL database
named `foodflow_m4_test`; they reset its public schema and apply all migrations.
Use a disposable database exclusively for these tests:

```sh
TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/foodflow_m4_test npm test
```

The integration suite covers pricing, tampering, authentication, ownership,
availability, delivery, history, snapshot preservation, concurrent checkout
retries, cancellation, transaction rollback, and financial database constraints.

Authentication integration tests additionally cover registration without email
enumeration, password verification, the HttpOnly cookie, protected profile
routes, logout, role denial, and the login limit.

## M6 admin analytics and staff (backend)

All routes require the `foodflow_access` cookie and current restaurant
membership. Analytics accept `OWNER` or `MANAGER`; staff mutations require
`OWNER`. The global `ADMIN` role alone grants nothing without membership.

- `GET /api/restaurants/:restaurantId/admin/overview?from&to`: totals,
  revenue excluding cancelled orders, average order value, active queue,
  completed count, average fulfillment minutes, breakdowns by status and
  order type. Date range is limited to 90 days.
- `GET /api/restaurants/:restaurantId/admin/revenue?granularity=day|hour&from&to`:
  revenue buckets with order counts, cancelled orders excluded.
- `GET /api/restaurants/:restaurantId/admin/popular-items?limit&from&to`:
  top items by quantity with revenue, category, and combo flag.
- `GET /api/restaurants/:restaurantId/admin/rush?days=1..30`: orders per
  UTC hour plus the peak hour.
- `GET /api/restaurants/:restaurantId/admin/staff`: list members.
- `POST /api/restaurants/:restaurantId/admin/staff`: add by email with an
  explicit `OWNER`, `MANAGER`, or `KITCHEN` role. Unknown emails return
  `404`; duplicates return `409`.
- `PATCH /api/restaurants/:restaurantId/admin/staff/:memberId`: change role.
- `DELETE /api/restaurants/:restaurantId/admin/staff/:memberId`: remove.

Demoting or removing the last `OWNER` returns `409`. Restaurant open/closed
and catalog settings remain on the existing manager catalog API; delivery
zones and fee configuration are still future work.

## M7 security and deployment (backend)

- `helmet` headers enabled, `x-powered-by` disabled, `x-request-id` set on
  every response and included in JSON request logs. Logs contain method,
  path, status, and duration only.
- CORS allows only `FRONTEND_URL` with credentials. State-changing
  `/api/*` requests carrying a foreign `Origin` or `Referer` return `403`.
  Socket.IO already enforces the same origin at `/api/socket.io`.
- Rate limits: strict auth limits plus general (600/min), checkout
  (60/min), and admin analytics (120/min) limiters with the standard
  `429` envelope. General limiters are skipped when `NODE_ENV=test`.
  Configure windows and limits through the `API_*` variables in
  `.env.example`; horizontal scaling still needs a shared store.
- `server/Dockerfile` builds a production image (`prisma migrate deploy`
  then `node dist/server.js`). Local compose targets the `build` stage
  for `npm run dev`. `render.yaml` deploys the API with `/health/ready`
  checks and `TRUST_PROXY=true` behind Render.
- Production smoke test without client code:

```sh
./scripts/smoke.sh https://api.example.com
```

It covers health, register, login, public menu, admin denial, origin
denial, and security headers.
