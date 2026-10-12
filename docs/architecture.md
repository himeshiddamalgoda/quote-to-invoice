# Architecture decisions

## Initial boundaries

This is a single-business application foundation, not a multi-tenant system. Roles use one enum per user (ADMIN, SALES, MANAGER, FINANCE, VIEWER); permission tables and multiple roles can be introduced when requirements justify them. ADMIN bypasses role guards. Reads/writes for future business endpoints must explicitly use both authentication and authorization middleware.

Auth provides the complete route/controller/service/repository pattern. Only auth, health, pure commercial calculations, and workflow guards are operational. There are no generic status mutation endpoints.

## Quotation workflow

| Action          | From                                           | To                | Intended role           |
| --------------- | ---------------------------------------------- | ----------------- | ----------------------- |
| submit          | DRAFT                                          | PENDING_APPROVAL  | SALES                   |
| approve         | PENDING_APPROVAL                               | APPROVED          | MANAGER                 |
| reject          | PENDING_APPROVAL                               | REJECTED          | MANAGER                 |
| reopen          | REJECTED                                       | DRAFT             | SALES                   |
| send            | APPROVED                                       | SENT_TO_CUSTOMER  | SALES                   |
| customer-accept | SENT_TO_CUSTOMER                               | CUSTOMER_ACCEPTED | SALES                   |
| customer-reject | SENT_TO_CUSTOMER                               | CUSTOMER_REJECTED | SALES                   |
| expire          | PENDING_APPROVAL / APPROVED / SENT_TO_CUSTOMER | EXPIRED           | Scheduled system action |
| create-proforma | CUSTOMER_ACCEPTED                              | Unchanged         | FINANCE                 |

Only drafts may be edited. Rejection requires an explicit, audited `reopen` action; increment `version`, preserve approval history, then edit and resubmit. Store the quotation version in each approval. Customer rejection and expiration are terminal in this first model; a future revision/copy action can produce a new quotation. Customer outcome endpoints represent a staff-recorded response with evidence; they must not be unauthenticated public actions. A customer portal/token acceptance flow is a later security design.

`validUntil` and `quotationDate` are business dates. Future services must choose/configure a business timezone and treat the validity date as inclusive through the end of that business day. Submission/approval/sending/acceptance must reject expired validity even if the expiration worker has not run. Accepted quotations do not expire afterward. Date enforcement, roles and item/totals checks are service responsibilities, beyond the pure status matrix.

Approval services must validate the actor, current state/version, nonempty items and recalculated totals. Store a new history row with approver, action, version, reason and timestamp in the same transaction as the status change and audit entry. Approval comments/rejection reasons need length validation; rejection requires a reason. Customer outcome audit metadata should contain only safe references, not sensitive communication contents.

## Transactions and concurrent requests

`nextDocumentNumber(tx, kind, year)` uses parameterized MySQL INSERT ON DUPLICATE KEY UPDATE with an atomic increment on a `(kind, year)` primary key. The transaction holds the InnoDB row lock while reading the counter value back. Use it inside the document transaction, never derive a number from row counts. Format: `QT-2026-0001`, `PI-2026-0001`; padding is a minimum width. Choose the year from the document business date. Keep numbers unique, immutable and never recycle committed numbers.

For quotation mutations: read and validate within a transaction, then perform a conditional update using ID, expected status and version, incrementing version. If zero records match, return 409. Approval/PI creation/audit must share that transaction. Use Serializable where coordinating multiple reads, and bounded retries for Prisma P2034 transaction conflicts. The helper itself does not implement a retry policy; services will do so.

A unique `sourceQuotationId` enforces one PI per quotation, including cancelled PIs. A second request returns a domain conflict, never a second snapshot. Future replacement/revision rules should be designed explicitly rather than removing this protection silently.

## Money policy

Initial supported currencies: USD, EUR, GBP, LKR, all with two minor digits. Other currencies require a currency precision policy before adding them.

- API quantity, price, discount and tax inputs are decimal **strings**. All financial outputs also use strings.
- Quantities: MySQL Decimal(15,4); unit prices: Decimal(19,4).
- Monetary totals and absolute discounts: Decimal(19,2); tax rate percent: Decimal(7,4).
- Use decimal.js with 48-digit calculation precision and ROUND_HALF_UP.
- Gross line = quantity × unit price, rounded to two places.
- Line total = rounded gross − absolute line discount. Discount cannot exceed gross.
- Subtotal = sum of rounded line totals, after line discounts.
- Taxable amount = subtotal − absolute overall discount. Overall discount cannot exceed subtotal.
- Tax = taxable amount × tax rate / 100, rounded once to two places.
- Total = taxable amount + rounded tax. Tax rate must be 0–100 inclusive.
- Reject overflow, negative values, zero quantity and excess input precision.

