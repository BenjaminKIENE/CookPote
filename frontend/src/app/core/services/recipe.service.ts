import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type {
  Recipe,
  RecipeListResponse,
  RecipeFormData,
  RecipeFilters,
} from '../models/recipe.model';

// Raw API response uses snake_case
interface ApiRecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  position: number;
}

interface ApiRecipe {
  id: string;
  user_id: string;
  author_pseudo: string;
  author_avatar_path: string | null;
  title: string;
  description: string | null;
  photo_path: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number;
  difficulty: string;
  category: string;
  visibility: string;
  tags: string;  // JSON string
  steps: string; // JSON string
  ingredients: ApiRecipeIngredient[];
  created_at: number;
  updated_at: number;
}

interface ApiListResponse {
  data: ApiRecipe[];
  nextCursor: string | null;
}

function mapRecipe(r: ApiRecipe): Recipe {
  return {
    id: r.id,
    userId: r.user_id,
    authorPseudo: r.author_pseudo,
    authorAvatarPath: r.author_avatar_path,
    title: r.title,
    description: r.description,
    photoPath: r.photo_path,
    prepTimeMin: r.prep_time_min,
    cookTimeMin: r.cook_time_min,
    servings: r.servings,
    difficulty: r.difficulty as any,
    category: r.category as any,
    visibility: r.visibility as any,
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
    steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
    ingredients: r.ingredients.map(i => ({
      id: i.id,
      ingredientId: i.ingredient_id,
      ingredientName: i.ingredient_name,
      quantity: i.quantity,
      unit: i.unit as any,
      note: i.note,
      position: i.position,
    })),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/recipes`;

  getPublicFeed(filters: RecipeFilters = {}): Observable<RecipeListResponse> {
    const params = this.buildParams(filters);
    return this.http.get<ApiListResponse>(this.api, { params }).pipe(
      map(res => ({ data: res.data.map(mapRecipe) as any, nextCursor: res.nextCursor })),
    );
  }

  getMyRecipes(filters: RecipeFilters = {}): Observable<RecipeListResponse> {
    const params = this.buildParams(filters);
    return this.http.get<ApiListResponse>(`${this.api}/my`, { params }).pipe(
      map(res => ({ data: res.data.map(mapRecipe) as any, nextCursor: res.nextCursor })),
    );
  }

  getById(id: string): Observable<Recipe> {
    return this.http.get<ApiRecipe>(`${this.api}/${id}`).pipe(map(mapRecipe));
  }

  create(data: RecipeFormData): Observable<Recipe> {
    return this.http.post<ApiRecipe>(this.api, data).pipe(map(mapRecipe));
  }

  update(id: string, data: Partial<RecipeFormData>): Observable<Recipe> {
    return this.http.patch<ApiRecipe>(`${this.api}/${id}`, data).pipe(map(mapRecipe));
  }

  uploadPhoto(id: string, file: File): Observable<Recipe> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiRecipe>(`${this.api}/${id}/photo`, form).pipe(map(mapRecipe));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  private buildParams(filters: RecipeFilters): HttpParams {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
    if (filters.maxTotalTimeMin) params = params.set('maxTotalTimeMin', String(filters.maxTotalTimeMin));
    if (filters.cursor) params = params.set('cursor', filters.cursor);
    return params;
  }
}
