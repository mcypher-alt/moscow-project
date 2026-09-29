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
