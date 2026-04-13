import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_PATH: z.string().default('./data/cookpote.db'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Encryption (AES-256-GCM for TOTP secrets)
  ENCRYPTION_KEY: z.string().length(44), // base64-encoded 32 bytes

  // CSRF
  CSRF_SECRET: z.string().min(32),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

  // SMTP (Hostinger)
  SMTP_HOST: z.string().default('smtp.hostinger.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().default('"Cookpote" <noreply@cookpote.fr>'),

  // Storage
  UPLOADS_PATH: z.string().default('./uploads'),

  // App
  APP_URL: z.string().url().default('http://localhost:4200'),
  API_URL: z.string().url().default('http://localhost:3000'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
