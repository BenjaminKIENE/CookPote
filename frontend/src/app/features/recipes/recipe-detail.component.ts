import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ScaleQuantityPipe } from '../../shared/pipes/scale-quantity.pipe';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, UNIT_LABELS } from '../../core/models/recipe.model';
import type { Recipe } from '../../core/models/recipe.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ScaleQuantityPipe],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.scss',
})
export class RecipeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recipeService = inject(RecipeService);
  readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  recipe = signal<Recipe | null>(null);
  loading = signal(true);
  servingsFactor = signal(1);

  readonly categoryLabels = CATEGORY_LABELS;
  readonly difficultyLabels = DIFFICULTY_LABELS;
  readonly unitLabels = UNIT_LABELS;
  readonly uploadsBase = environment.apiUrl.replace('/api', '') + '/uploads/';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.recipeService.getById(id).subscribe({
      next: r => { this.recipe.set(r); this.loading.set(false); },
      error: () => { this.notifications.error('Recette introuvable.'); this.loading.set(false); },
    });
  }

  get isOwner(): boolean {
    return this.recipe()?.userId === this.authService.currentUser()?.id;
  }

  get scaledServings(): number {
    return Math.round((this.recipe()?.servings ?? 1) * this.servingsFactor());
  }

  changeServings(n: number): void {
    if (!this.recipe()) return;
    const base = this.recipe()!.servings;
    const next = Math.max(1, Math.round(base * this.servingsFactor()) + n);
    this.servingsFactor.set(next / base);
  }
}
