import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RecipeService } from '../../core/services/recipe.service';
import { NotificationService } from '../../core/services/notification.service';
import { IngredientInputComponent } from '../../shared/components/ingredient-input/ingredient-input.component';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, UNIT_LABELS } from '../../core/models/recipe.model';
import type { Unit, Category, Difficulty } from '../../core/models/recipe.model';
import type { IngredientSearchResult } from '../../core/models/ingredient.model';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IngredientInputComponent],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);
  private readonly notifications = inject(NotificationService);

  isEdit = false;
  recipeId = '';
  loading = signal(false);
  photoFile: File | null = null;
  photoPreview = signal<string | null>(null);

  readonly categoryOptions = Object.entries(CATEGORY_LABELS) as [Category, string][];
  readonly difficultyOptions = Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][];
  readonly unitOptions = Object.entries(UNIT_LABELS) as [Unit, string][];

  form = this.fb.group({
    title:       ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(2000)],
    prepTimeMin: [null as number | null],
    cookTimeMin: [null as number | null],
    servings:    [4, [Validators.required, Validators.min(1)]],
    difficulty:  ['facile' as Difficulty, Validators.required],
    category:    ['plat' as Category, Validators.required],
    visibility:  ['private', Validators.required],
    tags:        [''],
    steps:       this.fb.array([this.fb.control('', Validators.required)]),
    ingredients: this.fb.array([]),
  });

  get stepsArray(): FormArray { return this.form.get('steps') as FormArray; }
  get ingredientsArray(): FormArray { return this.form.get('ingredients') as FormArray; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.recipeId = id;
      this.loadRecipe(id);
    }
  }

  private loadRecipe(id: string): void {
    this.loading.set(true);
    this.recipeService.getById(id).subscribe({
      next: recipe => {
        this.form.patchValue({
          title: recipe.title,
          description: recipe.description ?? '',
          prepTimeMin: recipe.prepTimeMin,
          cookTimeMin: recipe.cookTimeMin,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          category: recipe.category,
          visibility: recipe.visibility,
          tags: recipe.tags.join(', '),
        });

        // Rebuild steps
        while (this.stepsArray.length) this.stepsArray.removeAt(0);
        for (const step of recipe.steps) {
          this.stepsArray.push(this.fb.control(step, Validators.required));
        }

        // Rebuild ingredients
        while (this.ingredientsArray.length) this.ingredientsArray.removeAt(0);
        for (const ing of recipe.ingredients) {
          this.ingredientsArray.push(this.fb.group({
            ingredientId:   [ing.ingredientId, Validators.required],
            ingredientName: [ing.ingredientName],
            quantity:       [ing.quantity],
            unit:           [ing.unit],
            note:           [ing.note ?? ''],
          }));
        }

        this.loading.set(false);
      },
      error: () => { this.notifications.error('Recette introuvable.'); this.router.navigate(['/app/recipes']); },
    });
  }

  addStep(): void {
    this.stepsArray.push(this.fb.control('', Validators.required));
  }

  removeStep(i: number): void {
    if (this.stepsArray.length > 1) this.stepsArray.removeAt(i);
  }

  addIngredient(ingredient: IngredientSearchResult): void {
    this.ingredientsArray.push(this.fb.group({
      ingredientId:   [ingredient.id, Validators.required],
      ingredientName: [ingredient.nomCanonique],
      quantity:       [null as number | null],
      unit:           [null as string | null],
      note:           [''],
    }));
  }

  removeIngredient(i: number): void {
    this.ingredientsArray.removeAt(i);
  }

  onPhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = e => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const v = this.form.value;
    const payload = {
      title:       v.title!,
      description: v.description ?? '',
      prepTimeMin: v.prepTimeMin ?? null,
      cookTimeMin: v.cookTimeMin ?? null,
      servings:    v.servings ?? 1,
      difficulty:  v.difficulty as Difficulty,
      category:    v.category as Category,
      visibility:  v.visibility as 'private' | 'friends' | 'public',
      tags:        v.tags ? v.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      steps:       (v.steps as string[]).filter(Boolean),
      ingredients: (this.ingredientsArray.value as any[]).map(ing => ({
        ingredientId: ing.ingredientId,
        quantity:     ing.quantity ?? null,
        unit:         ing.unit ?? null,
        note:         ing.note ?? '',
      })),
    };

    const request$ = this.isEdit
      ? this.recipeService.update(this.recipeId, payload)
      : this.recipeService.create(payload);

    request$.subscribe({
      next: recipe => {
        // Upload photo if provided
        if (this.photoFile) {
          this.recipeService.uploadPhoto(recipe.id, this.photoFile).subscribe({
            next: () => this.finish(recipe.id),
            error: () => { this.notifications.warning('Recette sauvegardée mais l\'upload de la photo a échoué.'); this.finish(recipe.id); },
          });
        } else {
          this.finish(recipe.id);
        }
      },
      error: err => {
        this.notifications.error(err.error?.message ?? 'Erreur lors de la sauvegarde.');
        this.loading.set(false);
      },
    });
  }

  private finish(id: string): void {
    this.loading.set(false);
    this.notifications.success(this.isEdit ? 'Recette mise à jour.' : 'Recette créée !');
    this.router.navigate(['/app/recipes', id]);
  }
}
