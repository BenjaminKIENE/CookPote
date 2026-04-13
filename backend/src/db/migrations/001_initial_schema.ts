import type { Kysely } from 'kysely';
import { sql } from 'kysely';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // ── USERS ──────────────────────────────────────────────────────────────────
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('email', 'text', (col) => col.unique().notNull())
    .addColumn('email_normalized', 'text', (col) => col.unique().notNull())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('pseudo', 'text', (col) => col.unique().notNull())
    .addColumn('bio', 'text')
    .addColumn('avatar_path', 'text')
    .addColumn('email_verified', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('totp_enabled', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('totp_secret_enc', 'text')
    .addColumn('totp_secret_iv', 'text')
    .addColumn('role', 'text', (col) => col.notNull().defaultTo('user'))
    .addColumn('deleted_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_users_email_normalized ON users(email_normalized)`.execute(db);

  // ── EMAIL VERIFICATION TOKENS ──────────────────────────────────────────────
  await db.schema
    .createTable('email_verification_tokens')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('token_hash', 'text', (col) => col.unique().notNull())
    .addColumn('expires_at', 'integer', (col) => col.notNull())
    .addColumn('used_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  // ── REFRESH TOKENS ─────────────────────────────────────────────────────────
  await db.schema
    .createTable('refresh_tokens')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('token_hash', 'text', (col) => col.unique().notNull())
    .addColumn('family', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'integer', (col) => col.notNull())
    .addColumn('revoked_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family)`.execute(db);

  // ── PASSWORD RESET TOKENS ──────────────────────────────────────────────────
  await db.schema
    .createTable('password_reset_tokens')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('token_hash', 'text', (col) => col.unique().notNull())
    .addColumn('expires_at', 'integer', (col) => col.notNull())
    .addColumn('used_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  // ── AUDIT LOG ──────────────────────────────────────────────────────────────
  await db.schema
    .createTable('audit_log')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('ip', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('meta', 'text') // JSON blob, never secrets
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)`.execute(db);

  // ── INGREDIENTS REFERENCE ──────────────────────────────────────────────────
  await db.schema
    .createTable('ingredients_reference')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('nom_canonique', 'text', (col) => col.unique().notNull())
    .addColumn('synonymes', 'text', (col) => col.notNull().defaultTo(sql`'[]'`))
    .addColumn('categorie', 'text', (col) => col.notNull().defaultTo(sql`'autre'`))
    .addColumn('created_by', 'text', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_ingredients_nom ON ingredients_reference(nom_canonique COLLATE NOCASE)`.execute(db);

  // ── RECIPES ────────────────────────────────────────────────────────────────
  await db.schema
    .createTable('recipes')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('photo_path', 'text')
    .addColumn('prep_time_min', 'integer')
    .addColumn('cook_time_min', 'integer')
    .addColumn('servings', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('difficulty', 'text', (col) => col.notNull().defaultTo(sql`'moyen'`))
    .addColumn('category', 'text', (col) => col.notNull().defaultTo(sql`'autre'`))
    .addColumn('visibility', 'text', (col) => col.notNull().defaultTo(sql`'private'`))
    .addColumn('tags', 'text', (col) => col.notNull().defaultTo(sql`'[]'`))
    .addColumn('steps', 'text', (col) => col.notNull().defaultTo(sql`'[]'`))
    .addColumn('deleted_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .addColumn('updated_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_visibility ON recipes(visibility)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC)`.execute(db);

  // ── RECIPE INGREDIENTS ─────────────────────────────────────────────────────
  await db.schema
    .createTable('recipe_ingredients')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('recipe_id', 'text', (col) =>
      col.notNull().references('recipes.id').onDelete('cascade'),
    )
    .addColumn('ingredient_id', 'text', (col) =>
      // RESTRICT: do not delete reference ingredients still used in recipes
      col.notNull().references('ingredients_reference.id').onDelete('restrict'),
    )
    .addColumn('quantity', 'real')
    .addColumn('unit', 'text')
    .addColumn('note', 'text')
    .addColumn('position', 'integer', (col) => col.notNull().defaultTo(0))
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id)`.execute(db);

  // ── USAGE QUOTAS (Scan Frigo) ──────────────────────────────────────────────
  await db.schema
    .createTable('usage_quotas')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) =>
      col.unique().notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('scan_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('reset_date', 'text', (col) => col.notNull()) // YYYY-MM-DD UTC
    .execute();

  // ── AI USAGE LOG ───────────────────────────────────────────────────────────
  await db.schema
    .createTable('ai_usage_log')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('call_type', 'text', (col) => col.notNull())
    .addColumn('ingredients_count', 'integer')
    .addColumn('input_tokens', 'integer')
    .addColumn('output_tokens', 'integer')
    .addColumn('duration_ms', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_log(user_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_log(created_at DESC)`.execute(db);

  // ── V2 TABLES (schema only — no endpoints in V1) ───────────────────────────
  await db.schema
    .createTable('follows')
    .ifNotExists()
    .addColumn('follower_id', 'text', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('following_id', 'text', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_pk ON follows(follower_id, following_id)`.execute(db);

  await db.schema
    .createTable('likes')
    .ifNotExists()
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('recipe_id', 'text', (col) =>
      col.notNull().references('recipes.id').onDelete('cascade'),
    )
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_pk ON likes(user_id, recipe_id)`.execute(db);

  await db.schema
    .createTable('comments')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`(lower(hex(randomblob(16))))`))
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('recipe_id', 'text', (col) =>
      col.notNull().references('recipes.id').onDelete('cascade'),
    )
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('deleted_at', 'integer')
    .addColumn('created_at', 'integer', (col) =>
      col.notNull().defaultTo(sql`(unixepoch('now') * 1000)`),
    )
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_comments_recipe ON comments(recipe_id)`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // Drop in reverse order of creation (respect FK dependencies)
  const tables = [
    'comments',
    'likes',
    'follows',
    'ai_usage_log',
    'usage_quotas',
    'recipe_ingredients',
    'recipes',
    'ingredients_reference',
    'audit_log',
    'password_reset_tokens',
    'refresh_tokens',
    'email_verification_tokens',
    'users',
  ];

  for (const table of tables) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
