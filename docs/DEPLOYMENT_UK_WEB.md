# uk-web.ru/moscow deployment

The application shares this host with an existing website. Nginx terminates HTTPS; only `/moscow` and `/moscow/` routes are added. The existing `/` and `/api/` routes remain intact.

- Release directory: `/opt/moscollector`.
- Static files: `/opt/moscollector/client/dist`, linked from `/var/www/moscow`.
- Build frontend with `VITE_BASE_PATH=/moscow/ npm run build`; router basename, API and asset URLs follow this base.
- API: systemd `moscollector-api`, Node 22, loopback port 15000.
- ML: systemd `moscollector-ml`, isolated Python environment, loopback port 18000, selected bundled model.
- PostgreSQL and Valkey: Docker Compose project `moscollector`, loopback ports 15432/16379 and separate database volume.
- Environment file: `/opt/moscollector/.env`, readable by root and the service group only. Cookie name `moscow_token`, path `/moscow`; Secure/HttpOnly/SameSite=Lax.
- Administrator credentials: `/root/moscollector-access.txt` (root-only). Do not commit credentials.
- Nginx location template: [nginx-subpath.conf](../deploy/nginx-subpath.conf).

Deployments must preserve the database volume and the existing nginx virtual host. Build locally to avoid compilation pressure on the 1 GB host. Apply Prisma migrations before restarting the API. Check `/moscow/api/health`, login, direct nested routes and the ML `/health` endpoint on loopback. A frontend rollback restores the previous dist directory; a backend rollback restores its previous release after checking migration compatibility.

Historical object/channel/telemetry/forecast records are imported from the project database. Local users, audit logs, repair drafts and test-only acceptance data are not imported. The interface continues to label historical data as stale; deployment does not simulate live telemetry.

This small shared server is for demonstration, not a production load guarantee. Monitor free disk and memory before adding datasets or simultaneous inference workloads.

## Verified on 29 September 2026

HTTPS login/logout, scoped secure cookie, unauthenticated access rejection, 95 objects, 46 incidents, forecast list, SSE connection and direct nested-page loading passed. The original site returned HTTP 200 and its four containers remained healthy. API, ML, database and cache listen on loopback only. Daily database backups use `moscollector-backup.timer`, retained for seven days in `/var/backups/moscollector`; the first backup completed. Nginx configuration was backed up before adding the include.

At completion the shared 15 GB filesystem had approximately 0.5 GB free. Increase disk space before importing additional history; the host has only 1 GB RAM plus swap. No production load capacity is claimed.

## Shared portal — 30 September 2026

`https://uk-web.ru/` now serves the project selector from `/var/www/hackathons`. Its exact button labels are «Хакатон MAX» and «Хакатон MOSCOW», pointing to `/max/` and `/moscow/`.

MAX static build is served through `/var/www/max` → `/opt/max-project/client/dist`. Its source has a Vite `/max/` base, prefixed API/asset paths, resident route handling, scoped service worker and PWA manifest. Build with Node 22 and `npm run build --workspace=frontend` from the MAX repository; replace this dist directory when deploying. The MAX API remains in its existing Docker container; `/max/api/` proxies to its internal `/api/` routes. Original `/api/` and cached asset URLs remain available for legacy integrations. Old root invitation links redirect to `/max/` while retaining the query. The root service worker unregisters itself; MAX registers `/max/sw.js`.

Before changing routes, nginx configuration, MAX client sources and the running client's files were backed up on the server. Existing uncommitted MAX changes were preserved. No application databases were reset. Verified both portal links in a browser, both login screens, MAX static assets/PWA, protected MAX API responses, legacy invitations, and MOSCOW health.

The OS still reported 1 vCPU, 1 GB RAM and a 15 GB disk at this deployment despite the requested provider upgrade. Confirm that the provider has applied the new resources. No server reboot was performed.
