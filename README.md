# Travel Fee Estimator

A production-ready web app that lets customers estimate the travel fee for a service at
their address — **without ever revealing the business's originating address**.

The customer enters only their destination. The server holds the origin, asks Google for
the driving distance, applies your pricing rules, and returns three numbers plus an
explanation. No map, no route, no coordinates, no API key ever reaches the browser.

---

## Table of contents

- [How privacy is enforced](#how-privacy-is-enforced)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Google Cloud setup](#google-cloud-setup)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Travel fee calculation](#travel-fee-calculation)
- [Admin dashboard](#admin-dashboard)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Extending the app](#extending-the-app)

---

## How privacy is enforced

The origin address is protected by four independent layers, not just by convention:

1. **It lives in the database, never in client code.** It is read only inside
   `src/server/services/estimate-service.ts`, which runs on the server.
2. **The public settings type physically cannot carry it.** `PublicSettings`
   (`src/lib/settings.ts`) has no `originAddress` field, so any attempt to pass the origin
   to a client component is a TypeScript error.
3. **The API contract omits it.** `/api/estimate` returns only distance, drive time, fee,
   and the explanation note (`src/types/estimate.ts`).
4. **Upstream errors are never echoed.** Google's error text can quote the addresses it
   was given, so `src/lib/api-response.ts` logs raw errors server-side and returns
   pre-written, customer-safe messages instead.

The same applies to the Google API key: autocomplete is proxied through
`/api/places/*` rather than using the Maps JavaScript SDK, so the key stays server-side.
**No map component exists anywhere in the app** — Google is used purely as a routing
engine.

## Features

**Customer**

- Single-field Google Places autocomplete that fills street, city, state and ZIP
- Manual entry fallback for addresses Google doesn't recognise
- Estimate card: driving distance, drive time, travel fee
- Editable "Why is there a travel fee?" note
- Friendly out-of-service-area message with no fee calculated
- Mobile-first, accessible (keyboard-navigable combobox, ARIA live regions,
  reduced-motion support), no customer account required

**Administrator**

- Password-protected dashboard at `/admin`
- Edit origin address, price per mile, minimum fee, maximum radius
- Edit the fee explanation and the out-of-area message
- Toggle whether the per-mile rate is shown to customers
- Branding: company name, logo, primary colour, contact phone and email

**No estimate records are kept.** Estimates are calculated in the moment and returned;
nothing about a customer's destination is written to the database.

## Tech stack

| Layer      | Choice                                               |
| ---------- | ---------------------------------------------------- |
| Framework  | Next.js 15 (App Router), React 19, TypeScript        |
| Styling    | Tailwind CSS, shadcn/ui-style components, Radix UI   |
| Forms      | React Hook Form + Zod (same schemas client & server) |
| Backend    | Next.js Route Handlers + Server Actions              |
| Database   | Prisma ORM — SQLite (dev), PostgreSQL (prod)         |
| Auth       | Auth.js (NextAuth v5), JWT sessions, bcrypt          |
| Maps       | Google Routes API + Places API (New), server-side    |
| Tests      | Vitest                                               |
| Deployment | Vercel                                               |

## Quick start

Requires Node.js 20+.

```bash
git clone <your-repo-url>
cd fareestimator
npm install

cp .env.example .env
# Fill in AUTH_SECRET and GOOGLE_MAPS_API_KEY, then set SEED_ORIGIN_ADDRESS.
# Generate a secret with: openssl rand -base64 32

npm run setup     # prisma generate + db push + seed
npm run dev
```

Open <http://localhost:3000>. The admin dashboard is at
<http://localhost:3000/admin> — sign in with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` and change the password immediately.

### Useful scripts

| Command                          | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `npm run dev`                    | Development server                        |
| `npm run build` / `npm start`    | Production build and server               |
| `npm test`                       | Unit tests (fee calculation)              |
| `npm run typecheck`              | TypeScript, no emit                       |
| `npm run lint` / `format`        | ESLint / Prettier                         |
| `npm run db:migrate`             | Create and apply a migration              |
| `npm run db:seed`                | Seed admin user and settings (idempotent) |
| `npm run db:studio`              | Browse the database                       |
| `npm run db:provider postgresql` | Switch the Prisma datasource for prod     |

## Google Cloud setup

1. Create a project at <https://console.cloud.google.com/> and enable billing
   (Google's free monthly credit covers typical estimator traffic).
2. Enable these APIs:
   - **Routes API** — driving distance and duration
   - **Places API (New)** — address autocomplete
3. Create an **API key** under _APIs & Services → Credentials_.
4. Restrict it: _Application restrictions_ → **None** or **IP addresses** (this is a
   server key, never a browser key), and _API restrictions_ → the two APIs above.
5. Put the key in `GOOGLE_MAPS_API_KEY`.

> Do **not** create an HTTP-referrer-restricted browser key. The key is only ever used
> from the server, and referrer restrictions would break it.

Cost control built in: a narrow field mask on every request, `TRAFFIC_UNAWARE` routing
(the cheaper SKU), Places session tokens, in-memory caching of repeat lookups, and
per-IP rate limiting.

## Environment variables

All variables are **server-only** — none are prefixed `NEXT_PUBLIC_`. See
[`.env.example`](./.env.example) for the annotated list.

| Variable                                        | Required | Notes                              |
| ----------------------------------------------- | -------- | ---------------------------------- |
| `DATABASE_URL`                                  | yes      | SQLite file or Postgres URL        |
| `DATABASE_PROVIDER`                             | yes      | `sqlite` or `postgresql`           |
| `AUTH_SECRET`                                   | yes      | `openssl rand -base64 32`          |
| `GOOGLE_MAPS_API_KEY`                           | yes      | Server key, Routes + Places        |
| `NEXTAUTH_URL`, `AUTH_TRUST_HOST`               | prod     | Set automatically on Vercel        |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`       | seed     | First administrator                |
| `SEED_ORIGIN_ADDRESS`                           | seed     | Business address (private)         |
| `SEED_PRICE_PER_MILE`, `SEED_MINIMUM_FEE`       | seed     | Defaults: `0.80`, `30.00`          |
| `SEED_MAX_RADIUS_MILES`                         | seed     | Default `100`                      |
| `RATE_LIMIT_MAX_REQUESTS`, `..._WINDOW_SECONDS` | no       | Defaults: 15 requests / 60 seconds |

Missing or malformed variables fail fast with a readable message (`src/lib/env.ts`).

## Project structure

```
src/
├── app/
│   ├── page.tsx                     # Customer landing page (server-rendered)
│   ├── layout.tsx, error.tsx, loading.tsx, not-found.tsx
│   ├── admin/                       # Protected dashboard
│   │   ├── layout.tsx, page.tsx     # Shell + overview
│   │   ├── login/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── estimate/route.ts        # POST — the only pricing endpoint
│       ├── places/autocomplete/     # GET  — Places proxy (hides the API key)
│       ├── places/details/          # GET  — place id → address components
│       └── auth/[...nextauth]/
├── components/
│   ├── ui/                          # Reusable primitives (button, input, card…)
│   ├── estimate/                    # Form, autocomplete, result card
│   └── admin/                       # Nav, login form, settings form
├── lib/
│   ├── fee.ts                       # Pure fee calculation (unit tested)
│   ├── settings.ts                  # Settings + PublicSettings projection
│   ├── validation.ts                # Shared Zod schemas
│   ├── google/{routes,places,errors}.ts
│   ├── rate-limit.ts, cache.ts, env.ts, api-response.ts, utils.ts
├── server/
│   ├── services/estimate-service.ts # Orchestration
│   └── actions/                     # Server Actions (auth, settings)
├── auth.ts, auth.config.ts, middleware.ts
└── types/
prisma/
├── schema.prisma, migrations/, seed.ts
```

## Travel fee calculation

```
travel fee = driving distance (miles) × price per mile
             then floored at the minimum travel fee
```

- **Driving distance only** — real road distance from the Routes API, never straight-line.
- **Miles**, rounded to one decimal for display.
- **Fee rounded to two decimals**, with `Number.EPSILON` correction so values like
  `1.005` round the way a human expects.
- **Minimum travel fee** — every customer pays at least this amount. Default **$30.00**:
  a 12-mile trip at $0.80/mile computes to $9.60 and is charged at $30.00.
- **Maximum service radius** — beyond it, no fee is calculated at all and the customer
  sees your out-of-area message. Set to `0` for no limit.

The logic lives in `src/lib/fee.ts`: pure functions with no database, network or
framework imports, covered by 23 unit tests.

## Admin dashboard

`/admin` — protected by Auth.js. Authorisation is checked in three places:

- Edge middleware redirects unauthenticated visitors to `/admin/login`
- Every admin page calls `requireAdmin()`
- Every Server Action re-checks the session before mutating anything

Server Actions are public HTTP endpoints, so middleware alone is not treated as
sufficient.

### Changing the admin password

The seed script creates the first admin. To rotate the password:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-new-password', 12))"
npm run db:studio   # paste the hash into AdminUser.passwordHash
```

To add another administrator, insert a row in `AdminUser` the same way.

## Security

- Origin address and API key are server-side only, enforced by types (see above)
- All pricing is calculated on the server; the client submits an address and nothing else
- Every input validated and sanitised with Zod, on the server, on every request
- Rate limiting per IP: 15 estimates/min, 60 autocomplete/min, 5 logins per 5 minutes
- Passwords hashed with bcrypt (12 rounds); unknown emails still run a comparison so
  response timing cannot enumerate accounts
- JWT sessions, 8-hour expiry, HTTP-only cookies
- Security headers set in `next.config.ts` (HSTS, `X-Frame-Options: DENY`, `nosniff`,
  strict referrer policy, restrictive permissions policy); `X-Powered-By` removed
- Request bodies capped; upstream error text never forwarded to the browser
- **No customer data is stored** — no accounts, no estimate history, no IP logging

> The rate limiter is in-memory and therefore per-instance. That is the right trade-off
> for a single-region Vercel deployment. For multi-region, swap `rateLimit()` in
> `src/lib/rate-limit.ts` for Upstash Redis — no call site changes.

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

23 tests cover the fee engine: per-mile multiplication, two-decimal rounding (including
the `1.005` floating-point case), the $30 minimum floor, radius boundaries (inclusive),
"no limit" mode, meters→miles conversion, duration formatting, and rejection of invalid
inputs so a bad configuration throws rather than quietly producing a wrong price.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full Vercel + PostgreSQL walkthrough.

## Extending the app

The code is organised so these can be added without rewriting existing pieces:

- **Online booking / scheduling / quotes** — add routes under `src/app/` and services
  under `src/server/services/`; `createEstimate()` already returns a reusable result.
- **Payments** — the fee calculation is pure and framework-free; call it from a checkout
  service.
- **Email / SMS estimates** — add a notification service and call it from the estimate
  route. Note this would introduce customer PII, which the app deliberately avoids today.
- **Multiple office locations** — `Settings.originAddress` becomes a `Location` table;
  `createEstimate()` picks the nearest origin. Only that one function changes.
- **Dynamic or seasonal pricing** — `calculateTravelFee()` takes a `PricingRules` object,
  so resolving rules per date or zone is an added input, not a rewrite.

## Licence

Provided as-is for the commissioning business to use and modify.
