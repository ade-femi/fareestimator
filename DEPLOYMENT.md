# Deployment guide (Vercel + PostgreSQL)

End-to-end setup for a production deployment. Budget about 30 minutes.

Everything below stays within free tiers except Google Maps, which requires a billing
account but includes a monthly credit that covers typical estimator traffic.

---

## 1. Create a PostgreSQL database

Either provider works; both have a free tier.

**Neon** (<https://neon.tech>) — create a project, copy the **pooled** connection string.

**Supabase** (<https://supabase.com>) — create a project, then _Project Settings →
Database → Connection string → URI_. Use the **connection pooler** string (port `6543`)
for the app.

Your `DATABASE_URL` will look like:

```
postgresql://user:password@host:6543/dbname?sslmode=require&pgbouncer=true
```

> Serverless functions open many short-lived connections. Always use the pooled
> connection string, or you will exhaust the connection limit under load.

## 2. Point Prisma at PostgreSQL

Locally, in your clone:

```bash
npm run db:provider postgresql
```

This rewrites the datasource provider in `prisma/schema.prisma`. Then, with
`DATABASE_URL` in `.env` set to the Postgres URL:

```bash
npx prisma migrate dev --name init
```

This generates the PostgreSQL migration under `prisma/migrations/`. Commit both the
schema change and the migration:

```bash
git add prisma/
git commit -m "Target PostgreSQL for production"
```

> The repository ships with SQLite migrations for zero-setup local development. The
> committed migration history must match the provider you deploy with — generate the
> Postgres migration once, as above, and commit it.

## 3. Get a Google Maps API key

1. <https://console.cloud.google.com/> → create a project → enable billing.
2. Enable **Routes API** and **Places API (New)**.
3. _APIs & Services → Credentials → Create credentials → API key_.
4. Restrict the key:
   - _Application restrictions_: **None**, or **IP addresses** if you use a static egress
     IP. This is a server key — do **not** use HTTP referrer restrictions.
   - _API restrictions_: **Routes API** and **Places API (New)** only.
5. Optional but recommended: set a quota cap and a budget alert under
   _APIs & Services → Quotas_ and _Billing → Budgets_.

## 4. Deploy to Vercel

```bash
npm i -g vercel
vercel        # link the project
```

Or import the Git repository at <https://vercel.com/new>. Framework preset: **Next.js**.
Build command and output are detected automatically — `npm run build` already runs
`prisma generate`.

## 5. Configure environment variables

In Vercel: _Project → Settings → Environment Variables_. Add each of these for
**Production** (and Preview, if you use preview deployments):

| Variable                | Value                                          |
| ----------------------- | ---------------------------------------------- |
| `DATABASE_URL`          | Pooled PostgreSQL connection string            |
| `DATABASE_PROVIDER`     | `postgresql`                                   |
| `AUTH_SECRET`           | `openssl rand -base64 32`                      |
| `AUTH_TRUST_HOST`       | `true`                                         |
| `GOOGLE_MAPS_API_KEY`   | Your server key from step 3                    |
| `SEED_ADMIN_EMAIL`      | Your admin email                               |
| `SEED_ADMIN_PASSWORD`   | A strong password (change after first sign-in) |
| `SEED_ORIGIN_ADDRESS`   | Your business address                          |
| `SEED_PRICE_PER_MILE`   | e.g. `3.00`                                    |
| `SEED_MINIMUM_FEE`      | e.g. `30.00`                                   |
| `SEED_MAX_RADIUS_MILES` | e.g. `100`                                     |

`NEXTAUTH_URL` is not needed on Vercel — `AUTH_TRUST_HOST=true` handles it.

The `SEED_*` values are only used to create the initial rows. Once the app is live,
everything is edited in the admin dashboard.

## 6. Apply migrations and seed

From your machine, with the production `DATABASE_URL` exported:

```bash
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
npm run db:seed
```

`db:seed` is idempotent — it never overwrites an existing admin or settings row.

If you prefer migrations to run on every deploy, change the build command in Vercel to:

```
prisma generate && prisma migrate deploy && next build
```

## 7. First sign-in

1. Visit `https://your-domain.vercel.app/admin/login`.
2. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Go to **Settings** and confirm:
   - Origin address is correct (it is never shown to customers)
   - Price per mile, minimum fee, maximum radius
   - Fee explanation and out-of-area message
   - Branding and contact details
4. **Change the admin password immediately** — see
   [Changing the admin password](./README.md#changing-the-admin-password).
5. Remove `SEED_ADMIN_PASSWORD` from Vercel once the password has been rotated.

## 8. Verify before announcing

Run through this checklist on the live URL:

- [ ] Autocomplete suggests addresses as you type
- [ ] Selecting a suggestion fills street, city, state and ZIP
- [ ] An in-area address returns distance, drive time and a fee
- [ ] A trip shorter than the minimum charges the minimum (default $30)
- [ ] An address beyond the radius shows the out-of-area message and **no fee**
- [ ] **View source on the estimate page — the origin address appears nowhere**
- [ ] **Open DevTools → Network — no Google API key appears in any request**
- [ ] `/admin` redirects to the login page when signed out
- [ ] The page is usable on a phone
- [ ] HTTPS is active (Vercel does this automatically)

## 9. Custom domain

_Project → Settings → Domains_ → add your domain and follow the DNS instructions.
TLS certificates are provisioned automatically. No environment changes are needed.

---

## Operations

### Costs

| Service         | Free tier      | Notes                                  |
| --------------- | -------------- | -------------------------------------- |
| Vercel          | Hobby: free    | Enough for a small business estimator  |
| Neon / Supabase | Free tier      | This app stores only settings + admins |
| Google Maps     | Monthly credit | Requires billing enabled               |

The app minimises Google spend with narrow field masks, `TRAFFIC_UNAWARE` routing,
Places session tokens, in-memory caching of repeat lookups, and per-IP rate limiting.

### Monitoring

- Vercel _Deployments → Runtime Logs_ for server errors. Google failures are logged with
  a `[api/estimate]` prefix and a specific code (`CONFIGURATION`, `RATE_LIMITED`,
  `ADDRESS_NOT_FOUND`, …).
- Google Cloud _APIs & Services → Metrics_ for request volume and errors.

### Troubleshooting

| Symptom                                     | Cause and fix                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "The estimator is not fully configured yet" | Invalid API key, or Routes API not enabled. Check the key restrictions and enabled APIs.                  |
| Autocomplete returns nothing                | Places API (New) not enabled — it is a separate API from the legacy Places API.                           |
| "We couldn't find that address"             | Google could not geocode it. Confirm the address; the four fields can be typed manually.                  |
| Sign-in redirects back to the login page    | `AUTH_SECRET` missing or changed, or `AUTH_TRUST_HOST` not set to `true`.                                 |
| `Can't reach database server`               | Use the **pooled** connection string, and confirm `sslmode=require`.                                      |
| Prisma provider mismatch at build           | `DATABASE_PROVIDER` and `prisma/schema.prisma` disagree. Run `npm run db:provider postgresql` and commit. |

### Rotating the Google API key

Create the new key, update `GOOGLE_MAPS_API_KEY` in Vercel, redeploy, then delete the old
key in Google Cloud. No code change is required.

### Scaling beyond one region

The rate limiter and caches are in-memory and therefore per-instance. If you deploy to
multiple regions or hit high traffic, replace the body of `rateLimit()` in
`src/lib/rate-limit.ts` with an Upstash Redis `INCR` + `EXPIRE`. Call sites do not change.
