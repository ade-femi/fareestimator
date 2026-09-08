# Deployment guide (Vercel + PostgreSQL)

End-to-end setup for a production deployment. No local Node.js or command line required
— every step below is a web form. Budget about 20 minutes.

Everything stays within free tiers except Google Maps, which requires a billing account
but includes a monthly credit that covers typical estimator traffic.

The repository already targets PostgreSQL and applies its own database migrations and
seed data automatically as part of `npm run build` — the command Vercel runs on every
deploy. There is nothing to run locally and no separate migration step: create the
database, set the environment variables below, and deploy.

---

## 1. Create a PostgreSQL database

Either provider works; both have a free tier. Do this first so you have a `DATABASE_URL`
ready for step 3.

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

## 2. Get a Google Maps API key

1. <https://console.cloud.google.com/> → create a project → enable billing.
2. Enable **Routes API** and **Places API (New)**.
3. _APIs & Services → Credentials → Create credentials → API key_.
4. Restrict the key:
   - _Application restrictions_: **None**, or **IP addresses** if you use a static egress
     IP. This is a server key — do **not** use HTTP referrer restrictions.
   - _API restrictions_: **Routes API** and **Places API (New)** only.
5. Optional but recommended: set a quota cap and a budget alert under
   _APIs & Services → Quotas_ and _Billing → Budgets_.

## 3. Deploy to Vercel

**Deploy button** (fastest — no local setup):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fade-femi%2Ffareestimator&env=DATABASE_URL,DATABASE_PROVIDER,AUTH_SECRET,AUTH_TRUST_HOST,GOOGLE_MAPS_API_KEY,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD,SEED_ORIGIN_ADDRESS,SEED_PRICE_PER_MILE,SEED_MINIMUM_FEE,SEED_MAX_RADIUS_MILES,ALLOWED_EMBED_ORIGINS&envDescription=See%20.env.example%20in%20the%20repo%20for%20what%20each%20value%20means&envLink=https%3A%2F%2Fgithub.com%2Fade-femi%2Ffareestimator%2Fblob%2Fmain%2F.env.example&project-name=fareestimator&repository-name=fareestimator)

Clicking it walks you through signing into Vercel (GitHub login works), importing this
repository, and a form for the environment variables below. Fill it in and click Deploy
— that's the entire process, no terminal needed.

Alternatively, import manually at <https://vercel.com/new> (Framework preset: Next.js,
detected automatically) or via the CLI (`npm i -g vercel && vercel`).

## 4. Configure environment variables

If you didn't use the deploy button, or need to change a value later: Vercel →
_Project → Settings → Environment Variables_. Add each of these for **Production**
(and Preview, if you use preview deployments):

| Variable                | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| `DATABASE_URL`          | Pooled PostgreSQL connection string from step 1          |
| `DATABASE_PROVIDER`     | `postgresql`                                             |
| `AUTH_SECRET`           | `openssl rand -base64 32`, or any long random string     |
| `AUTH_TRUST_HOST`       | `true`                                                   |
| `GOOGLE_MAPS_API_KEY`   | Your server key from step 2                              |
| `SEED_ADMIN_EMAIL`      | Your admin email                                         |
| `SEED_ADMIN_PASSWORD`   | A strong password (change after first sign-in)           |
| `SEED_ORIGIN_ADDRESS`   | Your business address                                    |
| `SEED_PRICE_PER_MILE`   | e.g. `3.00`                                              |
| `SEED_MINIMUM_FEE`      | e.g. `30.00`                                             |
| `SEED_MAX_RADIUS_MILES` | e.g. `100`                                               |
| `ALLOWED_EMBED_ORIGINS` | Sites allowed to embed this page, e.g. your main website |

`NEXTAUTH_URL` is not needed on Vercel — `AUTH_TRUST_HOST=true` handles it.

The `SEED_*` values are only used once, to create the initial database rows. Once the
app is live, everything is edited in the admin dashboard, and the `SEED_*` variables can
be removed.

**No separate migration or seed step is needed.** `npm run build` — the command Vercel
already runs — applies pending database migrations and seeds the admin user and default
settings automatically, and does nothing on later deploys once that's done (both steps
are safe to re-run).

## 5. First sign-in

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

## 6. Verify before announcing

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
- [ ] If embedding it elsewhere, confirm the iframe actually renders on that page (not
      blank) — that means the embedding site's origin is in `ALLOWED_EMBED_ORIGINS`

## 7. Custom domain

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

| Symptom                                      | Cause and fix                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "The estimator is not fully configured yet"  | Invalid API key, or Routes API not enabled. Check the key restrictions and enabled APIs.                   |
| Autocomplete returns nothing                 | Places API (New) not enabled — it is a separate API from the legacy Places API.                            |
| "We couldn't find that address"              | Google could not geocode it. Confirm the address; the four fields can be typed manually.                   |
| Sign-in redirects back to the login page     | `AUTH_SECRET` missing or changed, or `AUTH_TRUST_HOST` not set to `true`.                                  |
| `Can't reach database server`                | Use the **pooled** connection string, and confirm `sslmode=require`.                                       |
| Build fails during `prisma migrate deploy`   | `DATABASE_URL` is wrong or unreachable from Vercel — re-check it and redeploy.                             |
| Embedded iframe shows blank on your own site | Add that site's exact origin (scheme + domain, no trailing slash) to `ALLOWED_EMBED_ORIGINS` and redeploy. |

### Rotating the Google API key

Create the new key, update `GOOGLE_MAPS_API_KEY` in Vercel, redeploy, then delete the old
key in Google Cloud. No code change is required.

### Local development

The committed schema targets PostgreSQL (matching production). To develop locally you
need a Postgres instance — a local install, Docker, or a free Neon/Supabase project —
rather than the zero-setup SQLite flow from earlier versions of this repo. Point
`DATABASE_URL` at it in `.env` and run `npm run setup`.

### Scaling beyond one region

The rate limiter and caches are in-memory and therefore per-instance. If you deploy to
multiple regions or hit high traffic, replace the body of `rateLimit()` in
`src/lib/rate-limit.ts` with an Upstash Redis `INCR` + `EXPIRE`. Call sites do not change.
