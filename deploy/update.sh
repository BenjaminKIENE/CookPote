#!/bin/bash
# ============================================================
# Cookpote — Deploy update script
# Called by GitHub Actions on tag push, or manually.
# Usage: bash deploy/update.sh [git-ref]
# ============================================================
set -euo pipefail

APP_DIR="/var/www/cookpote"
APP_USER="cookpote"
GIT_REF="${1:-main}"

echo "▶ Pulling $GIT_REF..."
cd "$APP_DIR"
git fetch --tags origin
git checkout "$GIT_REF"

echo "▶ Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev

echo "▶ Building backend..."
npm run build

echo "▶ Installing & building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "▶ Running migrations..."
cd "$APP_DIR/backend"
node dist/src/db/migrate.js

echo "▶ Setting permissions..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR/backend/dist"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist"

echo "▶ Restarting backend service..."
sudo systemctl restart cookpote-backend

echo "▶ Health check..."
sleep 3
curl -sf http://localhost:3000/health && echo " ✅ Backend healthy" || (echo "❌ Health check failed" && exit 1)

echo "✅ Deploy complete."
