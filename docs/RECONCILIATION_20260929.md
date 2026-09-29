# Reconciliation — 29 September 2026

Integrated origin/master through f8d0956, preserving real object loading and object-to-incident navigation. Both map selection and object details link to the dashboard with the object name, an exact object ID, and the incidents anchor. The journal includes open incidents, highlights matching rows, focuses search after loading, and supports status/date filtering. The existing structured decision workflow supplies resolution choices and validates reason codes.

Preserved local ML inference, maintenance instructions, repair drafts, map search/heat/clustering, freshness checks, authentication and read-only analyst permissions. No synthetic map coordinates are generated. No synthetic Redis seed runs as part of seed:all.

Frontend: Moscollector branding; «Центр предиктивной аналитики»; «Обзор»; Russian roles, object types, modal controls and map zoom labels; «Принять в работу» replaces «Квитировать». Long incident labels and action buttons wrap; native dark-mode options remain readable; the map stays below the sticky header.

The selected model bundle is versioned in models/refined_24h. Python LF rules preserve its feature-code checksum across Windows checkouts. Raw datasets, full chat exports, credentials and personal-contact presentation outputs remain local.

Validation: client lint/build and server build; 5 TypeScript tests; 13 Python tests including model loading; isolated database acceptance suite including exact object search, open incidents, analyst permissions, real inference, decision tracking, drafts, imports and 20 readers/SSE clients. Measured acceptance inference: 72 ms; 20 object reads: 1363 ms on the small fixture. Browser verified branding and object-details navigation/search focus. Vite still warns about bundle size and future config-loader compatibility; these are non-blocking build warnings.
