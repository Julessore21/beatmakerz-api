# Beatmakerz API

NestJS + Prisma backend for the Beatmakerz marketplace. It manages authentication, catalog, carts, checkout, Stripe webhooks, secure media storage on S3/R2, transactional emails, and license PDF generation.

## Stack
- NestJS 11 (REST modules: auth, users, artists, beats, admin, files, cart, checkout, orders, webhooks)
- Prisma ORM + PostgreSQL (UUID everywhere, migrations + seed data)
- Stripe Checkout with webhook idempotency and order fulfillment
- Cloudflare R2 / AWS S3 compatible storage with presigned URLs
- Resend transactional email delivery
- PDFKit license document generation
- Pino structured logging, Nest throttling, Helmet, JWT access/refresh tokens

## Project Structure
```
src/
  auth/         # JWT auth, refresh rotation, guards, DTOs
  users/
  artists/
  beats/
  admin/
  files/
  cart/
  orders/
  checkout/
  webhooks/
  emails/
  documents/
  payments/
  common/       # decorators, guards, util helpers
  prisma/       # global Prisma service
prisma/
  schema.prisma
  seed.ts
  migrations.sql  # SQL for initial schema
```

## Getting Started
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy environment variables
   ```bash
   cp .env.example .env
   ```
   Fill in PostgreSQL, Stripe, Storage, Resend and JWT secrets.
3. Generate Prisma client & run migrations
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:dev
   ```
4. Seed the database (creates 3 artists, 12 beats, 3 license types, sample order)
   ```bash
   npm run prisma:seed
   ```
5. Start the API
   ```bash
   npm run start:dev
   ```
6. Access Swagger docs at `http://localhost:3000/docs` (JWT bearer auth supported).

## Key Features
- **Auth**: register/login/logout/refresh with access (15 min) + httpOnly refresh (30 days). Argon2 passwords, throttle on sensitive endpoints.
- **Catalog**: search beats by query/genre/BPM, get beat detail with preview asset, artist profiles with published beats.
- **Admin/Seller**: create/update beats, request presigned asset uploads, role-based guards.
- **Cart & Checkout**: user cart with price snapshots, Stripe Checkout session creation, pending order pre-build.
- **Webhooks**: raw Stripe webhook ingestion with idempotent persistence. Checkout completion creates paid orders, download grants, clears cart, sends emails, and prepares license PDFs.
- **Files**: presigned PUT/GET URLs against S3-compatible storage with anti-hotlink (short lived download grants).
- **Orders & Downloads**: customer endpoints for order history and per-item download link regeneration.
- **Emails**: Resend integration for order confirmation and download emails (logged when API key missing).
- **Documents**: PDFKit service to generate license certificates per purchase.
- **Security**: Helmet, CORS whitelist from `FRONTEND_URL`, Nest throttler, role guard, Pino logging.

## Available Scripts
- `npm run start:dev` ? start API with watch mode
- `npm run build` ? compile TypeScript
- `npm run lint` ? ESLint + Prettier
- `npm run test` / `npm run test:e2e` ? unit / e2e scaffolding
- `npm run prisma:generate` ? regenerate Prisma client
- `npm run prisma:migrate:dev` ? run migrations locally
- `npm run prisma:migrate:deploy` ? run migrations in CI/prod
- `npm run prisma:seed` ? execute TypeScript seed
- `npm run db:reset` ? reset database and reseed

## Stripe & Webhooks
- `POST /checkout/session` issues a Checkout session with line items derived from the user cart. Metadata carries the order ID for webhook reconciliation.
- `POST /webhooks/stripe` expects the raw body + `Stripe-Signature` header. Events are logged in `WebhookEvent` for idempotency. Supported events: `checkout.session.completed`, `payment_intent.*`, `charge.refunded`, `customer.subscription.*`.

## Storage & Media
- Asset keys follow `beats/{beatId}/{type}/{filename}` (preview/mp3/wav/stems/project).
- Presigned URLs expire quickly: uploads default 15 minutes, downloads 5 minutes via download grants.
- Buckets should be private with strict CORS (documented in `FilesModule`).

## Testing & CI
- Jest config is ready for unit/e2e specs (Supertest + Prisma test DB).
- GitHub Actions workflow (`.github/workflows/ci.yml`) installs deps, runs lint, tests, build. Tagging with `*-rc` can be extended to deploy.

## Health & Observability
- `GET /health` checks database connectivity and Stripe configuration.
- Pino logger output (pretty in dev) integrates with Nest request lifecycle.

## Environment
All required variables are documented in `.env.example`:
- Database: `DATABASE_URL`
- Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Stripe: `STRIPE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Storage: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
- Email: `EMAIL_API_KEY`
- Frontend origin: `FRONTEND_URL`
- Optional: `PORT`

## Next Steps
- Configure infrastructure (PostgreSQL, S3/R2 bucket, Resend domain, Stripe Tax if needed).
- Hook CI deploy to staging on release candidate tags.
- Expand unit/e2e test coverage (target ?80%).
