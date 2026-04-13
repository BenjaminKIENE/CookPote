import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Recipe } from '../models/recipe.model';

export interface ScanQuota {
  used: number;
  total: number;
  resetDate: string;
}

export interface ScanResult {
  detectedIngredients: string[];
  matchedIngredientIds: string[];
  recipes: Recipe[];
  quota: ScanQuota;
}

@Injectable({ providedIn: 'root' })
export class ScanFridgeService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/scan-fridge`;

  getQuota(): Observable<ScanQuota> {
    return this.http.get<ScanQuota>(`${this.api}/quota`);
  }

  scan(file: File): Observable<ScanResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ScanResult>(this.api, form);
  }
}
