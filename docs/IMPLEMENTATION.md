# Implementation and acceptance status

Source: Moscow Utility Tunnels Technical Assignment, supplied PDF, sections 5-19. Updated 28 September 2026. The original application layout, database entities and trained general_24h model were retained. Existing uncommitted documentation edits were preserved.

## What works

The React dispatcher application reads actual PostgreSQL objects, forecasts, incidents, sensor readings and imported work-request statuses. The map renders supplied coordinates only. Missing coordinates and stale or absent forecasts are explicit. Forecasts show model probability, a 24-hour horizon, source timestamp and model version. The journal retains dispatcher decisions and selected verification reasons. Confirmed and false-positive decisions now produce distinct states. The interface remains available on narrow screens.

JSON and XML ingestion accept telemetry, object/channel registries and work-request status updates. Historical CSV and XLSX imports use the same validated API. GeoJSON Point and WKT Point coordinates are supported by the file importer, in WGS84 longitude/latitude order. Integrations receive data only and send no equipment-control commands or external repair orders. Input must be de-identified at source.

Telemetry and a durable per-object forecast job commit in one database transaction. Identical repeated events do not duplicate events; contradictory reuse of an ID returns 409 and rolls back the batch. Four concurrent inference tasks process bounded queue batches. Failed tasks retry with bounded backoff. A job revision prevents incoming telemetry from being lost while inference runs. All scored snapshots, including below-threshold results, are stored. Repeated scoring of a snapshot is idempotent; late-arriving readings refresh its score. One active incident per object/scenario avoids alert storms. Run one backend worker instance; multi-instance worker locking is not implemented.

The model is loaded once in FastAPI. Its feature names, feature-code hash and metadata must agree. The refined model shares training/inference code for 1/3/6/12/24/72/168-hour features, alarm recency, category patterns and activity trends. PostgreSQL aggregates telemetry before inference. Moscow wall time defines calendar features. Readings later than the scoring timestamp are excluded. The current hour may be partial; this difference from completed-hour training requires validation on real streaming data.

JWT authentication and database-checked roles protect the API, including alerts and SSE. Dispatcher/admin roles record decisions; analysts read; admins ingest. Optional LDAPS authenticates provisioned users by corporate UPN bind, with certificate validation and TLS 1.2 minimum. Local role provisioning remains required. Request audit records store actor, route, verb, result and timestamp without credentials or bodies. Decisions have their own permanent records. Redis accelerates notifications; PostgreSQL remains authoritative and the browser polls every 30 seconds to recover missed notifications.

## Model evidence and limitations

The 27 September [exploration report](ML_EXPLORATION_20260927.md) records 20 configurations, 29 development fits, ensemble/calibration comparisons and source-data audits. No replacement passed the registered quality criteria. The existing predictor remains active with a faster single-snapshot feature path, verified against 1,000 historical predictions and 13 Python tests. Local controlled four-client throughput improved from 20.7 to 117.8 requests/s; this is not a production SLA result. The source audit found exact duplicate rows, conflicting event IDs and unknown channel mappings that require correction before a trustworthy historical rebuild.

Active locally: refined_24h:1ff6245ac77b553e. Original weights remain available for rollback. Target: target_alarm_24h. Paired historical test: 171,485 snapshots, 62,678 positives. Refined precision 0.605195, recall 0.764271, F1 0.675494, average precision 0.746883, ROC AUC 0.820363. Original F1 was 0.661674, recall 0.711797 and precision 0.618145. Accuracy changed from 0.733948 to 0.731609. Sigmoid calibration and threshold 0.303796 were selected before the final comparison. See [Model refinement](MODEL_REFINEMENT.md) for the protocol, uncertainty and full results.

This binary model predicts future alarm proxies. It does not classify confirmed fires, floods, intrusion, sensor failure or pump failure. The refined bundle includes a sigmoid calibrator; older forecasts retain their original model versions. Recommendations request verification and consideration of maintenance, without inventing physical causes or operational thresholds. Customer-approved recommendation rules and confirmed incident labels are required for the specialized scenarios.

The refinement uses chronological development folds with a 25-hour embargo, separate calibration and threshold periods, and one final comparison. The historical test period had already been reported for the original model, so this is not new unseen evidence. Prospective customer-reviewed evaluation remains necessary. The original training script is retained for provenance; use scripts/refine_model.py in the training workspace for the corrected workflow. Do not repeatedly tune against the held-out test set.

