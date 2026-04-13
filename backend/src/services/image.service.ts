import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateId } from '../utils/tokens.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── MIME detection via magic bytes ────────────────────────────────────────

async function detectMime(buffer: Buffer): Promise<string | undefined> {
  // Dynamic import — file-type is ESM-only
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime;
}

// ── Recipe image: resize + WebP + save to disk ────────────────────────────

export async function processAndSaveRecipeImage(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_BYTES) {
    throw Object.assign(new Error('Image trop volumineuse (max 5 Mo).'), { statusCode: 413 });
  }

  const mime = await detectMime(buffer);
  if (!mime || !ALLOWED_MIME_TYPES.includes(mime)) {
    throw Object.assign(new Error('Format non supporté. Utilise JPEG, PNG ou WebP.'), { statusCode: 415 });
  }

  const webpBuffer = await sharp(buffer)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `${generateId()}.webp`;
  const uploadsDir = path.resolve(env.UPLOADS_PATH);
  const filePath = path.join(uploadsDir, filename);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, webpBuffer);

  logger.debug({ filename, originalSize: buffer.byteLength, newSize: webpBuffer.byteLength }, 'Recipe image saved');

  // Return relative path stored in DB (served via /uploads/:filename)
  return filename;
}

// ── Scan fridge image: resize in memory only, never write to disk ─────────

export async function processScanFridgeImage(buffer: Buffer): Promise<Buffer> {
  if (buffer.byteLength > MAX_BYTES) {
    throw Object.assign(new Error('Image trop volumineuse (max 5 Mo).'), { statusCode: 413 });
  }

  const mime = await detectMime(buffer);
  if (!mime || !ALLOWED_MIME_TYPES.includes(mime)) {
    throw Object.assign(new Error('Format non supporté. Utilise JPEG, PNG ou WebP.'), { statusCode: 415 });
  }

  // Resize to 1024px max, keep original format for Anthropic API
  return sharp(buffer)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// ── Delete a recipe image file ─────────────────────────────────────────────

export async function deleteRecipeImage(filename: string): Promise<void> {
  if (!filename) return;
  // Prevent path traversal
  const safe = path.basename(filename);
  const filePath = path.join(path.resolve(env.UPLOADS_PATH), safe);
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn({ filename, err }, 'Failed to delete image file');
    }
  }
}
