import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Recipe } from '../models/recipe.model';

export interface MatchResult {
  recipe: Recipe;
  score: number;
  matchedCount: number;
  totalCount: number;
  missingIngredients: string[];
}

@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/matching`;

  match(ingredientIds: string[]): Observable<MatchResult[]> {
    return this.http.post<MatchResult[]>(this.api, { ingredientIds });
  }
}