## Specification coverage

Sections 5-7: historical/current telemetry, database storage, alarm probability and horizon, source object identification, receiver APIs, equipment/channel registry and work statuses implemented. Specialized incident classification and condition-specific maintenance recommendations remain constrained by the supplied binary model and missing approved rules. XLSX importer expects tabular canonical columns, not arbitrary formatted maintenance schedules.

Section 8: retraining, expanded analytics, automatic repair drafts and management exports are conditional on customer agreement. Existing training scripts are retained outside the application. No automatic retraining or external repair submission is enabled.

Sections 9-11: small-fixture real inference and 20-reader checks passed. This does not certify the 300-second SLA under production ingestion rates. TLS deployment configuration and daily backups are supplied. Recovery procedures must be rehearsed on the customer's infrastructure before claiming the four-hour recovery objective. LDAPS is implemented but cannot be end-to-end verified without the directory. The UI was checked in the local Chromium browser; Yandex Browser acceptance remains outstanding.

Sections 12-13: dispatcher verification and outcome capture implemented. Planned work is visible in object details. New forecasts include overlapping dated work-request context for dispatcher comparison; it does not suppress warnings or alter the trained score. Weather enrichment is not connected, because no object coordinates or approved provider were supplied. Operational events and analytical forecasts are separate tables; source archives remain in the separate training workspace. Automated archival/retention policy needs customer agreement.

Sections 14-19: open source, installation/API/architecture documentation and a project presentation supplied. Repository publication, hosted prototype, customer acceptance and presentation submission links require a selected destination and deployment access. No claim of legal certification or regulatory compliance is made.

## Missing customer inputs

1. Confirmed incident records with start time, object, type and verification outcome; labels for sensor failure and false activations.
2. Agreed precision/recall thresholds by scenario, alert policy and approved maintenance recommendations/RTEK rules.
3. Full 12-year history. Available files cover 2019-2026; the latest supplied event hour is 30 June 2026, 23:00 Moscow time.
4. Sensor-state dictionary. The training reference folder contains channels.csv and objects.csv, but no states.csv.
5. Authoritative coordinates/address registry and mapping of work sections and equipment to objects. No real coordinates were invented.
6. SMVU, ODS, equipment and work-accounting endpoint contracts, credentials, source identifiers, synchronization cadence and de-identification policy. The provided APIs are adapters awaiting these sources.
7. Mapping of the two formatted maintenance workbooks to object IDs and canonical work-request fields. They were preserved, not guessed into a schedule.
8. LDAP/AD URL, corporate certificate chain, approved users and roles; production hostname, TLS certificate, hosting access, backup destination/retention and recovery regulations.
9. Weather provider and location mapping; production event rate, active-user workload and load-test acceptance criteria.

## Local review data

The local application contains the supplied 95 objects, 11,485 channels and 203,673 source events from the final approximately 24 hours of the 2026 file. This is historical replay, not live monitoring. Importing it may produce several historical snapshots as batches arrive. They are labeled with source timestamps. The omitted external root 3831 is explicitly treated as the root boundary during registry import. Original raw files and trained artifacts remain unchanged.

## Validation

Client TypeScript/Vite build and ESLint pass. Server TypeScript compile and Prisma generation/migrations pass. Thirteen Python tests check hourly aggregation semantics, future-data exclusion, short histories, missing-data rejection and the real model HTTP contract. An isolated PostgreSQL acceptance database verifies authentication, RBAC, transactional JSON/XML imports, invalid input, duplicate events, durable retry, snapshot idempotency and false-positive outcomes. Initial measured real-model processing was 74 ms and 20 concurrent authenticated object reads completed in 74 ms on a small fixture. These numbers are not production benchmarks.

The existing Prisma/deepmerge-ts dependency finding was resolved by updating the override to deepmerge-ts 8 and rechecking Prisma generation and compilation. Both npm audits now report zero vulnerabilities. Container Python packages are pinned in requirements.lock.txt after validation.

A restore drill restored the review database to a separate empty local database in 0.73 seconds and verified all 203,673 EventLog rows. This proves the tested local backup is restorable, not the customer production RTO.

# Source update: 29 September 2026

The state dictionary is now present in `docs/sources/chat-20260928/sensor-states.csv` and the ML reference workspace. See [chat review](CHAT_REVIEW_20260929.md) for provenance, source conflicts and the revised MVP scope. Earlier missing-data notes below describe the original delivery.
