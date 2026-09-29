> Updated implementation: use [Operations](docs/OPERATIONS.md) for current startup, TLS, backup and recovery instructions; [API](docs/API.md) for imports; [Acceptance status](docs/IMPLEMENTATION.md) for completed work and missing customer inputs. The local prototype is http://localhost:3000. Before starting, configure the root `.env` using `.env.example`; a random `JWT_SECRET` is required. The real model is mounted from `MODEL_DIR`. Do not use `seed:redis` for real data.

# Predictive Telemetry and Incident Monitoring Platform

The locally active model was refined on 26 September 2026. See [measured model comparison](docs/MODEL_REFINEMENT.md) for results, calibration, limitations and rollback. On 27 September, [broader ML experiments and inference optimization](docs/ML_EXPLORATION_20260927.md) improved local throughput 5.69× with identical predictions; the research candidate was not promoted because its prediction-quality trade-offs failed the replacement criteria. These reports supersede the earlier model metrics in the static supporting PDF and presentation.

An early detection system for technological failures, security incidents, and fire incidents at dispatch-controlled facilities. The platform collects sensor telemetry, sends it to a machine learning service for risk assessment, and delivers critical alerts to the operator dashboard in real time via SSE.

All system components (PostgreSQL database, Redis cache, Node.js backend, and React/Vite frontend) are fully containerized with Docker. There is no need to install Node.js, npm, or third-party databases on the host machine.

## Requirements

- Docker and Docker Compose (included with Docker Desktop).

## Quick Start (All-in-Docker)

### 1. Environment Configuration (.env)

Copy `.env.example` to `.env` in the repository root and replace `JWT_SECRET` with a random value of at least 32 characters. The default `MODEL_DIR=./models/refined_24h` loads the included validated model bundle. Keep credentials out of Git.

### 2. Build and Start All Services

Run the following command from the project root directory:

```bash
docker compose up --build -d
```

Docker will automatically build the backend and frontend containers and start PostgreSQL and Redis.

Check the container status:

```bash
docker compose ps
```

### 3. Database Migrations and Seeding

Since npm is not installed locally, the commands are executed directly inside the running server container:

```bash
# 1. Apply Prisma migrations
docker compose exec server npx prisma migrate deploy

# 2. Run full seeding (dispatchers + telemetry from CSV)
docker compose exec server npm run seed:dispatchers
# Import real registries/telemetry using scripts/import_data.py; see docs/API.md
```

The `seed:all` script sequentially runs `seed:dispatchers` (creates a test operator) and `seed:csv` (imports objects, channels, and sensor readings).

### 4. Sign In

Open the following address in your browser: <http://localhost:3000>

Dispatcher credentials:

- Login: `dispatcher@test.ru`
- Password: `admin123`

## Additional Commands

View logs in real time:

```bash
# Logs for all services
docker compose logs -f

# Backend logs only (telemetry worker and inference)
docker compose logs -f server
```

Restart a specific service:

```bash
docker compose restart server
```

Stop the entire project:

```bash
docker compose down
```

Stop the project and remove persisted database data:

```bash
docker compose down -v
```

## Current audit

See [Specification audit](docs/SPECIFICATION_AUDIT.md) for the 28 September corrections, test evidence and unresolved customer dependencies. This prototype is not yet fully compliant with the specification.

Supporting documentation PDFs are generated locally under `output/documents/` and are not versioned.

[Map, maintenance and resolution workflow — 29 September](docs/MAP_AND_MAINTENANCE.md) describes the new UI, repair drafts, verification and remaining data dependencies.

[Customer clarifications and imported chat materials — 29 September](docs/CHAT_REVIEW_20260929.md) updates the MVP scope, adds the supplied state dictionary and maintenance schedules, and records submission requirements. Read this alongside the earlier audit; several previously missing datasets are explicitly unavailable for the hackathon.

The ChampionsSUSU presentation is kept locally under `output/documents/` because it contains personal team contacts.
