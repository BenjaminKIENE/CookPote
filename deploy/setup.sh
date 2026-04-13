#!/bin/bash
# ============================================================
# Cookpote — VPS one-time setup script
# Ubuntu 24.04 · Run as root or with sudo
# Usage: sudo bash deploy/setup.sh
# ============================================================
set -euo pipefail

APP_DIR="/var/www/cookpote"
APP_USER="cookpote"
LOG_DIR="/var/log/cookpote"
REPO_URL="https://github.com/TON_USERNAME/cookpote.git"  # ← à modifier

echo "════════════════════════════════════════"
echo " Cookpote — Setup VPS"
echo "════════════════════════════════════════"

# ── 1. Node.js 22 (via NodeSource) ───────────────────────────
echo "▶ Installing Node.js 22..."
if ! node --version 2>/dev/null | grep -q "^v22"; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node --version)  npm: $(npm --version)"

# ── 2. System dependencies ───────────────────────────────────
echo "▶ Installing system packages..."
apt-get install -y git curl build-essential

# ── 3. Create dedicated user ─────────────────────────────────
echo "▶ Creating system user '$APP_USER'..."
id "$APP_USER" &>/dev/null || useradd --system --shell /usr/sbin/nologin --home "$APP_DIR" "$APP_USER"

# ── 4. Create directories ────────────────────────────────────
echo "▶ Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/backend/data"
mkdir -p "$APP_DIR/backend/uploads"
mkdir -p "$LOG_DIR"
touch "$APP_DIR/backend/uploads/.gitkeep"

# ── 5. Clone repository ──────────────────────────────────────
echo "▶ Cloning repository..."
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "  Repo already cloned, skipping."
fi

# ── 6. Install dependencies & build ──────────────────────────
echo "▶ Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev
npm run build

echo "▶ Installing & building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# ── 7. Run migrations ────────────────────────────────────────
echo "▶ Running database migrations..."
cd "$APP_DIR/backend"
node dist/src/db/migrate.js

# ── 8. Set permissions ───────────────────────────────────────
echo "▶ Setting permissions..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
chmod 750 "$APP_DIR/backend/data"
chmod 755 "$APP_DIR/backend/uploads"

# ── 9. systemd service ───────────────────────────────────────
echo "▶ Installing systemd service..."
cp "$APP_DIR/deploy/cookpote-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable cookpote-backend
systemctl restart cookpote-backend
echo "  Service status: $(systemctl is-active cookpote-backend)"

# ── 10. Nginx vhost ──────────────────────────────────────────
echo "▶ Installing Nginx config..."
cp "$APP_DIR/deploy/nginx-cookpote.conf" /etc/nginx/sites-available/cookpote
ln -sf /etc/nginx/sites-available/cookpote /etc/nginx/sites-enabled/cookpote
nginx -t && systemctl reload nginx

# ── 11. logrotate ────────────────────────────────────────────
echo "▶ Installing logrotate config..."
cp "$APP_DIR/deploy/logrotate-cookpote" /etc/logrotate.d/cookpote

echo ""
echo "════════════════════════════════════════"
echo " ✅  Setup complete!"
echo ""
echo " Next steps:"
echo "   1. Copy your .env to $APP_DIR/backend/.env"
echo "      (use deploy/env.production.example as template)"
echo "   2. systemctl restart cookpote-backend"
echo "   3. curl https://cookpote.fr/health"
echo "════════════════════════════════════════"
