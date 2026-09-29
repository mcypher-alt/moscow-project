# Build, deployment and recovery

## Components

Linux containers: React/Vite frontend, Express/TypeScript REST and SSE server, PostgreSQL 16, Valkey 8, FastAPI/Uvicorn with CatBoost and pandas. Production adds nginx TLS termination and a PostgreSQL backup sidecar. npm lockfiles enumerate JavaScript dependencies; ml-service/requirements.lock.txt lists the validated Python runtime. LDAP integration uses ldapts, XML uses fast-xml-parser, validation uses Zod. Auth uses bcrypt and jsonwebtoken. Leaflet/OpenStreetMap provides a basemap; replace the tile provider with a customer-approved internal service if required. Tile downloads contact that provider.

Data flow: source exports -> authenticated ingestion -> operational EventLog and ForecastJob -> object history aggregation -> CatBoost inference -> analytical Forecast and actionable Incident -> Redis/SSE and dashboard -> attributed DispatcherAction. Original archives remain separate in ml-moscollector. There is no outbound equipment control. See IMPLEMENTATION.md for model and integration limitations.

## Development startup

From the repository root, copy .env.example to .env and set a random JWT_SECRET of at least 32 characters. MODEL_DIR must contain general_24h.cbm and general_24h.json (bundled default ./models/refined_24h, including calibration.json). Run docker compose up --build -d --renew-anon-volumes, then docker compose exec server npx prisma migrate deploy. The --renew-anon-volumes option refreshes dependency volumes after package changes; it does not remove the named PostgreSQL data volume. Open http://localhost:3000. Services use ports 3000, 5000, 8000, 5433 and 6379 locally. Do not expose this development configuration to the Internet.

Provision an administrator with ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters), then run npm run bootstrap in server with DATABASE_URL configured, or pass those variables to docker compose exec server npm run bootstrap. Re-running bootstrap leaves an existing account unchanged. The local review administrator's credentials are stored in the ignored root .env file. Existing dispatcher credentials remain unchanged. Never run demo seed scripts in production; seed:redis creates synthetic alerts and is not part of the new startup workflow.

Import the object registry, channels and historical telemetry through scripts/import_data.py as documented in API.md. Do not import the full raw archive into the operational database by default. For a planned historical load, set DISABLE_WORKER=true while importing, then unset it and restart the server to score complete histories. Live API ingestion automatically queues changed objects. Initial migration also queues objects that already have events.

For host development: npm ci in client and server, set DATABASE_URL and JWT_SECRET, run npx prisma generate and npm run build in server, then npm run dev. Run npm run dev in client. API_PROXY_TARGET defaults to http://127.0.0.1:5000. The backend defaults to port 5000. ML: pip install -r ml-service/requirements.lock.txt, set MODEL_DIR, then uvicorn main:app --host 127.0.0.1 --port 8000 from ml-service.

## Production

Inference optimization (27 September): the default single-snapshot feature path preserves model probabilities and avoids historical rolling-matrix work. For rollback set `ML_BATCH_FEATURES=1` in the root `.env`, then run `docker compose up -d --no-deps --force-recreate ml-service` (use `-f compose.production.yml` for production). Restore `0` for the optimized path. See [measurements and experiment results](ML_EXPLORATION_20260927.md). Model files and existing forecasts remain unchanged. The unpromoted `models/explored_20260927` research manifest is not supported by the production loader and must not be used as MODEL_DIR.

The local refined bundle is `../../ml-moscollector/models/refined_20260926`; see [model evidence](MODEL_REFINEMENT.md). Set root `.env` `MODEL_DIR` to this path, then run `docker compose up -d --no-deps --force-recreate ml-service`. Verify `/health` reports `refined_24h:1ff6245ac77b553e`, `calibrated: true` and `historyHours: 168`. Existing forecasts keep their versions; new telemetry uses the active model. For rollback set `MODEL_DIR=../../ml-moscollector/models` and recreate the ML service; verify `general_24h:c33925d8b3b22e04`. The updated worker supports both bundles. Supply seven days of telemetry for full refined-model context; the local review replay currently contains approximately one day.

Use compose.production.yml as a standalone Compose file. Set POSTGRES_PASSWORD, DATABASE_URL (postgresql://moscollector:URL_ENCODED_PASSWORD@postgres:5432/moscollector?schema=public), JWT_SECRET, MODEL_DIR, ALLOWED_ORIGINS (the exact HTTPS origin), TLS_CERT_DIR and BACKUP_DIR. Certificate directory must contain fullchain.pem and privkey.pem. Run docker compose -f compose.production.yml up --build -d. Only nginx port 443 is published. The server applies migrations and compiles before starting. Linux is the intended server OS. Do not run multiple server replicas until distributed queue/notification coordination is implemented.

LDAPS: set LDAP_URL=ldaps://directory.example:636 and install the corporate CA via the Node trust configuration (for example NODE_EXTRA_CA_CERTS with a mounted PEM). Provision approved users with email equal to corporate UPN and the required local role. Password bind is read-only. Certificate validation must remain enabled. No account is auto-promoted from directory membership. Validate directory behavior, account lifecycle and role mapping with the customer before enabling it.

Set resource limits and capacity-test with the customer's event rate before acceptance. The 240-second model HTTP timeout is below the 300-second requirement, but queue wait plus processing can exceed it under overload. Monitor GET /api/operations for pending, failed and old jobs. Watch AUDIT_WRITE_FAILED and inference failures in server logs. A 30-second browser poll complements SSE; source delivery delay remains external. The process-local event emitter supports at least 20 clients but is not a cross-replica bus.

## Backups and restoration

Production backup container creates a custom-format pg_dump at startup and every 24 hours. A .partial file becomes .dump only after success. Place BACKUP_DIR on protected storage separate from the database volume and monitor backup age. No retention deletion is enabled until the customer approves retention. The pre-change local database snapshot is output/verification/before-upgrade.dump, excluded from Git.

Recovery sequence: stop application writers, provision PostgreSQL 16 and restore the selected dump to a NEW empty database using pg_restore --exit-on-error --no-owner -h HOST -U USER -d NEW_DATABASE BACKUP.dump. Verify row counts, migrations, users and model files. Point DATABASE_URL at the restored database and start the server. Redis may start empty: unresolved alerts are read from PostgreSQL and failed jobs remain in the backup. Re-deliver source telemetry since the snapshot using stable event IDs. Verify /api/health, /api/operations, login and latest forecast. Measure elapsed time during a customer rehearsal; do not claim the four-hour RTO solely from configuration. Daily backup implies up to 24-hour RPO unless the source can replay or WAL archiving is configured.

## Verification commands

Client: npm ci; npm run lint; npm run build. Server: npm ci; npx prisma generate; npm run build. Python: pip install -r requirements-test.txt; set MODEL_DIR; python -m unittest test_features -v from ml-service. Integration suite: create a separate database named moscollector_acceptance, set DATABASE_URL to it, JWT_SECRET to a test secret, ML_SERVICE_URL to the running model and REDIS_URL to test Redis. Apply npx prisma migrate deploy, then npm run test:acceptance. The suite refuses another database name and uses isolated fixture IDs. Fixture data remains available for inspection.

Before release: review npm audit, test the real LDAP directory, test TLS with customer certificates, test Chrome/Yandex, rehearse restore, run sustained ingestion plus 20-user workload, evaluate class-specific models on approved incident labels and validate recommendations. These are acceptance dependencies, not results already achieved here.

The selected inference bundle is now versioned under `models/refined_24h`; a fresh clone does not need the separate training workspace to serve predictions. Raw datasets and alternative research models remain external.
