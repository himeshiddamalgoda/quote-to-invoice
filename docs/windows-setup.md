# Windows setup

Run these commands in Windows PowerShell. The client and API run on Windows; Docker runs MySQL separately. Use the current project version containing server/compose.yaml. Install dependencies separately on Windows rather than copying node_modules from another machine.

## Prerequisites

Install Node.js 22.12 or newer from https://nodejs.org/en/download and Docker Desktop from https://docs.docker.com/desktop/setup/install/windows-install/. Use Docker's WSL 2 backend and Linux containers. If the installer asks for WSL, run wsl --install in Administrator PowerShell and restart Windows. Start Docker Desktop and wait for its engine to run.

Open a new PowerShell terminal and check:

```powershell
node --version
npm.cmd --version
docker info
docker compose version
```

Use npm.cmd in PowerShell to avoid npm.ps1 execution-policy problems.

## First-time server setup

Replace the path with your cloned folder. On a fresh setup only, create the environment file below. If it already exists and has working values, preserve it.

```powershell
cd C:\projects\quote-to-invoice\server
npm.cmd ci
$jwtSecret = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
@"
MYSQL_ROOT_PASSWORD=QuoteFlowLocalRoot2026
MYSQL_PASSWORD=QuoteFlowLocalDb2026
MYSQL_HOST=localhost
MYSQL_PORT=3306
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173
JWT_SECRET=$jwtSecret
JWT_ISSUER=quote-flow
JWT_AUDIENCE=quote-flow-client
LOG_LEVEL=info
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=QuoteFlowLocalAdmin2026
"@ | Set-Content -Encoding ascii .env
npm.cmd run setup
npm.cmd run dev
```

The example passwords are for local development. setup starts MySQL, applies SQL migrations, and seeds the administrator. No Prisma binaries are downloaded. MySQL's first image download may take several minutes. Keep this terminal open.

## First-time client setup

In a second PowerShell terminal:

```powershell
cd C:\projects\quote-to-invoice\client
npm.cmd ci
'VITE_API_BASE_URL=http://localhost:3000/api/v1' | Set-Content -Encoding ascii .env
npm.cmd run dev
```

Open http://localhost:5173. Sign in with admin@example.test and QuoteFlowLocalAdmin2026 if you used the example configuration on a fresh database.

API liveness: http://localhost:3000/api/v1/health. Database readiness: http://localhost:3000/api/v1/health/ready.

## Later runs

Start Docker Desktop. In the server terminal run npm.cmd run db:up followed by npm.cmd run dev. In the client terminal run npm.cmd run dev. There is no root dependency installation.

Ctrl+C stops either app. From server/, npm.cmd run db:down stops the database while preserving data. npm.cmd run db:logs shows database logs.

## Troubleshooting

- Docker cannot connect: open Docker Desktop and wait until the engine is running.
- MySQL port 3306 is occupied: change MYSQL_PORT to 3307 in server/.env and restart the database with npm.cmd run db:up. The API derives its connection using that port.
- Connection denied after changing a database password: .env changes do not update users in an existing database volume. Use the original credentials or deliberately change the MySQL account password; do not delete a populated volume to fix it.
- npm.ps1 execution is blocked: use npm.cmd as shown above.

## Optional verification

From either app directory, run npm.cmd run typecheck, npm.cmd run lint and npm.cmd run build. From server/, npm.cmd test runs unit and HTTP tests; live database tests are opt-in.
