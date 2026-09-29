# Specification audit - 28 September 2026

Overall result: the local prototype is working, but full compliance is not established. This report supersedes earlier blanket completion claims. Source: Moscow_Utility_Tunnels_Technical_Assignment_EN.pdf, sections 1-19. Existing working application and validated model were preserved.

## Sections 1-5: purpose and scope - partial

The application supports a dispatcher in reviewing predicted alarm risk and recording a decision. No equipment commands or external repair orders are issued. Sensor/system failure prediction, early fire/flood prediction and intrusion verification are not implemented as validated separate models. The available target is an alarm proxy, not an incident diagnosis. Required next input: verified incident and failure labels with object, time, type and outcome.

## Sections 6-7: functions and data - partial

Implemented: 24-hour probability forecasts, object identity, forecast storage, preventive alerts, general verification recommendations, PostgreSQL, JSON/XML receiver APIs, CSV/XLSX tabular import, registry and work-status reception, GeoJSON/WKT points. The backend verifies the returned prediction timestamp and horizon against its request. Coordinates are shown only when supplied.

Not complete: incident-type classification, condition-specific maintenance rules, real SMVU/ODS/work-system connectors and authoritative equipment locations. Customer endpoint contracts, credentials, source dictionaries, de-identification rules and coordinate registry are missing. Formatted maintenance schedules require an approved mapping to objects; canonical XLSX support does not imply arbitrary workbook support.

## Section 8: optional extensions - conditional

Advanced incident-type/seasonal reports, repair-history analytics, automatic retraining, preventive recommendation extensions, repair-request drafts and PDF/XLSX management exports require customer agreement. Training scripts and an editable local dispatcher-comment draft exist. These do not constitute an automated retraining or external repair-order module. No optional scope has been silently treated as mandatory or certified complete.

## Sections 9-11: performance, interface and operations - partial

Implemented locally: dashboard, object list/detail, map, forecast history, decision journal, authenticated notifications, REST reception, roles, optional LDAPS, audit records, Linux containers, TLS deployment configuration and backup/recovery procedures. Rejected foreign-origin writes now enter the audit trail. Audit storage is asynchronous; guaranteed audit delivery during a database outage is not established. LDAP integration still needs a customer directory and certificate chain.

The 28 September isolated acceptance run passed: real inference and durable retry, idempotency, decision validation, role enforcement, XML validation, 20 authenticated readers and 20 simultaneous SSE connections. Real inference took 85 ms and the 20-reader fixture completed in 56 ms on this machine. These are small-fixture observations, not proof of <=300-second production inference/streaming delay or no degradation under the customer workload.

Earlier local restore evidence confirms 203,673 event rows were recovered in 0.73 seconds. Customer recovery within four hours and required availability remain unverified until deployment, backup retention/destination and a realistic restore drill are agreed. Current Chrome/Yandex acceptance is not certified; the updated dashboard was reviewed in Codex's in-app browser. All 95 historical objects correctly show no current forecast rather than a current critical risk.

## Section 12: operational scenarios - partial

Dispatcher decisions and reference-list verification reasons are persisted, with distinct confirmed and false-positive outcomes. Terminal decisions cannot be edited through the dashboard action button. Actual verification via cameras/site inspection remains external to the prototype.

New forecasts include up to 20 work-request IDs/statuses whose explicit start/end interval overlaps the prediction horizon, with an overflow indication. The dispatcher is prompted to compare readings with work information. This is context, not a learned cause, score adjustment or automatic warning suppression. Undated/open-ended work is available in object details but is not matched. Fire/smoke, intrusion and pump/weather scenarios still need specific labels, rules and location data.

## Section 13: integration and history - partial

Operational events and analytical forecasts are separate database entities; historical source archives remain in the training workspace. Automated archival/retention needs customer policy. The supplied history covers 2019-June 2026, short of the required minimum 12 years. No states.csv dictionary was supplied. Weather temperature/humidity/precipitation/pressure enrichment and approved RTEK rules remain absent. Receiver APIs are ready for source pushes, but no real customer integration has been validated.

Historical source auditing found exact duplicates, conflicting event IDs and unknown channel mappings. New ingestion now rejects contradictory reuse of IDs with HTTP 409 and rolls back the entire request, including concurrent conflicting submissions. Identical retries remain idempotent. Existing raw archives are preserved and require source reconciliation before a trustworthy historical rebuild.

## Sections 14-19: delivery and acceptance - partial

Source, installation, architecture, API, operations and model-method documentation exist. Local prototype: http://localhost:3000. Supporting documentation is refreshed with this audit; the earlier presentation is retained as a dated project artifact and must be read with this current status. Public repository, hosted prototype and submission links require an agreed destination/access. Customer acceptance and legal/regulatory certification have not been performed.

The UI exposes model evidence and limits, including historical timestamps, probability/horizon and missing locations. Generic alarm scores are never represented as validated physical incident causes. Customer-approved precision/recall targets and prospective verification are still needed; the specification does not provide numerical accuracy thresholds. Model parameters are versioned in the model bundle; a dispatcher-facing parameter editor and automated real-versus-predicted incident evaluation are not implemented.

## Corrections completed in this audit

- Reject conflicting telemetry IDs within a batch, against stored events and across concurrent requests; verify atomic rollback.
- Enforce the requested source timestamp and 24-hour horizon on ML responses.
- Include overlapping work-request context in new forecasts.
- Evaluate forecast freshness before unresolved incident status; remove unsupported critical-severity labels.
- Add probability, horizon and source time to map popups; show stale status and model version in object details.
- Resolve same-source-time forecast ordering deterministically; disable action entry for closed dashboard incidents.
- Audit rejected-origin writes and replace an invented prescribed-regulation fallback with an explicit missing recommendation.

## Verification evidence

Client build and ESLint; server TypeScript build; 13 Python ML tests; two frontend risk-state regression tests; isolated PostgreSQL acceptance suite. The suite intentionally simulates an unavailable ML endpoint before confirming durable retry; those connection-refused messages are expected. Business-data decisions were not changed during UI review.

Retained model: refined_24h:1ff6245ac77b553e. Historical test: 171,485 snapshots, precision 0.605195, recall 0.764271, F1 0.675494, average precision 0.746883. These describe alarm-proxy prediction, not true fire/flood/failure detection. See MODEL_REFINEMENT.md and ML_EXPLORATION_20260927.md for evaluation design, rejected candidates and limitations. No further tuning on the previously examined test set was performed in this audit.

## Inputs needed to close the remaining requirements

Provide 12-year source history; verified incident/failure labels and sensor-state dictionary; authoritative coordinates and equipment/work mappings; real integration contracts and access; weather/provider configuration and approved RTEK recommendations; directory/hosting/TLS/backup settings; production workload and availability targets; agreed quality thresholds and optional-module scope; publication/submission destinations. Implementation and validation of the dependent capabilities must follow receipt of those inputs. Their absence is not equivalent to completed functionality.
# Update: 29 September 2026

This document is the earlier audit snapshot. [Customer clarifications](CHAT_REVIEW_20260929.md) now explain the accepted MVP history, optional real integrations and indicative quality targets. The supplied state dictionary has been retrieved and incorporated into maintenance evidence; it contains unresolved conflicts. Do not interpret the earlier “no states.csv” finding as the current state. Production-readiness claims remain subject to verification.
