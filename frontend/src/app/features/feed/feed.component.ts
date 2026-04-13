import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card.component';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import type { RecipeListItem, RecipeFilters, Category, Difficulty } from '../../core/models/recipe.model';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../core/models/recipe.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RecipeCardComponent, InfiniteScrollComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  private readonly recipeService = inject(RecipeService);

  recipes = signal<RecipeListItem[]>([]);
  loading = signal(false);
  error = signal('');
  nextCursor = signal<string | null>(null);

  // Filters
  q = '';
  category = '';
  difficulty = '';

  readonly categoryOptions = Object.entries(CATEGORY_LABELS) as [Category, string][];
  readonly difficultyOptions = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];

  ngOnInit(): void {
    this.load(true);
  }

  load(reset = false): void {
    if (this.loading()) return;
    if (!reset && !this.nextCursor()) return;

    this.loading.set(true);
    if (reset) { this.recipes.set([]); this.nextCursor.set(null); }

    const filters: RecipeFilters = {
      q: this.q || undefined,
      category: (this.category || undefined) as Category | undefined,
      difficulty: (this.difficulty || undefined) as Difficulty | undefined,
      cursor: reset ? undefined : (this.nextCursor() ?? undefined),
    };

    this.recipeService.getPublicFeed(filters).subscribe({
      next: res => {
        this.recipes.update(prev => [...prev, ...res.data]);
        this.nextCursor.set(res.nextCursor);
        this.loading.set(false);
        this.error.set('');
      },
      error: () => {
        this.error.set('Impossible de charger le feed.');
        this.loading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.load(true);
  }
}
