#!/usr/bin/env sh
# Restore SQLite from a backup directory created by backup-data.sh
# Usage: ./scripts/restore-data.sh ./backups/20260101T120000Z
set -eu

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -f "$SRC/app.db" ]; then
  echo "Usage: $0 <backup-dir-with-app.db>" >&2
  exit 1
fi

COMPOSE="${COMPOSE:-docker compose}"

echo "Stopping app ..."
$COMPOSE stop app

echo "Restoring app.db (and ha-config if present) ..."
$COMPOSE run --rm --no-deps \
  -v "$(cd "$SRC" && pwd):/backup:ro" \
  app \
  node -e "
const fs = require('fs');
fs.copyFileSync('/backup/app.db', '/data/app.db');
if (fs.existsSync('/backup/ha-config.json')) {
  fs.copyFileSync('/backup/ha-config.json', '/data/ha-config.json');
}
console.log('restore ok');
"

echo "Starting app ..."
$COMPOSE start app
echo "Done. Verify Admin + Display over HTTPS."
