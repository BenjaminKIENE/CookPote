import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScanFridgeService } from '../../core/services/scan-fridge.service';
import { NotificationService } from '../../core/services/notification.service';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card.component';
import type { ScanResult, ScanQuota } from '../../core/services/scan-fridge.service';
import type { RecipeListItem } from '../../core/models/recipe.model';

@Component({
  selector: 'app-scan-fridge',
  standalone: true,
  imports: [CommonModule, RouterLink, RecipeCardComponent],
  templateUrl: './scan-fridge.component.html',
  styleUrl: './scan-fridge.component.scss',
})
export class ScanFridgeComponent implements OnInit {
  private readonly scanService = inject(ScanFridgeService);
  private readonly notifications = inject(NotificationService);

  quota = signal<ScanQuota | null>(null);
  scanning = signal(false);
  result = signal<ScanResult | null>(null);
  preview = signal<string | null>(null);

  ngOnInit(): void {
    this.scanService.getQuota().subscribe({
      next: q => this.quota.set(q),
      error: () => {},
    });
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => this.preview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.scanning.set(true);
    this.result.set(null);

    this.scanService.scan(file).subscribe({
      next: res => {
        this.result.set(res);
        this.quota.set(res.quota);
        this.scanning.set(false);
        if (res.recipes.length === 0) {
          this.notifications.info('Aucune recette correspondante trouvée.');
        }
      },
      error: err => {
        this.notifications.error(err.error?.message ?? 'Scan échoué.');
        this.scanning.set(false);
      },
    });
  }

  get recipes(): RecipeListItem[] {
    return (this.result()?.recipes ?? []) as unknown as RecipeListItem[];
  }
}
