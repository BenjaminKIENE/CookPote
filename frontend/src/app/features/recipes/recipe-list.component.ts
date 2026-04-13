import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecipeService } from '../../core/services/recipe.service';
import { NotificationService } from '../../core/services/notification.service';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card.component';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import type { RecipeListItem, RecipeFilters } from '../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RecipeCardComponent, InfiniteScrollComponent],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.scss',
})
export class RecipeListComponent implements OnInit {
  private readonly recipeService = inject(RecipeService);
  private readonly notifications = inject(NotificationService);

  recipes = signal<RecipeListItem[]>([]);
  loading = signal(false);
  nextCursor = signal<string | null>(null);
  q = '';

  ngOnInit(): void { this.load(true); }

  load(reset = false): void {
    if (this.loading()) return;
    if (!reset && !this.nextCursor()) return;
    this.loading.set(true);
    if (reset) { this.recipes.set([]); this.nextCursor.set(null); }

    const filters: RecipeFilters = {
      q: this.q || undefined,
      cursor: reset ? undefined : (this.nextCursor() ?? undefined),
    };

    this.recipeService.getMyRecipes(filters).subscribe({
      next: res => {
        this.recipes.update(prev => [...prev, ...res.data]);
        this.nextCursor.set(res.nextCursor);
        this.loading.set(false);
      },
      error: () => { this.notifications.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  delete(id: string): void {
    if (!confirm('Supprimer cette recette ?')) return;
    this.recipeService.delete(id).subscribe({
      next: () => {
        this.recipes.update(prev => prev.filter(r => r.id !== id));
        this.notifications.success('Recette supprimée.');
      },
      error: () => this.notifications.error('Erreur lors de la suppression.'),
    });
  }
}
