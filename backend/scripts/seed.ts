/**
 * Seed the ingredients_reference table with ~200 common French ingredients.
 * Safe to run multiple times — uses INSERT OR IGNORE.
 * Usage: npm run seed
 */
import 'dotenv/config';
import { sql } from 'kysely';
import { db } from '../src/db/database.js';
import { SEED_INGREDIENTS } from '../src/db/seeds/ingredients.js';

async function seed() {
  console.log(`Seeding ${SEED_INGREDIENTS.length} ingredients...`);

  let inserted = 0;
  let skipped = 0;

  for (const ingredient of SEED_INGREDIENTS) {
    try {
      // INSERT OR IGNORE to be idempotent
      await sql`
        INSERT OR IGNORE INTO ingredients_reference (nom_canonique, synonymes, categorie)
        VALUES (${ingredient.nom_canonique}, ${JSON.stringify(ingredient.synonymes)}, ${ingredient.categorie})
      `.execute(db);
      inserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped.`);
  await db.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
