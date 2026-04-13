import Anthropic from '@anthropic-ai/sdk';
import { db, sqlite } from '../db/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as ingredientService from './ingredient.service.js';
import * as recipeService from './recipe.service.js';
import type { RecipeRow } from './recipe.service.js';

const SCAN_QUOTA = 10; // scans per month per user
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ── Quota helpers ──────────────────────────────────────────────────────────

function getCurrentResetDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function getQuota(userId: string): Promise<{ used: number; total: number; resetDate: string }> {
  const resetDate = getCurrentResetDate();

  const quota = await db.selectFrom('usage_quotas')
    .selectAll()
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!quota || quota.reset_date !== resetDate) {
    // Reset or create
    if (!quota) {
      await db.insertInto('usage_quotas')
        .values({ user_id: userId, scan_count: 0, reset_date: resetDate })
        .execute();
    } else {
      await db.updateTable('usage_quotas')
        .set({ scan_count: 0, reset_date: resetDate })
        .where('user_id', '=', userId)
        .execute();
    }
    return { used: 0, total: SCAN_QUOTA, resetDate };
  }

  return { used: quota.scan_count, total: SCAN_QUOTA, resetDate };
}

async function incrementQuota(userId: string): Promise<void> {
  const resetDate = getCurrentResetDate();
  await db.updateTable('usage_quotas')
    .set(eb => ({ scan_count: eb('scan_count', '+', 1) }))
    .where('user_id', '=', userId)
    .where('reset_date', '=', resetDate)
    .execute();
}

// ── Vision prompt ──────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `Tu es un assistant culinaire expert en identification d'ingrédients alimentaires.
Analyse l'image du réfrigérateur/placard fournie et identifie tous les ingrédients visibles.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.
Format exact attendu:
{
  "ingredients": ["ingrédient1", "ingrédient2", ...]
}
Règles:
- Liste uniquement les ingrédients alimentaires identifiables
- Utilise les noms en français, au singulier, en minuscules
- Si tu n'es pas sûr, ne l'inclus pas
- Maximum 30 ingrédients
- Ne liste pas les emballages ou récipients vides`;

// ── Main scan function ─────────────────────────────────────────────────────

export interface ScanResult {
  detectedIngredients: string[];
  matchedIngredientIds: string[];
  recipes: RecipeRow[];
  quota: { used: number; total: number; resetDate: string };
}

export async function scanFridge(userId: string, imageBuffer: Buffer): Promise<ScanResult> {
  const quota = await getQuota(userId);

  if (quota.used >= quota.total) {
    throw Object.assign(
      new Error(`Quota de scans atteint (${quota.total}/mois). Réinitialisation le ${quota.resetDate}.`),
      { statusCode: 429 },
    );
  }

  const start = Date.now();

  // Call Anthropic Vision API
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // processScanFridgeImage always outputs JPEG

  let detectedNames: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: VISION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Image },
        }, {
          type: 'text',
          text: 'Identifie tous les ingrédients visibles dans cette image.',
        }],
      }],
    });

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Parse JSON response — strip markdown fences if present
    const jsonStr = content.text.replace(/```(?:json)?\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    detectedNames = Array.isArray(parsed.ingredients) ? parsed.ingredients.slice(0, 30) : [];
  } catch (err) {
    logger.error({ err, userId }, 'Anthropic vision call failed');
    throw Object.assign(new Error('Analyse de l\'image échouée. Réessaie avec une photo plus nette.'), { statusCode: 503 });
  }

  const duration = Date.now() - start;

  // Log AI usage
  await db.insertInto('ai_usage_log').values({
    user_id: userId,
    call_type: 'vision',
    ingredients_count: detectedNames.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    duration_ms: duration,
  }).execute();

  // Increment quota
  await incrementQuota(userId);

  // Match detected names against ingredients_reference
  const allIngredients = await ingredientService.listAll();
  const matchedIds: string[] = [];

  for (const name of detectedNames) {
    const normalized = name.toLowerCase().trim();
    // Exact match first
    let match = allIngredients.find(i => i.nom_canonique === normalized);
    if (!match) {
      // Synonym match
      match = allIngredients.find(i => {
        try {
          const synonymes: string[] = JSON.parse(i.synonymes);
          return synonymes.some(s => s.toLowerCase() === normalized);
        } catch { return false; }
      });
    }
    if (match && !matchedIds.includes(match.id)) {
      matchedIds.push(match.id);
    }
  }

  // Find matching recipes
  let recipes: RecipeRow[] = [];
  if (matchedIds.length > 0) {
    const result = await recipeService.getPublicFeed({ ingredientIds: matchedIds });
    recipes = result.data;
  }

  const updatedQuota = await getQuota(userId);

  return {
    detectedIngredients: detectedNames,
    matchedIngredientIds: matchedIds,
    recipes,
    quota: updatedQuota,
  };
}
