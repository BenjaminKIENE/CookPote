/**
 * Kysely database type definitions.
 * Generated<T> marks columns with SQLite DEFAULT values — optional on INSERT.
 * Timestamps are INTEGER (Unix ms). Booleans are 0|1.
 */
import type { Generated } from 'kysely';

export interface UsersTable {
  id: Generated<string>;
  email: string;
  email_normalized: string;
  password_hash: string;
  pseudo: string;
  bio: string | null;
  avatar_path: string | null;
  email_verified: Generated<0 | 1>;
  totp_enabled: Generated<0 | 1>;
  totp_secret_enc: string | null;
  totp_secret_iv: string | null;
  role: Generated<'user' | 'admin'>;
  deleted_at: number | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface EmailVerificationTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  created_at: Generated<number>;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  family: string;
  expires_at: number;
  revoked_at: number | null;
  created_at: Generated<number>;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  created_at: Generated<number>;
}

export interface AuditLogTable {
  id: Generated<string>;
  user_id: string | null;
  action: string;
  ip: string | null;
  user_agent: string | null;
  meta: string | null;
  created_at: Generated<number>;
}

export interface IngredientsReferenceTable {
  id: Generated<string>;
  nom_canonique: string;
  synonymes: Generated<string>;
  categorie: Generated<'legume' | 'fruit' | 'viande' | 'poisson' | 'laitier' | 'feculent' | 'epice' | 'condiment' | 'autre'>;
  created_by: string | null;
  created_at: Generated<number>;
}

export interface RecipesTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  description: string | null;
  photo_path: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: Generated<number>;
  difficulty: Generated<'facile' | 'moyen' | 'difficile'>;
  category: Generated<'entree' | 'plat' | 'dessert' | 'aperitif' | 'boisson' | 'autre'>;
  visibility: Generated<'private' | 'friends' | 'public'>;
  tags: Generated<string>;
  steps: Generated<string>;
  deleted_at: number | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
}

export interface RecipeIngredientsTable {
  id: Generated<string>;
  recipe_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'cac' | 'cas' | 'piece' | 'pincee' | 'agout' | null;
  note: string | null;
  position: Generated<number>;
}

export interface UsageQuotasTable {
  id: Generated<string>;
  user_id: string;
  scan_count: Generated<number>;
  reset_date: string;
}

export interface AiUsageLogTable {
  id: Generated<string>;
  user_id: string | null;
  call_type: 'vision' | 'substitution';
  ingredients_count: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  created_at: Generated<number>;
}

export interface FollowsTable {
  follower_id: string;
  following_id: string;
  created_at: Generated<number>;
}

export interface LikesTable {
  user_id: string;
  recipe_id: string;
  created_at: Generated<number>;
}

export interface CommentsTable {
  id: Generated<string>;
  user_id: string;
  recipe_id: string;
  content: string;
  deleted_at: number | null;
  created_at: Generated<number>;
}

export interface DB {
  users: UsersTable;
  email_verification_tokens: EmailVerificationTokensTable;
  refresh_tokens: RefreshTokensTable;
  password_reset_tokens: PasswordResetTokensTable;
  audit_log: AuditLogTable;
  ingredients_reference: IngredientsReferenceTable;
  recipes: RecipesTable;
  recipe_ingredients: RecipeIngredientsTable;
  usage_quotas: UsageQuotasTable;
  ai_usage_log: AiUsageLogTable;
  follows: FollowsTable;
  likes: LikesTable;
  comments: CommentsTable;
}