This initial single tax-rate, tax-exclusive policy deliberately avoids tax jurisdictions, compounded taxes, percentage discounts and exchange rates. Services must calculate from validated input and persisted item snapshots; ignore/reject client totals. No JavaScript Number money arithmetic.

## Snapshot and audit policy

Quotations snapshot customer identity/billing fields and line descriptions, units, quantities and agreed prices. A PI has its own copies of customer fields, terms, amounts and line items, with source quotation ID/version for traceability. Product/customer foreign keys are references only: rendering a document must use its stored snapshot fields. PI commercial data becomes immutable once issued; later operations may cancel it through an audited action. Future payments/final invoices should reference documents without changing historical prices.

AuditLog records actor, typed action, entity name/ID, timestamp and allowlisted metadata. It intentionally has no polymorphic foreign key; services must insert it transactionally with the entity action. Application code should treat audit and approval rows as append-only; future database permissions/retention rules can reinforce this. No passwords, JWTs or full customer payloads in audit metadata. Schema restrictions alone do not enforce service-level workflow/immutability.

## Security and deployment

- Argon2id password hashes; no default passwords, no public registration, no seed overwriting existing credentials.
- JWT HS256 restricted verification with issuer/audience, UUID subject and 15-minute expiration. Load current user from the database for active status and current role. Tokens live in frontend memory; reload requires login. No refresh, immediate per-token revocation, account recovery or user provisioning API yet.
- Frontend session/role visibility is only UX; server middleware and future services enforce permissions and ownership policies.
- The in-memory rate limiter works for one process. Use a shared store for multiple replicas. Trust proxy is disabled; configure known trusted proxy addresses/hops before deploying behind a proxy so IP limiting works safely.
- CORS uses exact configured origins, does not enable credentials, and is not authorization. TLS belongs at the deployment ingress. Do not add wildcard origins or tokens to query strings.
- Request logs contain generated request ID, method, status and duration, not bodies, query strings, headers, or raw errors. Investigate failures with request IDs and safe telemetry.
- Prisma connection pool is bounded and has a connection timeout. Readiness probes query the database; liveness does not.
- Deployment must apply migrations before serving traffic, inject environment secrets, serve static client assets with SPA fallback, and implement backup/restore procedures.

## Test boundaries

Pure calculation/workflow tests exhaust the transition matrix and exercise rounding, discounts, invalid inputs and overflow. HTTP tests verify infrastructure with mocked persistence and do not claim to cover real SQL behavior. Optional real MySQL tests cover login, disabled users, current role checks, numbering races and transaction rollback. Run them against an explicitly supplied TEST_DATABASE_URL ending in _test. Next add business integration tests for role policies, concurrent approvals and duplicate PI generation. Business endpoints should be built together with these tests.

## Dependency maintenance

The lockfile fixes resolved versions. Server npm overrides select patched deepmerge-ts, mysql2 (transitive Prisma tooling dependencies), and mariadb driver versions to resolve audit advisories. Prisma generation and migrations are checked with these overrides. Reassess and remove overrides when upstream packages adopt patched dependencies; run npm audit and all verification commands when updating.

## Local database and independent apps

Client and server are independent npm packages with their own installations, lockfiles and lint tooling. Root npm commands are optional shortcuts; the apps do not require root node_modules. Server compose.yaml runs MySQL 8.4 separately with persistent storage and a healthcheck. Server .env supplies MYSQL_* credentials to both Docker and the API. Prisma CLI and seeding use the same database URL resolver. DATABASE_URL and SHADOW_DATABASE_URL remain optional overrides for external databases; explicit external URLs do not silently use a local shadow database.

The existing Compose project name quote-flow and its volume quote-flow_mysql_data are retained. Moving Compose into server/ does not reset the database. Development uses separate application, shadow and test schemas. These are local development permissions, not production provisioning. Prisma uses @prisma/adapter-mariadb for MySQL ([Prisma documentation](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)). MySQL UUID references use CHAR(36) and commercial text uses TEXT. Deployment TLS/pool configuration should be designed for the chosen host.
