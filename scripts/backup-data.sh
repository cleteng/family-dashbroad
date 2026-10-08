#!/usr/bin/env sh
# Backup SQLite (+ optional ha-config) from the running compose volume.
# Does not print secrets. Run on the VPS from the project directory.
#
# Usage:
#   ./scripts/backup-data.sh [backup-dir]
# Default backup-dir: ./backups

set -eu

BACKUP_ROOT="${1:-./backups}"
STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
DEST="${BACKUP_ROOT}/${STAMP}"
mkdir -p "$DEST"

COMPOSE="${COMPOSE:-docker compose}"

echo "Backing up to ${DEST} ..."

# Prefer sqlite online backup via a one-off container sharing the volume
$COMPOSE run --rm --no-deps \
  -v "$(pwd)/${DEST}:/backup" \
  app \
  node -e "
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const src = process.env.DATABASE_URL?.replace(/^file:/,'') || '/data/app.db';
const dest = '/backup/app.db';
try {
  const db = new Database(src, { readonly: true, fileMustExist: true });
  db.backup(dest);
  db.close();
  console.log('sqlite backup ok');
} catch (e) {
  // Fallback: copy file (safe if app briefly quiet)
  fs.copyFileSync(src, dest);
  console.log('sqlite copy ok');
}
const ha = '/data/ha-config.json';
if (fs.existsSync(ha)) {
  fs.copyFileSync(ha, '/backup/ha-config.json');
  console.log('ha-config copied');
}
"

# Strip any accidental env dumps — only list filenames
echo "Backup complete. Files:"
ls -la "$DEST"
echo "Suggested retention: keep daily copies for 7–14 days off-server."
