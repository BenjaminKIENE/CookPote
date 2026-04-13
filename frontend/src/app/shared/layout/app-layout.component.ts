import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastContainerComponent } from '../components/toast/toast-container.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  readonly notifications = inject(NotificationService);

  readonly mobileMenuOpen = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.notifications.success('Déconnexion réussie.'),
      error: () => this.authService.clearSession(),
    });
  }
}
