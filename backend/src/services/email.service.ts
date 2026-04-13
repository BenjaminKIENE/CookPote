import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ── Test token store (only used when NODE_ENV !== 'production') ────────────
// Allows E2E / integration tests to retrieve tokens without real SMTP.
export const _testTokenStore = {
  lastVerificationToken: null as string | null,
  lastResetToken: null as string | null,
};

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  // Force AUTH LOGIN — Hostinger rejects AUTH PLAIN on some plans
  authMethod: 'LOGIN',
} as Parameters<typeof nodemailer.createTransport>[0]);

// ── HTML template helpers ──────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #FFFDF8; margin: 0; padding: 0; color: #2C2418; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; border: 1px solid #E8E0D0; overflow: hidden; }
    .header { background: #C8603A; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .body { padding: 32px; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #C8603A; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0; }
    .footer { padding: 16px 32px; background: #F5F0E8; font-size: 12px; color: #9B8E78; }
    .code { font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #C8603A; background: #F5E8E3; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>🍲 Cookpote</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Tu reçois cet email car tu as un compte Cookpote. Ne réponds pas à cet email.</div>
  </div>
</body>
</html>`;
}

// ── Send helpers ───────────────────────────────────────────────────────────

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send(opts: SendOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    logger.info({ to: opts.to, subject: opts.subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, 'Failed to send email');
    // In development, swallow email errors so the server remains usable without SMTP.
    // The plaintext fallback is logged above for manual testing.
    if (env.NODE_ENV !== 'production') return;
    throw err;
  }
}

// ── Public methods ─────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, pseudo: string, token: string): Promise<void> {
  const url = `${env.APP_URL}/verify-email?token=${token}`;
  if (env.NODE_ENV !== 'production') {
    logger.info({ url }, '📧 [DEV] Verification URL (use this to verify email manually)');
    _testTokenStore.lastVerificationToken = token;
  }
  const html = baseTemplate(`
    <p>Salut ${pseudo} 👋</p>
    <p>Merci de t'être inscrit sur Cookpote ! Pour activer ton compte, clique sur le bouton ci-dessous :</p>
    <p><a href="${url}" class="btn">Confirmer mon email</a></p>
    <p>Ce lien expire dans <strong>24 heures</strong>. Si tu n'as pas créé de compte, ignore cet email.</p>
  `);
  const text = `Salut ${pseudo},\n\nConfirme ton email en visitant ce lien (valable 24h) :\n${url}\n\nSi tu n'as pas créé de compte, ignore cet email.`;

  await send({ to, subject: 'Confirme ton adresse email — Cookpote', html, text });
}

export async function sendPasswordResetEmail(to: string, pseudo: string, token: string): Promise<void> {
  const url = `${env.APP_URL}/reset-password?token=${token}`;
  if (env.NODE_ENV !== 'production') {
    logger.info({ url }, '📧 [DEV] Password reset URL (use this to reset password manually)');
    _testTokenStore.lastResetToken = token;
  }
  const html = baseTemplate(`
    <p>Salut ${pseudo},</p>
    <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous :</p>
    <p><a href="${url}" class="btn">Réinitialiser mon mot de passe</a></p>
    <p>Ce lien expire dans <strong>1 heure</strong>. Si tu n'as pas fait cette demande, ignore cet email — ton mot de passe reste inchangé.</p>
  `);
  const text = `Salut ${pseudo},\n\nRéinitialise ton mot de passe en visitant ce lien (valable 1h) :\n${url}\n\nSi tu n'as pas fait cette demande, ignore cet email.`;

  await send({ to, subject: 'Réinitialisation de ton mot de passe — Cookpote', html, text });
}

export async function sendSecurityAlertEmail(to: string, pseudo: string, event: 'password_changed' | '2fa_enabled' | '2fa_disabled'): Promise<void> {
  const messages: Record<typeof event, string> = {
    password_changed: 'Ton mot de passe a été modifié.',
    '2fa_enabled': 'La double authentification (2FA) a été activée sur ton compte.',
    '2fa_disabled': 'La double authentification (2FA) a été désactivée sur ton compte.',
  };

  const message = messages[event];
  const html = baseTemplate(`
    <p>Salut ${pseudo},</p>
    <p>⚠️ <strong>${message}</strong></p>
    <p>Si c'est bien toi, aucune action n'est nécessaire.</p>
    <p>Si tu n'es pas à l'origine de cette action, change ton mot de passe immédiatement et contacte-nous.</p>
  `);
  const text = `Salut ${pseudo},\n\n${message}\n\nSi ce n'est pas toi, change ton mot de passe immédiatement.`;

  await send({ to, subject: `Alerte de sécurité — Cookpote`, html, text });
}
