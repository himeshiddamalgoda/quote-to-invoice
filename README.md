# Quote Flow

Quote Flow manages the commercial journey from customer enquiry to proforma invoice. This repository establishes the application foundation; it does not yet implement the complete business application.

```text
Customer
   ↓
Quotation Draft
   ↓
Submit for Approval
   ↓
Manager Approval
   ↓
Send to Customer
   ↓
Customer Acceptance
   ↓
Proforma Invoice
```

## Implemented scope

- Independently runnable React/Vite client and Express API in npm workspaces.
- Strict TypeScript, ESLint, Prettier, lockfile, and verification scripts.
- Frontend routing with lazy pages, shared layout, accessible login form, API error handling, and TanStack Query.
- Backend environment validation, Helmet, explicit CORS allowlist, request limits, rate limits, request IDs, structured logging, graceful shutdown, and centralized errors.
- Argon2id login, 15-minute JWT access tokens, authenticated identity endpoint, and reusable backend role guards. No public registration or refresh sessions yet.
- MySQL/Prisma domain schema and initial migration, explicit administrator seed, atomic document numbering helper, decimal calculations, and pure workflow guards.
- Unit tests and HTTP infrastructure tests using mocked persistence. Optional real MySQL tests cover login, current role/active checks, concurrent numbering and transaction rollback.

Customers, products, quotation CRUD/actions, approval persistence, and PI generation endpoints are **not implemented**. The UI exposes an overview and login only. The schema and pure rules prepare these modules without pretending the workflow is operational.

## Why root node_modules exists

This repository uses npm workspaces. Running `npm ci` at the root installs dependencies for both apps and shares compatible packages in root `node_modules`. Some packages can also appear in a workspace's own `node_modules` when different versions are needed. Keep these folders locally to run the application. They are generated, ignored by Git, and can be recreated with `npm ci`; do not commit them. The `package-lock.json` should be committed for reproducible installs.

## Architecture and stack

Frontend: React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Zod, Axios. Server state belongs in Query, forms in React Hook Form, and local UI state in React. A small auth context holds the session user; no Redux is needed.

Backend: Node.js, Express 5, TypeScript, MySQL, Prisma 7 with its MySQL-compatible driver adapter, Zod, JWT, Argon2id, Pino, decimal.js.

```text
Route → Middleware → Controller → Service → Repository → Prisma → MySQL
```

Controllers deal with HTTP and validated inputs, services enforce business rules and transaction boundaries, and repositories encapsulate persistence. Auth is the working vertical slice. Pure quotation rules are independent of Express/database setup. No shared package is introduced yet; Prisma owns persisted enums and API contracts will be defined alongside their endpoints.

```text
.
├── client/
│   ├── src/
│   │   ├── api/                 # Axios, error decoding, Query client
│   │   ├── components/          # Generic route error UI
│   │   ├── features/auth/       # API, components, hooks, schemas
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── types/               # API envelope contracts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── .env.example
├── server/
│   ├── src/
│   │   ├── config/              # Validated env, logging, Prisma
│   │   ├── middleware/          # Validation, auth, roles, errors
│   │   ├── modules/
│   │   │   ├── auth/            # Routes → controller → service
│   │   │   ├── users/           # User repository
│   │   │   ├── quotations/      # Workflow, schemas, calculations
│   │   │   └── documents/       # Atomic numbering repository
│   │   ├── types/
│   │   ├── utils/               # Application errors, pagination
│   │   ├── app.ts               # Testable app factory
│   │   └── server.ts            # Listener and lifecycle
│   ├── prisma/                  # Schema, migrations, seed
│   ├── prisma.config.ts
│   ├── tests/
│   └── .env.example
├── docs/architecture.md
├── compose.yaml              # Local MySQL service
├── docker/mysql/init.sql     # Shadow and test schemas
├── .env.example              # Compose variable names
├── package.json
└── package-lock.json
```

Add customers, products, approvals and proforma-invoices feature/module folders when implementing them. Do not create empty placeholders. Generic components belong in `client/src/components`; domain UI belongs in its feature.

## Prerequisites

- Node.js 22.12 or later (use `nvm use` with the provided `.nvmrc`), npm 10 or later.
- Docker with Docker Compose for the included MySQL 8.4 local database, or an existing MySQL 8.4 database.
- A separate database for integration tests. Never run database tests against production.

## Install and configure

