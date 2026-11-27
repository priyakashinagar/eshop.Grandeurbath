# Grandeur Bath API

Express + MongoDB backend for the website in the parent folder.

## Run it

```bash
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed                # dummy products, coupons, website settings and the admin user
npm run dev                 # http://localhost:5000/api
```

No MongoDB yet? Leave `MONGODB_URI` empty and `npm run dev` starts a temporary in-memory database with
the dummy data (admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`, or `admin@grandeurbath.local` /
`admin12345`). Everything is lost when it restarts. Production always needs `MONGODB_URI`.

Then run the website from the parent folder with `npm run dev`. Vite forwards `/api` to port 5000.
In production, set `VITE_API_URL` for the website to the deployed API address and add the website
address to `CORS_ORIGINS`.

`npm test` runs the API tests against an in-memory database.

## Which products the website shows

The admin panel controls this:

- `showOnWebsite` on each product: hidden products never appear on the website or in orders.
- `maxWebsiteProducts` setting: the website shows at most this many allowed products (0 = no limit),
  ordered by `websiteOrder`, then newest first.

The dummy products come from `src/seed/products.js`. When the existing product API is ready, either
sync it into the `products` collection or replace `websiteProducts()` in `src/services.js`.

## Endpoints

All responses are JSON with `ok: true|false`; errors include a `message` for customers.
Send `Authorization: Bearer <token>` for logged-in routes. Guests prove an order is theirs with `?mobile=`.

### Store (public)

| Method | Path | What |
|---|---|---|
| GET | /api/products | Products allowed on the website. Optional: `q, group, cat, brand, type, material, color` (comma lists), `min, max, inStock=1, rating, tag, sort, page, limit`; then also returns `page, pages, facets` |
| GET | /api/products/:id | One product (slug or SKU) |
| GET, POST | /api/products/:id/reviews | Reviews; posting updates the rating |
| GET, POST | /api/products/:id/questions | Questions and answers |
| GET | /api/categories | Groups with their sub-categories |
| GET | /api/brands | Brands |
| GET | /api/banners | Home banners `{ hero, side }` (scheduled ones only when live) |
| GET | /api/settings | Free delivery limit, delivery charge, COD limit, GST, return days, top bar text |
| GET | /api/delivery/:pincode | Delivery estimate (blocked pincodes return `ok: false`) |
| GET | /api/coupons | Active coupons |
| POST | /api/coupons/apply | Check a coupon `{ code, subtotal }` |
| POST | /api/enquiries | Contact form or bulk quote (emails the admin) |
| POST | /api/newsletter | Subscribe `{ email }` |

### Account

| Method | Path | What |
|---|---|---|
| POST | /api/auth/signup, /api/auth/login | Returns `{ token, user }` |
| POST | /api/auth/forgot-password | Emails a reset link to `WEBSITE_URL/reset-password?token=...` |
| POST | /api/auth/reset-password | `{ token, password }`, link valid 30 minutes, single use |
| GET, PUT | /api/me | Profile |
| POST | /api/me/password | `{ currentPassword, newPassword }` |
| GET, POST | /api/me/addresses | Saved addresses (up to 10, one default) |
| PATCH, DELETE | /api/me/addresses/:addressId | Edit or remove an address |
| GET, PUT | /api/me/cart | Saved cart and wishlist |

### Orders and payments

| Method | Path | What |
|---|---|---|
| POST | /api/orders | Place order; server recalculates prices, coupon, delivery and stock |
| POST | /api/orders/:id/verify-payment | Confirms a Razorpay payment (signature checked) |
| POST | /api/payments/razorpay/webhook | Razorpay webhook: `payment.captured`, `order.paid`, `refund.processed` |
| GET | /api/orders/mine | My orders |
| GET | /api/orders/track?id=&mobile= | Track an order |
| GET | /api/orders/:id | One order |
| GET | /api/orders/:id/invoice | Printable GST invoice (HTML, CGST/SGST or IGST) |
| POST | /api/orders/:id/cancel | Cancel before shipping; stock returned, online payment refunded |
| POST | /api/orders/:id/return | Return request after delivery, within the return window |

### Admin (role `admin`)

| Method | Path | What |
|---|---|---|
| GET | /api/admin/dashboard | Revenue, orders, status counts, last 30 days, low stock, recent orders |
| GET, PUT | /api/admin/settings | `maxWebsiteProducts`, delivery rules, COD limit, GST, return days, blocked pincodes, top bar text |
| GET, POST | /api/admin/products | All products (filters: `q`, `visible`, `group`), create |
| PATCH, DELETE | /api/admin/products/:id | Edit (incl. `showOnWebsite`, `websiteOrder`), soft delete |
| PATCH | /api/admin/products-visibility | Show or hide many `{ ids, showOnWebsite }` |
| POST | /api/admin/products/import | Upsert up to 2000 products by SKU; new ones stay hidden until allowed |
| POST | /api/admin/uploads | Multipart `files` (JPG, PNG, WEBP, MP4, 5 MB each); returns URLs |
| GET, POST, PATCH, DELETE | /api/admin/categories, /api/admin/brands, /api/admin/banners | Store content |
| GET | /api/admin/orders | Orders (`?status=`) |
| PATCH | /api/admin/orders/:id/status | confirmed, shipped, out_for_delivery, delivered, cancelled (emails the customer) |
| POST | /api/admin/orders/:id/refund | Refund through Razorpay, or record a manual / COD refund |
| GET | /api/admin/returns | Return requests |
| PATCH | /api/admin/returns/:id | approved, rejected, received (stock back), refunded |
| GET, PATCH | /api/admin/users | Customers; block or make admin |
| GET, POST, PATCH, DELETE | /api/admin/coupons | Manage coupons |
| GET, PATCH | /api/admin/enquiries | Enquiries and their status |
| GET | /api/admin/subscribers | Newsletter list |
| GET, PATCH, DELETE | /api/admin/reviews | Moderate reviews |
| GET, PATCH, DELETE | /api/admin/questions | Answer or remove questions |
| GET | /api/admin/logs/api | Every API call: `method, status, errors=1, path, userId, requestId, from, to, page, limit` |
| GET | /api/admin/logs/events | Business events: `name` (or prefix like `order.`), `entityType, entityId, actorId, actorType, requestId, from, to` |
| GET | /api/admin/logs/summary | Event counts, API status counts and slowest routes (default last 7 days) |
| GET | /api/admin/logs/timeline/:type/:id | Full history of one order, product, user, coupon... |

## Events and logs

The backend is event based. Routes do their work and then `emit()` a business event
(`src/events.js`); everything that should happen because of it lives in `src/subscribers.js`:

```
route ──emit('order.placed')──▶ event bus ──▶ save to EventLog
                                         ├──▶ email the customer
                                         └──▶ email the admin   (add SMS, WhatsApp, analytics here)
```

- **Event log** (`EventLog` collection): one document per event with who did it (guest, customer, admin or
  system), what it was about (`entity`, e.g. order GB12345678), details, and `before`/`after` values for
  admin edits. The full list of event names is `EVENTS` in `src/events.js` and is returned by
  `/api/admin/logs/summary`.
- **API log** (`ApiLog` collection): one document per API call with method, path, route pattern, status,
  time taken, IP, user, query and (for writes) the request body.
- Every response has an `X-Request-Id` header. The same id is on the API log and on every event that
  request caused, so one id shows the whole story. Send your own `X-Request-Id` to trace a call end to end.
- Passwords, tokens, signatures and similar fields are replaced with `[redacted]` before anything is stored.
- MongoDB deletes old logs automatically: API logs after `API_LOG_DAYS` (90), events after
  `EVENT_LOG_DAYS` (365).
- Logging and event handlers never slow down or break a response. On shutdown the server waits for
  them to finish.

## Email

Order placed, order status changes, return updates and password reset emails go to customers; new orders and
enquiries go to `ADMIN_NOTIFY_EMAIL`. Set `SMTP_*` in `.env`; without `SMTP_HOST` the emails are printed
in the server console instead. A failed email never blocks an order.

## Payments

With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set, online orders create a Razorpay order and the
website opens Razorpay Checkout; the payment is accepted only after the signature check. Without keys,
online payment runs in test mode in development and is refused in production.
Add a webhook in the Razorpay dashboard pointing to `/api/payments/razorpay/webhook` with `RAZORPAY_WEBHOOK_SECRET`,
so payments are confirmed even if the customer closes the browser. Cancelled or returned paid orders are
refunded through Razorpay automatically.
