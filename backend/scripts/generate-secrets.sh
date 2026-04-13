#!/usr/bin/env bash
# ============================================================
# generate-secrets.sh
# Generates a .env file with all required secrets.
# Run once on initial setup (local or VPS).
# Usage: bash scripts/generate-secrets.sh
#        bash scripts/generate-secrets.sh --prod   (adjusts defaults for prod)
# ============================================================

set -euo pipefail

PROD=false
[[ "${1:-}" == "--prod" ]] && PROD=true

TARGET=".env"
if [[ "$PROD" == "true" ]]; then
  TARGET=".env.prod"
fi

if [[ -f "$TARGET" ]]; then
  echo "⚠️  $TARGET already exists. Rename it first to avoid overwriting."
  exit 1
fi

gen() {
  openssl rand -base64 32
}

gen44() {
  # 33 bytes → 44 chars base64 (for AES-256 key: 32 bytes → 43-44 chars base64)
  openssl rand -base64 33 | tr -d '\n' | head -c 44
}

echo "Generating secrets..."

cat > "$TARGET" <<EOF
# ============================================================
# Cookpote Backend — Environment Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# !! NEVER commit this file !!
# ============================================================

NODE_ENV=$([ "$PROD" == "true" ] && echo "production" || echo "development")
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/cookpote.db

# JWT — rotate these to invalidate all sessions
JWT_ACCESS_SECRET=$(gen)
JWT_REFRESH_SECRET=$(gen)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# AES-256-GCM master key for TOTP secrets
# WARNING: rotating this key requires re-encrypting all TOTP secrets in the DB
ENCRYPTION_KEY=$(gen44)

# CSRF
CSRF_SECRET=$(gen)

# Anthropic API — never log, never expose to client
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME

# SMTP Hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@cookpote.fr
SMTP_PASS=REPLACE_ME
SMTP_FROM="Cookpote" <noreply@cookpote.fr>

# Storage
UPLOADS_PATH=./uploads

# App URLs
APP_URL=$([ "$PROD" == "true" ] && echo "https://cookpote.fr" || echo "http://localhost:4200")
API_URL=$([ "$PROD" == "true" ] && echo "https://cookpote.fr/api" || echo "http://localhost:3000")
EOF

chmod 600 "$TARGET"

echo ""
echo "✅ Generated $TARGET"
echo ""
echo "👉 Next steps:"
echo "   1. Fill in ANTHROPIC_API_KEY (get it at console.anthropic.com)"
echo "   2. Fill in SMTP_PASS (your Hostinger email password)"
echo "   3. If prod: set APP_URL and API_URL correctly"
echo ""
echo "⚠️  Rotation notes:"
echo "   - JWT_*_SECRET rotation: invalidates all active sessions (acceptable on leak)"
echo "   - ENCRYPTION_KEY rotation: requires re-encrypting all TOTP secrets in the DB (rare)"
