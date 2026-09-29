#!/bin/sh
set -eu
umask 077
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  pg_dump -Fc -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "/backups/$stamp.dump.partial"
  mv "/backups/$stamp.dump.partial" "/backups/$stamp.dump"
  echo "Backup completed: $stamp"
  sleep 86400
done
