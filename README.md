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

- Independently runnable React/Vite client and Express API with separate npm packages.
- Strict TypeScript, ESLint, Prettier, lockfile, and verification scripts.
- Frontend routing with lazy pages, shared layout, accessible login form, API error handling, and TanStack Query.
- Backend environment validation, Helmet, explicit CORS allowlist, request limits, rate limits, request IDs, structured logging, graceful shutdown, and centralized errors.
- Argon2id login, 15-minute JWT access tokens, authenticated identity endpoint, and reusable backend role guards. No public registration or refresh sessions yet.
- MySQL/Prisma domain schema and initial migration, explicit administrator seed, atomic document numbering helper, decimal calculations, and pure workflow guards.
- Unit tests and HTTP infrastructure tests using mocked persistence. Optional real MySQL tests cover login, current role/active checks, concurrent numbering and transaction rollback.

Customers, products, quotation CRUD/actions, approval persistence, and PI generation endpoints are **not implemented**. The UI exposes an overview and login only. The schema and pure rules prepare these modules without pretending the workflow is operational.

## Independent applications

`client/` and `server/` each own their package.json, package-lock.json, node_modules, environment file, lint configuration and npm commands. Run npm ci inside each folder. No root dependency installation is required. The root package.json only provides optional commands that call the two apps.

MySQL belongs to `server/`: its compose.yaml, initialization SQL and all database settings live there. Run the database and API from that folder, and the frontend from a separate terminal in client/.

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
│   ├── compose.yaml             # Local MySQL service
│   ├── docker/mysql/init.sql    # Shadow and test schemas
│   ├── package-lock.json
│   ├── prisma.config.ts
│   ├── tests/
│   └── .env.example
├── docs/architecture.md
├── package.json
└── .gitignore
```

Add customers, products, approvals and proforma-invoices feature/module folders when implementing them. Do not create empty placeholders. Generic components belong in `client/src/components`; domain UI belongs in its feature.

## Prerequisites

- Node.js 22.12 or later (use `nvm use` with the provided `.nvmrc`), npm 10 or later.
- Docker with Docker Compose for the included MySQL 8.4 local database, or an existing MySQL 8.4 database.
- A separate database for integration tests. Never run database tests against production.

## First-time setup

Open two terminals from the cloned project. Examples contain variable names only; replace them with the values below rather than leaving blank optional settings.

### Server and database — terminal 1

```sh
cd server
npm ci
cp .env.example .env
```

Edit `server/.env` with these local settings. Choose your own database/admin passwords and generate the JWT secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

```dotenv
MYSQL_ROOT_PASSWORD=YOUR_LOCAL_ROOT_PASSWORD
MYSQL_PASSWORD=YOUR_LOCAL_DATABASE_PASSWORD
MYSQL_HOST=localhost
MYSQL_PORT=3306
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=YOUR_GENERATED_SECRET
JWT_ISSUER=quote-flow
JWT_AUDIENCE=quote-flow-client
LOG_LEVEL=info
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
```

`MYSQL_PASSWORD` is used by both Docker and the API; no connection URL needs to be entered for local Docker setup. Admin passwords must be at least 12 characters; JWT secrets must be at least 32 characters. Remove other unused blank lines from the copied example.

Start Docker Desktop, then:

```sh
npm run setup
npm run dev
```

`setup` starts MySQL, generates Prisma Client, applies committed migrations and seeds the admin. Existing accounts are not changed by seeding. It is safe to rerun setup. MySQL data persists in a named volume. The database is a separate service; it does not depend on the React app or API process staying open.

### Frontend — terminal 2

```sh
cd client
npm ci
cp .env.example .env
```

Set `client/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Then:

```sh
npm run dev
```

Open **http://localhost:5173** and sign in with your seed administrator email/password. API liveness: http://localhost:3000/api/v1/health. Database readiness: http://localhost:3000/api/v1/health/ready.

### Subsequent runs

Server terminal:

```sh
cd server
npm run db:up
npm run dev
```

Frontend terminal:

```sh
cd client
npm run dev
```

Press Ctrl+C to stop either app. From server/, `npm run db:down` stops MySQL and preserves data; `npm run db:logs` shows database logs. Compose is in `server/compose.yaml` and reads `server/.env`. The project name and volume are unchanged, so existing local data is reused.

## Database configuration

Compose creates quote_flow, quote_flow_shadow and quote_flow_test on first initialization. The app reads local MySQL credentials from server/.env; Prisma derives its shadow connection automatically. MYSQL_PORT controls both the Docker host port and API connection, so changing it in one place is enough.

For an existing external MySQL server, skip db:up and setup, set DATABASE_URL in server/.env, then run db:generate, db:deploy, and db:seed. For new development migrations on an external server, also configure SHADOW_DATABASE_URL. The explicit URL takes precedence over local MYSQL_* configuration. Initialization scripts and Docker password changes apply only to a fresh volume; changing a password in .env alone does not change an existing database account.

From server/:

```sh
npm run db:migrate -- --name descriptive_change  # create development migrations
npm run db:deploy                               # apply committed migrations
```

Use db:deploy in production, never migrate dev or db push. The initial migration is for MySQL; it does not convert an existing PostgreSQL database.

## Verify and build

From either app folder:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
```

From server/ also run `npm test`. By default the real database tests are skipped. To include them, migrate the dedicated test database and pass its URL explicitly:

```sh
DATABASE_URL=mysql://quote_flow:YOUR_ENCODED_PASSWORD@localhost:3306/quote_flow_test npm run db:deploy
TEST_DATABASE_URL=mysql://quote_flow:YOUR_ENCODED_PASSWORD@localhost:3306/quote_flow_test npm test
```

Percent-encode special characters when writing URLs. The test database name must end in _test.

Build output: client/dist and server/dist. Run the compiled API from server/ with npm start. From client/, npm run preview serves a local preview; production static hosting needs SPA fallback. Client VITE variables are public; keep secrets only in server/.env and inject them securely in production.

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
