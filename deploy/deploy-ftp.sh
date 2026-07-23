#!/usr/bin/env bash
# ============================================================
# Mozon Broast — FTP deploy to ServerByt / 20i StackCP
# Mirrors the built site to the live web root over FTP.
# Requires: lftp   (Linux/Mac: apt/brew install lftp)
#
# Usage:
#   FTP_HOST=ftp.us.mozonbroast.ae \
#   FTP_USER=mozonbroast.ae \
#   FTP_PASS='your-password' \
#   ./deploy/deploy-ftp.sh
#
# Optional overrides:
#   MAIN_REMOTE=/public_html
#   OFFERS_REMOTE=/public_html/offersmozon.ae   # or the subdomain's own web root
# ============================================================
set -euo pipefail

FTP_HOST="${FTP_HOST:?set FTP_HOST}"
FTP_USER="${FTP_USER:?set FTP_USER}"
FTP_PASS="${FTP_PASS:?set FTP_PASS}"
MAIN_REMOTE="${MAIN_REMOTE:-/public_html}"
OFFERS_REMOTE="${OFFERS_REMOTE:-/public_html/offersmozon.ae}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/website"
[ -f "$SRC/index.html" ] || { echo "ERROR: $SRC/index.html not found — run from repo root."; exit 1; }

# Stage the offers page as index.html for the subdomain
STAGE="$(mktemp -d)"
cp "$SRC/offers.html" "$STAGE/index.html"

echo "==> Deploying main site to $FTP_HOST:$MAIN_REMOTE"
lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
mirror -R --parallel=4 --verbose \
  --exclude-glob *.md \
  --exclude-glob dist/ \
  "$SRC/" "$MAIN_REMOTE/"
bye
EOF

echo "==> Deploying offers page to $FTP_HOST:$OFFERS_REMOTE"
lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
mkdir -p "$OFFERS_REMOTE"
put "$STAGE/index.html" -o "$OFFERS_REMOTE/index.html"
bye
EOF

rm -rf "$STAGE"
echo "==> Done. Visit https://mozonbroast.ae and click Order to test the offers page."
