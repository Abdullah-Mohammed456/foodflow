# FoodFlow Backend

The API implements authentication, catalog management, and M4 customer ordering.
The frontend remains at its foundation stage. Kitchen status controls and realtime
updates belong to M5.

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
and status atomically. Kitchen confirmation and later status transitions are
reserved for M5.

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
