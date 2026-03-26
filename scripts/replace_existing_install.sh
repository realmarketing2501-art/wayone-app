#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-/home/ubuntu/wayone-app/wayone-production}"
WEB_ROOT="${2:-/var/www/wayone/frontend}"
DB_URL="${DATABASE_URL:-postgresql://wayone:wayone123@127.0.0.1:5432/wayone_db}"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "[ERR] Project dir not found: $PROJECT_DIR"
  exit 1
fi

echo "[1/8] Running DB migration"
psql "$DB_URL" -f "$PROJECT_DIR/MIGRATION_FROM_V1.sql"

echo "[2/8] Backend install"
cd "$PROJECT_DIR/backend"
npm install

echo "[3/8] Backend build"
npm run build

echo "[4/8] Frontend install"
cd "$PROJECT_DIR/frontend"
npm install

echo "[5/8] Frontend build"
npm run build

echo "[6/8] Publish frontend dist"
sudo mkdir -p "$WEB_ROOT"
sudo rm -rf "$WEB_ROOT/dist"
sudo cp -r dist "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo chmod -R 755 "$WEB_ROOT"

echo "[7/8] Restart backend"
cd "$PROJECT_DIR"
if [ -f ecosystem.config.cjs ]; then
  pm2 startOrRestart ecosystem.config.cjs --env production || pm2 restart wayone-api || true
else
  pm2 restart wayone-api || true
fi
pm2 save || true

echo "[8/8] Reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[DONE] Quick checks:"
curl -s http://127.0.0.1/api/health || true
echo
