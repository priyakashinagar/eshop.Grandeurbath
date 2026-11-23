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

No MongoDB yet? `npm run dev:memory` starts a temporary in-memory database with the dummy data
(admin: `admin@grandeurbath.local` / `admin12345`). Everything is lost when it stops.

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
Send `Authorization: Bearer <token>` for logged-in routes.

| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/products | public | Products allowed on the website |
| GET | /api/products/:id | public | One product (slug or SKU) |
| GET, POST | /api/products/:id/reviews | public | Reviews; posting updates the rating |
| GET, POST | /api/products/:id/questions | public | Questions and answers |
| GET | /api/delivery/:pincode | public | Delivery estimate |
| GET | /api/coupons | public | Active coupons |
| POST | /api/coupons/apply | public | Check a coupon `{ code, subtotal }` |
| POST | /api/enquiries | public | Contact form or bulk quote |
| POST | /api/newsletter | public | Subscribe `{ email }` |
| POST | /api/auth/signup, /api/auth/login | public | Returns `{ token, user }` |
| GET, PUT | /api/me | customer | Profile |
| GET, PUT | /api/me/cart | customer | Saved cart and wishlist |
| POST | /api/orders | guest or customer | Place order; server recalculates prices, coupon and stock |
| POST | /api/orders/:id/verify-payment | public | Confirms Razorpay payment (signature checked) |
| GET | /api/orders/mine | customer | My orders |
| GET | /api/orders/track?id=&mobile= | public | Track an order |
| GET | /api/orders/:id | owner | One order (guests add `?mobile=`) |
| POST | /api/orders/:id/cancel | owner | Cancel before shipping; stock is returned |
| GET, PUT | /api/admin/settings | admin | `maxWebsiteProducts` and counts |
| GET, POST | /api/admin/products | admin | All products (filters: `q`, `visible`, `group`), create |
| PATCH, DELETE | /api/admin/products/:id | admin | Edit (incl. `showOnWebsite`, `websiteOrder`), soft delete |
| PATCH | /api/admin/products-visibility | admin | Show or hide many `{ ids, showOnWebsite }` |
| GET | /api/admin/orders | admin | Orders (`?status=`) |
| PATCH | /api/admin/orders/:id/status | admin | confirmed, shipped, out_for_delivery, delivered, cancelled |
| GET, POST, PATCH, DELETE | /api/admin/coupons | admin | Manage coupons |
| GET, PATCH | /api/admin/enquiries | admin | Enquiries and their status |
| GET | /api/admin/subscribers | admin | Newsletter list |
| PATCH | /api/admin/reviews/:id | admin | Approve or hide a review |
| GET, PATCH | /api/admin/questions | admin | Answer customer questions |

## Payments

With `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set, online orders create a Razorpay order and the
website opens Razorpay Checkout; the payment is accepted only after the signature check. Without keys,
online payment runs in test mode in development and is refused in production.
