#!/bin/sh
set -e
mkdir -p /data
# Volume may be root-owned on first mount; fix when running as root
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data 2>/dev/null || true
  exec su-exec node "$@"
fi
exec "$@"
