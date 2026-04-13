import {
  Component, inject, Input, Output, EventEmitter,
  signal, ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IngredientService } from '../../../core/services/ingredient.service';
import type { IngredientSearchResult } from '../../../core/models/ingredient.model';

@Component({
  selector: 'app-ingredient-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ingredient-input.component.html',
  styleUrl: './ingredient-input.component.scss',
})
export class IngredientInputComponent {
  @Input() placeholder = 'Rechercher un ingrédient...';
  @Output() selected = new EventEmitter<IngredientSearchResult>();

  private readonly ingredientService = inject(IngredientService);
  private readonly el = inject(ElementRef);

  query = '';
  results = signal<IngredientSearchResult[]>([]);
  isOpen = signal(false);
  loading = signal(false);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 1) { this.results.set([]); return of([]); }
        this.loading.set(true);
        return this.ingredientService.search(q, 8);
      }),
      takeUntilDestroyed(),
    ).subscribe(results => {
      this.results.set(results);
      this.isOpen.set(results.length > 0);
      this.loading.set(false);
    });
  }

  onInput(): void {
    this.search$.next(this.query);
  }

  select(ingredient: IngredientSearchResult): void {
    this.selected.emit(ingredient);
    this.query = '';
    this.results.set([]);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
