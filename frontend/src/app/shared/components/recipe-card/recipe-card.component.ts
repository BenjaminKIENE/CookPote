import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import type { RecipeListItem } from '../../../core/models/recipe.model';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../../core/models/recipe.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-card.component.html',
  styleUrl: './recipe-card.component.scss',
})
export class RecipeCardComponent {
  @Input({ required: true }) recipe!: RecipeListItem;

  readonly categoryLabels = CATEGORY_LABELS;
  readonly difficultyLabels = DIFFICULTY_LABELS;
  readonly apiUrl = environment.apiUrl.replace('/api', '');

  get photoUrl(): string | null {
    return this.recipe.photoPath ? `${this.apiUrl}/uploads/${this.recipe.photoPath}` : null;
  }

  get totalTime(): number | null {
    const prep = this.recipe.prepTimeMin ?? 0;
    const cook = this.recipe.cookTimeMin ?? 0;
    const total = prep + cook;
    return total > 0 ? total : null;
  }
}