```sh
npm ci
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Examples contain variable names with empty values. Set values locally; do not commit `.env` files.

| Variable              | Location            | Configuration                                                                                                          |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`   | client              | Required; local value `http://localhost:3000/api/v1`                                                                   |
| `MYSQL_ROOT_PASSWORD` | root / Compose      | Required local MySQL root password                                                                                     |
| `MYSQL_PASSWORD`      | root / Compose      | Required local `quote_flow` database user password                                                                     |
| `MYSQL_PORT`          | root / Compose      | Optional host port; defaults to 3306                                                                                   |
| `SHADOW_DATABASE_URL` | server / Prisma CLI | Dedicated local shadow database URL ending in `/quote_flow_shadow`; required for `db:migrate` with Compose credentials |
| `DATABASE_URL`        | server              | Required MySQL URL, e.g. `mysql://quote_flow:PASSWORD@localhost:3306/quote_flow`                                       |
| `CORS_ORIGINS`        | server              | Required comma-separated exact origins; local value `http://localhost:5173`                                            |
| `JWT_SECRET`          | server              | Required random secret, at least 32 characters; generate with `openssl rand -hex 32`                                   |
| `NODE_ENV`            | server              | `development`, `test`, or `production`; defaults to development                                                        |
| `PORT`                | server              | Defaults to 3000                                                                                                       |
| `JWT_ISSUER`          | server              | Defaults to `quote-flow`                                                                                               |
| `JWT_AUDIENCE`        | server              | Defaults to `quote-flow-client`                                                                                        |
| `LOG_LEVEL`           | server              | Defaults to `info`                                                                                                     |
| `TEST_DATABASE_URL`   | tests only          | Optional dedicated migrated MySQL database; name must end in `_test`                                                   |
| `SEED_ADMIN_EMAIL`    | seed only           | Required when seeding; choose an administrator email                                                                   |
| `SEED_ADMIN_PASSWORD` | seed only           | Required when seeding; choose a unique password of at least 12 characters                                              |

Remove unused blank optional lines from your local file, or give them valid values: defaults apply to absent variables, not blank strings. Vite values are public; never place secrets in client variables.

## Database setup

The root [compose.yaml](compose.yaml) runs MySQL only. The client and API run through npm on your machine. Choose local `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` values in the root `.env`; `MYSQL_PORT` is optional (defaults to 3306).

Set `DATABASE_URL` in `server/.env` to `mysql://quote_flow:YOUR_ENCODED_PASSWORD@localhost:3306/quote_flow` and `SHADOW_DATABASE_URL` to the same connection with `/quote_flow_shadow`. Use the password from root `MYSQL_PASSWORD`; percent-encode special characters in URL credentials. If you change `MYSQL_PORT`, use that port in all database URLs.

Start the database, then:

```sh
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed provisions one ADMIN with Argon2id password hashing. Running it again does not change existing users or passwords. It reads seed credentials only when explicitly invoked; remove them from the environment after provisioning.

Compose persists data in a named volume and creates `quote_flow`, `quote_flow_shadow`, and `quote_flow_test` on first initialization. The separate shadow database lets Prisma development migrations run without granting the app global database privileges. Initialization scripts and password changes apply only to a fresh volume. `npm run db:down` stops MySQL and preserves data; `npm run db:logs` shows database logs. Only the database is containerized.

The PostgreSQL bootstrap migration was replaced with a MySQL bootstrap migration for this initial foundation. An existing PostgreSQL database is not converted; this setup targets a fresh MySQL database.

Use `npm run db:migrate --workspace server -- --name descriptive_change` for new development migrations. For deployed environments use `npm run db:deploy` to apply committed migrations; do not use `migrate dev` or `db push` in production.

## Run and verify

```sh
npm run dev              # client :5173 and API :3000
npm run dev -w client    # independently run frontend
npm run dev -w server    # independently run backend
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
# Optional real database tests (apply migrations to quote_flow_test first):
DATABASE_URL=mysql://quote_flow:PASSWORD@localhost:3306/quote_flow_test npm run db:deploy
TEST_DATABASE_URL=mysql://quote_flow:PASSWORD@localhost:3306/quote_flow_test npm test
```

Build output: `client/dist` and `server/dist`. Run the compiled API with `npm run start -w server` from the root (loads `server/.env` locally). `npm run preview -w client` serves a local preview; production should serve client assets from a proper static host with SPA fallback. In deployment inject server variables through the runtime environment.

## API conventions

Base path: `/api/v1`.

Implemented endpoints:

| Method | Path            | Purpose                                                    |
| ------ | --------------- | ---------------------------------------------------------- |
| GET    | `/health`       | Process liveness; does not probe the database              |
| GET    | `/health/ready` | Database readiness (503 if unavailable)                    |
| POST   | `/auth/login`   | Validated email/password → access token and safe user data |
| GET    | `/auth/me`      | Current authenticated user ID and role                     |

Success: `{ "data": ... }`. Future lists add `meta: { page, pageSize, total }`. Errors: `{ "error": { "code", "message", "details"? }, "requestId" }`; rate-limiter responses use the same error object and an `X-Request-Id` header. Error details contain safe validation issues only. Responses never expose stacks, hashes, SQL, or raw Prisma failures.

HTTP conventions: 200 read/update/action, 201 creation, 400 malformed JSON, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict/invalid transition, 413 oversized body, 422 invalid input, 429 rate limit, 500 unexpected failure, 503 readiness failure.

Future list routes validate pagination (default page 1/size 20, maximum size 100), allowlist filters and sorting fields, and use stable secondary ordering by ID. Zod middleware validates body, params and query, storing parsed inputs in `res.locals.input`. The backend alone calculates financial totals.

## Next implementation steps

1. Add customer/product CRUD vertical slices with role guards, validation and database integration tests.
2. Implement draft quotation create/read/edit using authoritative calculations and customer/item snapshots.
3. Implement explicit submit, approve, reject, reopen, send, customer outcome and expire actions with transactions, concurrency checks and audit history.
4. Implement transactional PI snapshot creation and issuing; expose Finance screens and endpoints.
5. Add refresh/revocation session design, account management, CI with an ephemeral MySQL database, and deployment configuration.

See [architecture decisions and business rules](docs/architecture.md) for transition, concurrency, money, snapshot, and security policies.
