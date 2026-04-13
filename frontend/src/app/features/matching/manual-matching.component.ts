import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchingService } from '../../core/services/matching.service';
import { NotificationService } from '../../core/services/notification.service';
import { IngredientInputComponent } from '../../shared/components/ingredient-input/ingredient-input.component';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card.component';
import type { MatchResult } from '../../core/services/matching.service';
import type { IngredientSearchResult } from '../../core/models/ingredient.model';
import type { RecipeListItem } from '../../core/models/recipe.model';

@Component({
  selector: 'app-manual-matching',
  standalone: true,
  imports: [CommonModule, IngredientInputComponent, RecipeCardComponent],
  templateUrl: './manual-matching.component.html',
  styleUrl: './manual-matching.component.scss',
})
export class ManualMatchingComponent {
  private readonly matchingService = inject(MatchingService);
  private readonly notifications = inject(NotificationService);

  selectedIngredients = signal<IngredientSearchResult[]>([]);
  results = signal<MatchResult[]>([]);
  loading = signal(false);

  addIngredient(ingredient: IngredientSearchResult): void {
    if (this.selectedIngredients().some(i => i.id === ingredient.id)) return;
    this.selectedIngredients.update(list => [...list, ingredient]);
    this.search();
  }

  removeIngredient(id: string): void {
    this.selectedIngredients.update(list => list.filter(i => i.id !== id));
    if (this.selectedIngredients().length > 0) this.search();
    else this.results.set([]);
  }

  search(): void {
    const ids = this.selectedIngredients().map(i => i.id);
    if (!ids.length) return;
    this.loading.set(true);
    this.matchingService.match(ids).subscribe({
      next: res => { this.results.set(res); this.loading.set(false); },
      error: () => { this.notifications.error('Erreur lors de la recherche.'); this.loading.set(false); },
    });
  }

  recipeAsListItem(r: MatchResult): RecipeListItem {
    return r.recipe as unknown as RecipeListItem;
  }
}
