# Map, maintenance and resolution workflow - 29 September 2026

This extension implements the requested dispatcher features while retaining the trained model and original telemetry. It supersedes the 28 September audit's statements about missing local repair drafts and terminal confirmed incidents. The older PDF remains a dated audit snapshot.

## Risk display and map

Forecast percentages use parentheses, for example (90.0%), in forecasts, alerts, object details and map popups. Current-risk object badges also show a percentage when the forecast is fresh. Historical probabilities retain their source timestamp; missing forecasts are not represented as zero risk.

Map modes: clustered points and a canvas heat layer weighted by probability. Points are grouped into 55-pixel projected grid cells, with viewport culling and a Canvas renderer. Cluster colour uses the highest displayed priority; its label is an object count. Selecting a cluster zooms to its bounds. Coincident locations remain accessible through search or the cluster's first 20 detail links. Search results are capped at 50 with an explicit total and a prompt to refine the query.

Filters select red, yellow, green or unknown risk, an inferred equipment category, and exact registry system/sensor types. Categories may overlap for multi-system objects. Classification uses registry text, not a customer-approved taxonomy. Red means a fresh forecast with an unresolved warning (including a confirmed incident awaiting resolution); yellow means an above-threshold forecast; green means below the model threshold; grey means missing/stale data. These are review priorities, not calibrated incident-severity classes.

Search matches ID, name, address, sensor tag/name, system/sensor type and category text within the current filters. Selecting a located result centers the map at zoom 16 or closer and highlights it. Selecting it again recenters after panning. A selected marker and every individual popup provide an object-detail link. Objects without coordinates remain searchable and link to details, but cannot be centered on the map.

Heat colour represents weighted spatial density, not a probability for a geographic area. Stale forecasts and zero probabilities do not contribute. Filters apply to both modes. Actual supplied objects still lack coordinates; no test coordinates were added to the real registry.

## Condition-based maintenance guidance

The short recommendation remains visible. The detailed recommendation button is available in alerts, forecasts and object details. It opens guidance generated from the latest stored object name/type, forecast anomaly, sensor metadata, values, timestamps and alarm flags. It explicitly identifies historical forecasts, stale readings and missing measurements. It does not infer physical failure from a binary alarm score.

Sections cover evidence, initial checks, water/pump or electrical checks where metadata matches, sensor inspection/calibration, conditional disassembly/replacement and post-maintenance verification. Actual source observations can be expanded. Zero readings are preserved. Numeric limits, units, part numbers, disassembly sequences and service intervals are not invented: the supplied registry has no equipment manuals or validated defect thresholds. Equipment-specific repair procedures require those documents and specialist approval. The checklist is deterministic and versioned as condition-guidance-1; it does not call an external language model.

## Repair drafts

Dispatchers/admins can generate and edit a local work-order draft from the detailed recommendation, save it and download UTF-8 TXT. The draft includes source observations, evidence timestamp, rule version, checks, possible maintenance and fields for assignee, deadline, materials and authorization. PostgreSQL stores the edited text, author and creation time. The latest 50 saved drafts remain accessible. Analysts can read and download saved drafts but cannot create them. No external assignment, repair submission or equipment command occurs.

## Decision and resolution history

Explicit actions include site visit, completed inspection, monitoring, scheduled preventive maintenance, confirmed incident, false positive, completed repair and other outcomes. Each action stores the actor, time, reason and comment. Completed inspection/repair and other outcomes require a nonblank result comment; comments start empty rather than claiming work was performed. Object details show the action history and registration button; the journal renders readable action/reason labels.

Intermediate decisions use IN_PROGRESS; confirmation uses CONFIRMED and remains actionable; completed repair uses RESOLVED; false positive uses FALSE_POSITIVE. Resolved and false-positive incidents reject further actions. Unresolved confirmed incidents remain visible in risk evaluation and prevent duplicate active incidents from inference.

## Verification and limits

An isolated moscollector_acceptance database holds all synthetic fixtures and test decisions/drafts. Browser checks used 3,000 generated located objects plus existing acceptance fixtures. Verified tag search, centering/highlight, popup probability/detail navigation, heat rendering, red/yellow/green filters (1,000 fixture objects per class), water-category filtering, monitoring outcome persistence and edited repair-draft persistence with author. The real registry was not populated with synthetic coordinates.

Regression coverage verifies search fields and coordinates, current/stale/missing maintenance evidence, zero-valued readings, action history and terminal states, draft validation/persistence/role enforcement, source metadata and existing ingestion/inference flows. Client lint/build and server compilation are required before delivery.

The browser still downloads registry metadata and scans points locally. This test is not a production scalability certification. For substantially larger fleets, introduce server-side bounding-box queries/search and indexed spatial aggregation, with a customer workload benchmark. Canvas rendering and viewport clustering reduce displayed elements without claiming unlimited capacity.

## Deployment

Apply Prisma migration 202609280002_maintenance_workflow and regenerate Prisma Client before starting the backend. It adds RESOLVED and RepairDraft; it does not rewrite telemetry or existing decisions. The migration was applied to the local main and acceptance databases. A pre-migration main database dump is preserved under output/verification/before-maintenance-20260928.dump (ignored by Git). Use the existing deployment and backup procedures for other environments.
