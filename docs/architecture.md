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

For quotation mutations: read and validate within a transaction, then perform a conditional update using ID, expected status and version, incrementing version. If zero records match, return 409. Approval/PI creation/audit must share that transaction. Use Serializable where coordinating multiple reads, and bounded retries for MySQL ER_LOCK_DEADLOCK / ER_LOCK_WAIT_TIMEOUT transaction conflicts. The helper itself does not implement a retry policy; services will do so.

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
- MySQL connection pool is bounded and has a connection timeout. Readiness probes query the database; liveness does not.
- Deployment must apply migrations before serving traffic, inject environment secrets, serve static client assets with SPA fallback, and implement backup/restore procedures.

## Test boundaries

Pure calculation/workflow tests exhaust the transition matrix and exercise rounding, discounts, invalid inputs and overflow. HTTP tests verify infrastructure with mocked persistence and do not claim to cover real SQL behavior. Optional real MySQL tests cover login, disabled users, current role checks, numbering races and transaction rollback. Run them against an explicitly supplied TEST_DATABASE_URL ending in _test. Next add business integration tests for role policies, concurrent approvals and duplicate PI generation. Business endpoints should be built together with these tests.

## Dependency maintenance

Each app has its own lockfile. The server uses mysql2 directly; Prisma packages, engine downloads, code generation, driver adapters and their dependency overrides have been removed. Run npm audit and verification commands when updating dependencies.

## Local database and independent apps

Client and server remain independent npm packages. Server compose.yaml runs MySQL 8.4 separately. Server .env supplies MYSQL_* credentials to Docker, the API, migration runner and seed; DATABASE_URL overrides local connection settings for external servers. No shadow database is required. Existing volumes and credentials are preserved.

Repositories use mysql2 execute() with placeholders. Application connections disable multi-statements; only the isolated migration CLI executes trusted multi-statement SQL files. DECIMAL values remain strings ([mysql2 documentation](https://sidorares.github.io/node-mysql2/docs/documentation)); IDs use Node randomUUID(), and MySQL owns automatic updatedAt updates. Services pass one PoolConnection to repositories inside withTransaction() for atomic operations. Monetary arithmetic still uses decimal.js.

The domain schema lives in database/migrations; application enums are in src/types/domain.ts and the pure quotation workflow. The versioned SQL runner serializes work with a MySQL advisory lock, records checksums and completion, and detects edited or unfinished migrations. SQL newline normalization keeps checksums consistent on Windows and Unix. MySQL DDL cannot be rolled back as a whole, so failed migrations require deliberate review and repair. Do not change an already applied file or erase history to force a retry.

The runner contains a narrow compatibility check for existing completed initial migration records. It verifies their checksum and records a baseline without recreating tables. Old ORM history is kept, not used at runtime. Future schema changes use new timestamped SQL files rather than schema generation. Backup and review destructive SQL before deployment.
