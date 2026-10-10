#!/bin/sh
set -e
mkdir -p /data
# Named volume is often root-owned on first start; fix when we are root.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data 2>/dev/null || true
  if command -v setpriv >/dev/null 2>&1; then
    exec setpriv --reuid=node --regid=node --init-groups -- "$@"
  fi
fi
exec "$@"
