import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IngredientSearchResult } from '../models/ingredient.model';

export type IngredientCategory =
  | 'legume' | 'fruit' | 'viande' | 'poisson' | 'produit_laitier'
  | 'cereale' | 'legumineuse' | 'aromate' | 'epice' | 'matiere_grasse'
  | 'condiment' | 'boisson' | 'autre';

export interface CreateIngredientPayload {
  nomCanonique: string;
  categorie: IngredientCategory;
}

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/ingredients`;

  search(q: string, limit = 10): Observable<IngredientSearchResult[]> {
    const params = new HttpParams().set('q', q).set('limit', String(limit));
    return this.http.get<IngredientSearchResult[]>(`${this.api}/search`, { params });
  }

  create(payload: CreateIngredientPayload): Observable<IngredientSearchResult> {
    return this.http.post<IngredientSearchResult>(this.api, payload);
  }
}
