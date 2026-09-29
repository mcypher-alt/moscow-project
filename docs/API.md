# API and data contracts

Base URL: /api on the same origin as the application. All dates use ISO 8601 with an explicit offset. Probability and threshold are percentages in [0,100]. Event IDs are decimal strings, never JavaScript floating-point numbers. API writes accept at most 5,000 rows / 10 MB. The importer streams 500-row batches and prints accepted counts; a failure stops subsequent batches, while earlier committed batches remain. Correct and retry; telemetry is idempotent by event ID.

## Authentication and reads

POST /auth/login: {"email":"provisioned-user","password":"..."}; sets HttpOnly SameSite=Lax cookie. Secure cookies are used with NODE_ENV=production. POST /auth/logout clears it. GET /auth/me returns the current user. Bearer JWT is also accepted for integrations. Integrations should use dedicated locally provisioned ADMIN identities.

GET /objects: registry with unresolved incidents, latest forecast and sensor metadata (name, tag, system/sensor type) for map search/filtering. GET /objects/:id: channels with latest readings, 100 latest incidents, 24 latest forecasts and imported work statuses. GET /forecasts?offset=0: 100 snapshots ordered newest first. GET /incidents?offset=0&status=OPEN&systemObjectId=5122&search=...&dateFrom=...&dateTo=...: 100 incidents with actions. Dates/IDs/status/offset are validated. GET /summary: counts grouped by status. GET /alerts/hot?limit=10: unresolved incidents, limit 1-100. GET /alerts/stream: authenticated SSE with hot_alert and alert_resolved events and a 15-second heartbeat. Browser polling recovers missed events. GET /health checks the database. GET /operations is admin-only and reports queued/failed inference jobs.

## Dispatcher writes

POST /incidents/:id/action: {"decision":"FALSE_ALARM","reasonCode":"SITE_INSPECTION","comment":"Verified on site"}. Decisions: SITE_VISIT, INSPECTION_COMPLETED, MONITORING, MAINTENANCE_SCHEDULED, REPAIR_COMPLETED, OTHER, DISPATCH_EMERGENCY_TEAM, EQUIPMENT_SHUTDOWN, REMOTE_DIAGNOSTICS, INSPECTION_SCHEDULED, ACKNOWLEDGE, CONFIRM_INCIDENT, FALSE_ALARM. CONFIRM_INCIDENT maps to CONFIRMED; FALSE_ALARM maps to FALSE_POSITIVE; REPAIR_COMPLETED maps to RESOLVED; other decisions map to IN_PROGRESS. CONFIRMED incidents remain actionable until resolved. RESOLVED and FALSE_POSITIVE are terminal and reject further actions with 409. INSPECTION_COMPLETED, REPAIR_COMPLETED and OTHER require a nonblank result comment. Reasons: SENSOR_CHECK, VIDEO_CHECK, PLANNED_WORK, SITE_INSPECTION, OTHER. No equipment command or external work order is sent. POST /alerts/:id/ack records an attributed acknowledgment and changes the incident to IN_PROGRESS.

## Receiver APIs (ADMIN)

POST /integrations/objects: {"items":[{"id":5122,"level":3,"objectKind":"controlHouse","dispatcherName":"Object 5122","parentId":null,"latitude":55.75,"longitude":37.61}]}. Coordinates are optional and must be paired. Hierarchy cycles are rejected. Existing records update only supplied fields.

POST /integrations/channels: {"items":[{"id":120473,"systemObjectId":5122,"systemTag":"MK-1","sensorName":"Temperature","systemType":"temperature","sensorType":"temperature"}]}.

POST /integrations/telemetry: {"items":[{"id":"4524243389","channelId":120473,"recordedAt":"2026-06-30T23:00:00+03:00","isAlarm":false,"rawValue":"28","numericValue":28}]}. Returns 202 with inserted and duplicates counts. Unknown channels and timestamps more than one minute ahead of the server are rejected. Identical retries are ignored. Reusing an ID with different channel, timestamp, alarm or value fields returns 409 and rolls back the whole request, including concurrent conflicts. Corrections need a new source ID. Ingest history before enabling a live stream to avoid partial-history scores.

POST /integrations/work-requests: {"items":[{"externalId":"WO-1","systemObjectId":5122,"status":"PLANNED","description":"Inspection","startsAt":"2026-10-01T09:00:00+03:00","endsAt":"2026-10-01T12:00:00+03:00"}]}. External status strings are preserved. This endpoint receives status only.

XML uses Content-Type: application/xml and the same canonical fields under <batch><items><item>...</item></items></batch>. Use explicit true/false alarm values. DTD/entity declarations are rejected. Omit optional null fields in XML. The API rejects malformed JSON/XML and foreign origins for browser writes.

## File import

Install Python 3.11+ and openpyxl, tzdata for XLSX/timezones. Set IMPORT_EMAIL and IMPORT_PASSWORD in the process environment. Run: python scripts/import_data.py objects path/to/objects.csv --root-parent 3831. Then import channels, telemetry and work-requests with the same command and corresponding kind. --dry-run parses and normalizes without sending; API constraints are validated on actual import. --url selects another API origin. Use HTTPS outside local development.

CSV accepts UTF-8 BOM and comma/semicolon/tab delimiters. Canonical field names match the endpoints. The original Russian object/channel/event headers are mapped automatically. Source timestamps without an offset are interpreted as Europe/Moscow. XLSX uses the active worksheet's first row as headers, one record per subsequent row; merged calendar layouts need a reviewed conversion. GeoJSON FeatureCollection Point geometry uses feature properties for object fields. CSV/XLSX objects may alternatively have a wkt column containing POINT(longitude latitude). Unsupported geometries are rejected.

For automatic synchronization, schedule the importer at the source or have the source push to the receiver API using its approved read-only export mechanism. No connector is configured to a real customer system yet.

## ML HTTP contract

Internal service: POST /predict with systemObjectId, dispatcherName, objectKind, timestamp, historyStart, timeHorizonHours=24 and channels. Each channel supplies channelId, sensorName, optional sensorType, systemTag/systemType and readings with recordedAt, numericValue, rawValue, isAlarm. historyStart is the earliest known source reading for that object. Returns isIncidentPredicted, probability, threshold, horizonHours, horizon, modelVersion, incidentType, reason, recommendation and evaluatedAt. The backend rejects a response whose evaluatedAt or horizonHours differs from its request. No readings in the 24-hour feature interval produces 422, not a healthy result. Missing/incompatible model files fail startup. GET /health exposes the loaded model version and saved metrics. Service is private to the application network in production.



## Detailed maintenance and repair drafts (29 September 2026)

GET /objects/:id/maintenance: authenticated read; returns versioned condition guidance, timestamp, sections, latest per-channel observations and draftText. Uses the latest stored forecast and current database readings, not a selected historical forecast. Stale or absent readings explicitly leave condition unknown. Guidance is a deterministic review checklist, not an equipment-specific disassembly procedure or validated physical diagnosis.

GET /objects/:id/repair-drafts: authenticated read of the latest 50 saved drafts, newest first. POST /objects/:id/repair-drafts (DISPATCHER or ADMIN): {"content":"reviewed editable draft","version":"condition-guidance-1"}. Validates object, nonblank content (maximum 200,000 characters) and rule version. Returns 201 with persisted ID, creator, content, version and creation time. No external work order is submitted. Saved drafts can be downloaded as UTF-8 TXT in the detailed recommendation dialog.
